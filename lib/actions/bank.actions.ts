"use server";

import { CountryCode } from "plaid";
import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";
import { getBanks } from "./user.actions";

export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    const banks = await getBanks({ userId });
    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];
        const institution = await getInstituion({
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

export const getInstituion = async ({ institutionId }: getInstitutionProps) => {
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
