import { useLoaderData, redirect, json } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return json({ user }, { headers });
};

export default function Protected() {
  const { user } = useLoaderData<typeof loader>();

  return <div>Welcome, {user.email}!</div>;
}
