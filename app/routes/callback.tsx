import { data, redirect } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import type { Route } from "./+types/callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("Missing code", { code });
    return data({ error: "Missing code" });
  }

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Error handling auth callback:", error);
    return data({ error: error.message }, { status: 400 });
  }

  // Forward the Set-Cookie header to the client
  return redirect("/dashboard", {
    headers: headers,
  });
}

export default function Callback({ loaderData }: Route.ComponentProps) {
  const data = loaderData;

  if (data.error) {
    return <div>Error: {data.error}</div>;
  }

  return <div>Loading...</div>;
}
