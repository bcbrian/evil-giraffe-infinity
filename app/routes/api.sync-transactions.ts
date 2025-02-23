import { data } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  type Transaction,
} from "plaid";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import type { Route } from "./+types/api.sync-transactions";
const configuration = new Configuration({
  basePath: PlaidEnvironments.production,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    const { data: accountData, error: accountError } = await supabase
      .from("linkedAccounts")
      .select("accessToken")
      .eq("id", accountId)
      .single();

    if (accountError || !accountData) {
      throw new Error("Failed to fetch account data");
    }

    const accessToken = accountData.accessToken;

    const now = new Date();
    const startDate = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd");

    let allTransactions: Transaction[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: 100,
          offset: offset,
        },
      });

      const { data } = transactionsResponse;
      const { transactions, total_transactions } = data;

      allTransactions = [...allTransactions, ...transactions];
      offset += transactions.length;
      hasMore = offset < total_transactions;
    }

    console.log(JSON.stringify(allTransactions[0], null, 2));
    const { error: upsertError } = await supabase.from("transactions").upsert(
      allTransactions.map((transaction) => {
        const mainCategory =
          transaction.personal_finance_category?.primary ?? null;
        const subCategory =
          transaction.personal_finance_category?.detailed ?? null;
        return {
          id: transaction.transaction_id,
          accountId,
          pending: transaction.pending,
          plaidTransactionId: transaction.transaction_id,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          mainCategory,
          subCategory,
          merchantName: transaction.merchant_name ?? transaction.name,
          owner: user?.user?.id ?? null,
        };
      }),
      { onConflict: "id" }
    );

    if (upsertError) {
      throw new Error("Failed to upsert transactions");
    }

    return data({ success: true, message: "Transactions synced successfully" });
  } catch (error) {
    return data({ error: "Failed to sync transactions" }, { status: 500 });
  }
}
