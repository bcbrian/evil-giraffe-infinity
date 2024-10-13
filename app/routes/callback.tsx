import { json, LoaderFunction, redirect } from "@netlify/remix-runtime";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";

interface LoaderData {
  error?: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("Missing code", { code });
    return json<LoaderData>({ error: "Missing code" });
  }

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Error handling auth callback:", error);
    return json<LoaderData>({ error: error.message }, { headers });
  }

  // Forward the Set-Cookie header to the client
  return redirect("/dashboard", {
    headers: headers,
  });
};

export default function Callback() {
  const data = useLoaderData<LoaderData>();

  if (data.error) {
    return <div>Error: {data.error}</div>;
  }

  return <div>Loading...</div>;
}
