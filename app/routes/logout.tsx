import { redirect } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import type { Route } from "./+types/logout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error during sign out:", error);
    // Even if there's an error, we'll redirect to the login page
  }

  // Redirect to the login page after logout
  return redirect("/login", {
    headers: headers,
  });
}

export default function Logout() {
  return null; // This component doesn't render anything
}
