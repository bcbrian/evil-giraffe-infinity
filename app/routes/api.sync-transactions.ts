import { ActionFunction, json } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export const action: ActionFunction = async ({ request }) => {
  console.log("Syncing transactions");
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;
  console.log("Account ID:", accountId);

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not authenticated");
    return json({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    console.log("Fetching account data");
    // Fetch the access token for the given account
    const { data: accountData, error: accountError } = await supabase
      .from("linkedAccounts")
      .select("accessToken")
      .eq("id", accountId)
      .single();

    if (accountError || !accountData) {
      console.error("Failed to fetch account data:", accountError);
      throw new Error("Failed to fetch account data");
    }

    const accessToken = accountData.accessToken;
    console.log("Access token obtained");

    // Fetch transactions for the last 30 days
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - 30))
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    console.log("Fetching transactions from", startDate, "to", endDate);
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    const transactions = transactionsResponse.data.transactions;
    console.log("Fetched", transactions.length, "transactions");

    console.log(
      "Sample transaction:",
      JSON.stringify(transactions[0], null, 2)
    );

    console.log("Upserting transactions to database");
    // Save transactions to your database
    const { error: upsertError } = await supabase.from("transactions").upsert(
      transactions.map((transaction) => ({
        id: transaction.transaction_id, // Use Plaid's transaction_id as the primary key
        accountId,
        pending: transaction.pending,
        plaidTransactionId: transaction.transaction_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        category: transaction.personal_finance_category?.primary,
        owner: user?.user?.id ?? null,
      })),
      { onConflict: "id" } // Specify the column to check for conflicts
    );

    if (upsertError) {
      console.error("Failed to upsert transactions:", upsertError);
      throw new Error("Failed to upsert transactions");
    }

    console.log("Transactions synced successfully");
    return json({ success: true, message: "Transactions synced successfully" });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return json({ error: "Failed to sync transactions" }, { status: 500 });
  }
};
