import { redirect } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import type { Route } from "./+types/_index";
export const meta: Route.MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
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
}

export default function Index() {
  return <div>these are not the droids you are looking for</div>;
}
