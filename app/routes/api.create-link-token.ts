import { json } from "@netlify/remix-runtime";
import type { LoaderFunction } from "@netlify/remix-runtime";
import {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
  CountryCode,
  Products,
} from "plaid";
import { createSupabaseServerClient } from "~/supabase/client.server";

const configuration = new Configuration({
  basePath: PlaidEnvironments.production, // or 'development', 'production'
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Evil Giraffe",
      language: "en",
      country_codes: [CountryCode.Us],
      products: [Products.Transactions],
    });

    return json({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Error creating link token:", error);
    return json({ error: "Failed to create link token" }, { status: 500 });
  }
};
