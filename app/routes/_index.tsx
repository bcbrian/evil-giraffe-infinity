import type { MetaFunction } from "@netlify/remix-runtime";
import { LoaderFunction, redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error);
    return new Response("Error fetching user", { status: 500 });
  }

  if (user) {
    // Redirect to the protected route if authenticated
    return redirect("/dashboard");
  } else {
    // Redirect to the login page if not authenticated
    return redirect("/login");
  }
};

export default function Index() {
  return <div>these are not the droids you are looking for</div>;
}
