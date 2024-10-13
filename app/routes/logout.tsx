import { redirect } from "@netlify/remix-runtime";
import type { LoaderFunction } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";

export const loader: LoaderFunction = async ({ request }) => {
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
};

export default function Logout() {
  return null; // This component doesn't render anything
}
