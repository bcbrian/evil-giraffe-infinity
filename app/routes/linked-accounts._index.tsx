import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import PlaidLinkButton from "~/components/PlaidLinkButton";
import {
  PlaidLinkOnSuccess,
  PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";

import { ActionFunction, json, redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";
import type { LoaderFunction } from "@remix-run/node";
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

interface LinkedAccount {
  id: string;
  metadata: PlaidLinkOnSuccessMetadata;
  publicToken: string;
  owner: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "User not authenticated" }, { status: 401, headers });
  }

  const { data: linkedAccounts, error } = await supabase
    .from("linkedAccounts")
    .select("*")
    .eq("owner", user.id);

  if (error) {
    console.error("Error fetching linked accounts:", error);
    return json({ error: error.message }, { headers });
  }

  // Parse the metadata string to PlaidLinkOnSuccessMetadata
  const parsedLinkedAccounts = linkedAccounts?.map((account) => ({
    ...account,
    metadata: JSON.parse(account.metadata) as PlaidLinkOnSuccessMetadata,
  }));

  return json({ linkedAccounts: parsedLinkedAccounts }, { headers });
};

export const action: ActionFunction = async ({ request }) => {
  console.log("Starting action function");
  const formData = await request.formData();
  const publicToken = formData.get("public_token") as string;
  const metadata = formData.get("metadata") as string;
  console.log("Received public token and metadata");

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  console.log("Created Supabase client");

  // Get the current user's ID
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("Fetched user data:", user);

  if (!user) {
    console.log("User not authenticated");
    return json({ error: "User not authenticated" }, { status: 401, headers });
  }

  // Exchange public token for access token
  try {
    console.log("Attempting to exchange public token");
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log("Public token exchanged successfully");

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    console.log("Received access token and item ID");

    // Insert the linked account with the access token
    console.log("Inserting linked account into database");
    const { data, error } = await supabase.from("linkedAccounts").insert([
      {
        accessToken,
        itemId,
        metadata,
        owner: user.id,
      },
    ]);

    console.log("Insertion result:", data);

    if (error) {
      console.error("Error saving linked account:", error);
      return json({ error: error.message }, { headers });
    }

    console.log("Account linked successfully, redirecting");
    return redirect("/linked-accounts");
  } catch (error) {
    console.error("Error exchanging public token:", error);
    return json({ error: "Failed to link account" }, { status: 500, headers });
  }
};
export default function LinkedAccounts() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const fetcher = useFetcher();
  const { linkedAccounts } = useLoaderData<typeof loader>();

  useEffect(() => {
    async function fetchLinkToken() {
      const response = await fetch("/api/create-link-token");
      const data = await response.json();
      setLinkToken(data.linkToken);
    }
    fetchLinkToken();
  }, []);

  const handlePlaidSuccess: PlaidLinkOnSuccess = (public_token, metadata) => {
    fetcher.submit(
      { public_token, metadata: JSON.stringify(metadata) },
      { method: "post", action: "/linked-accounts" }
    );
  };

  const handleSync = (accountId: string) => {
    fetcher.submit(
      { accountId },
      { method: "post", action: "/api/sync-transactions" }
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Linked Accounts</h1>
        {linkToken && (
          <PlaidLinkButton
            token={linkToken}
            onSuccess={handlePlaidSuccess}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            +
          </PlaidLinkButton>
        )}
      </div>
      {linkedAccounts && linkedAccounts.length > 0 ? (
        <ul className="space-y-4">
          {linkedAccounts.map((account: LinkedAccount) => (
            <li key={account.id} className="border-b pb-2">
              <div className="flex justify-between items-center font-semibold">
                <span>
                  {account.metadata.institution
                    ? account.metadata.institution.name
                    : "Unknown Institution"}
                </span>
                <button
                  onClick={() => handleSync(account.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  Sync
                </button>
              </div>
              {account.metadata.accounts &&
              account.metadata.accounts.length > 0 ? (
                <ul className="pl-4 mt-2 space-y-1">
                  {account.metadata.accounts.map((acc) => (
                    <li key={acc.id} className="text-sm">
                      {acc.name} - {acc.mask}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No accounts found</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            You don&rsquo;t have any linked accounts yet
          </p>
          {linkToken && (
            <PlaidLinkButton
              token={linkToken}
              onSuccess={handlePlaidSuccess}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              Connect Account
            </PlaidLinkButton>
          )}
        </div>
      )}
    </div>
  );
}
