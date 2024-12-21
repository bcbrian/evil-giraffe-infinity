import { createSupabaseServerClient } from "~/supabase/client.server";
import { redirect, data } from "react-router";
import type { Route } from "./+types/protected";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return data({ user }, { headers });
}

export default function Protected({ loaderData }: Route.ComponentProps) {
  return <div>Welcome, {loaderData.user.email}!</div>;
}
