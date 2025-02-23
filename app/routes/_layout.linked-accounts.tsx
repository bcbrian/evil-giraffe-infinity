import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import PlaidLinkButton from "~/components/PlaidLinkButton";
import type {
  PlaidLinkOnSuccess,
  PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";
import { data, redirect } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import type { Route } from "./+types/linked-accounts";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  RefreshCw as Refresh,
  Building as Bank,
  CreditCard,
} from "lucide-react";

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

interface LinkedAccount {
  id: string;
  metadata: PlaidLinkOnSuccessMetadata;
  publicToken: string;
  owner: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "User not authenticated" }, { status: 401, headers });
  }

  const { data: linkedAccounts, error } = await supabase
    .from("linkedAccounts")
    .select("*")
    .eq("owner", user.id);

  if (error) {
    console.error("Error fetching linked accounts:", error);
    return data({ error: error.message }, { headers });
  }

  // Parse the metadata string to PlaidLinkOnSuccessMetadata
  const parsedLinkedAccounts = linkedAccounts?.map((account) => ({
    ...account,
    metadata: JSON.parse(account.metadata) as PlaidLinkOnSuccessMetadata,
  }));

  return data({ linkedAccounts: parsedLinkedAccounts }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const publicToken = formData.get("public_token") as string;
  const metadata = formData.get("metadata") as string;

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  // Get the current user's ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "User not authenticated" }, { status: 401, headers });
  }

  // Exchange public token for access token
  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Insert the linked account with the access token
    const { error } = await supabase.from("linkedAccounts").insert([
      {
        accessToken,
        itemId,
        metadata,
        owner: user.id,
      },
    ]);

    if (error) {
      console.error("Error saving linked account:", error);
      return data({ error: error.message }, { headers });
    }

    return redirect("/linked-accounts");
  } catch (error) {
    console.error("Error exchanging public token:", error);
    return data({ error: "Failed to link account" }, { status: 500, headers });
  }
}

export default function LinkedAccounts({ loaderData }: Route.ComponentProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const fetcher = useFetcher();
  const { linkedAccounts } = loaderData;

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

  const isSyncing = fetcher.state === "submitting";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 max-w-3xl mx-auto bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl shadow-lg space-y-6 text-purple-100"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Linked Accounts
        </h1>
        {linkedAccounts && linkedAccounts.length > 0 && linkToken && (
          <PlaidLinkButton
            token={linkToken}
            onSuccess={handlePlaidSuccess}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            <Plus size={24} />
          </PlaidLinkButton>
        )}
      </div>
      <AnimatePresence>
        {linkedAccounts && linkedAccounts.length > 0 ? (
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {linkedAccounts.map((account: LinkedAccount) => (
              <motion.li
                key={account.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="border border-purple-700 rounded-lg p-4 bg-black bg-opacity-30 hover:bg-opacity-40 transition duration-300 ease-in-out"
              >
                <div className="flex justify-between items-center font-semibold mb-2">
                  <span className="flex items-center">
                    <Bank className="mr-2 text-purple-400" size={20} />
                    {account.metadata.institution
                      ? account.metadata.institution.name
                      : "Unknown Institution"}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSync(account.id)}
                    disabled={isSyncing}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out flex items-center ${
                      isSyncing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="mr-2"
                        >
                          <Refresh size={16} />
                        </motion.div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Refresh size={16} className="mr-2" />
                        Sync
                      </>
                    )}
                  </motion.button>
                </div>
                {account.metadata.accounts &&
                account.metadata.accounts.length > 0 ? (
                  <ul className="pl-4 mt-2 space-y-2">
                    {account.metadata.accounts.map((acc) => (
                      <li key={acc.id} className="flex items-center text-sm">
                        <CreditCard
                          className="mr-2 text-purple-400"
                          size={16}
                        />
                        {acc.name} - {acc.mask}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-purple-400">No accounts found</p>
                )}
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 bg-black bg-opacity-30 p-6 rounded-lg"
          >
            <p className="text-purple-300">
              You don&rsquo;t have any linked accounts yet
            </p>
            {linkToken && (
              <PlaidLinkButton
                token={linkToken}
                onSuccess={handlePlaidSuccess}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
              >
                <Bank className="mr-2" size={20} />
                Connect Account
              </PlaidLinkButton>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
