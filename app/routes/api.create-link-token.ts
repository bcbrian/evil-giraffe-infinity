import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
  CountryCode,
  Products,
} from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox, // or 'development', 'production'
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

export const loader: LoaderFunction = async () => {
  console.log("Starting link token creation process");
  try {
    console.log("Attempting to create link token with Plaid API");
    const response = await client.linkTokenCreate({
      user: { client_user_id: "unique-user-id" },
      client_name: "Your App Name",
      language: "en",
      country_codes: [CountryCode.Us],
      products: [Products.Auth, Products.Transactions],
      // ... other required fields
    });

    console.log("Link token created successfully:", response.data.link_token);
    // Return the response as JSON
    return json({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Error creating link token:", error);
    // Handle error and return an appropriate response
    return json({ error: "Failed to create link token" }, { status: 500 });
  }
};
