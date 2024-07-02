"use server";

import { CountryCode } from "plaid";
import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";
import { getBank, getBanks } from "./user.actions";
import { getTransactionsByBankId } from "./transaction.actions";

export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    const banks = await getBanks({ userId });
    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });
        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          sharaebleId: bank.shareableId,
        };

        return account;
      })
    );
    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((acc, val) => {
      return acc + val.currentBalance;
    }, 0);
    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error(error);
  }
};

export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    const bank = await getBank({ documentId: appwriteItemId });
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    // TODO:
    const accountData = accountsResponse.data.accounts[0];
    // const transferTransactionsData = await getTransactionsByBankId({
    //   bankId: bank.$id,
    // });
    // const transferTransactions = transferTransactionsData.documents.map(
    //   (transferData: Transaction) => ({
    //     id: transferData.$id,
    //     name: transferData.name!,
    //     amount: transferData.amount!,
    //     date: transferData.$createdAt,
    //     paymentChannel: transferData.channel,
    //     category: transferData.category,
    //     type: transferData.senderBankId === bank.$id ? "debit" : "credit",
    //   })
    // );
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank?.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    const allTransactions = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error(error);
  }
};

export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    /* https://plaid.com/docs/api/institutions/#institutionsget*/
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });
    const institution = institutionResponse.data.institution;
    return parseStringify(institution);
  } catch (error) {
    console.error(error);
  }
};

export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  /* https://plaid.com/docs/api/products/transactions/#transactionssync */
  let hasMore = true;
  let transactions: any = [];
  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });
      const data = response.data;
      transactions = response.data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      }));
      hasMore = data.has_more;
    }
    return parseStringify(transactions);
  } catch (error) {
    console.error(error);
  }
};
