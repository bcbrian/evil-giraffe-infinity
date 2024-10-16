import { ActionFunction, json } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

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

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "User not authenticated" }, { status: 401 });
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
    const startDate = new Date(now.setDate(now.getDate() - 30))
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    const transactions = transactionsResponse.data.transactions;

    const { error: upsertError } = await supabase.from("transactions").upsert(
      transactions.map((transaction) => ({
        id: transaction.transaction_id,
        accountId,
        pending: transaction.pending,
        plaidTransactionId: transaction.transaction_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        category: transaction.personal_finance_category?.primary,
        owner: user?.user?.id ?? null,
      })),
      { onConflict: "id" }
    );

    if (upsertError) {
      throw new Error("Failed to upsert transactions");
    }

    return json({ success: true, message: "Transactions synced successfully" });
  } catch (error) {
    return json({ error: "Failed to sync transactions" }, { status: 500 });
  }
};
