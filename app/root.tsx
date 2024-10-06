import {
  json,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type {
  LoaderFunction,
  ActionFunction,
  LinksFunction,
} from "@remix-run/node";
import { createSupabaseServerClient } from "./supabase/client.server";

import styles from "./tailwind.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return json({ user }, { headers });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() as string | null;
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.signInWithOtp({ email: email ?? "" });

  if (error) {
    return { error: error.message };
  }

  return json({ success: true }, { headers });
};

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  console.log(user);

  // useEffect(() => {
  //   const { data: authListener } = supabase.auth.onAuthStateChange(
  //     (event, session) => {
  //       if (event === "SIGNED_IN") {
  //         document.cookie = `sb:token=${session?.access_token}; path=/`;
  //       }
  //     }
  //   );

  //   return () => {
  //     authListener?.subscription.unsubscribe();
  //   };
  // }, []);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
