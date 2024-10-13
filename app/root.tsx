import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { redirect, json } from "@netlify/remix-runtime";
import type {
  LoaderFunction,
  ActionFunction,
  LinksFunction,
  MetaFunction,
} from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "./supabase/client.server";

import styles from "./tailwind.css?url";

// Define a list of paths that don't require authentication
const publicPaths = ["/login", "/callback"];

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { title: "Evil Giraffe" },
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1,shrink-to-fit=no",
  },
];

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const path = url.pathname;

  // Check if the current path is in the list of public paths
  const isPublicPath = publicPaths.includes(path);

  if (!user && !isPublicPath) {
    return redirect("/login", { headers });
  }

  if (user && path === "/login") {
    return redirect("/dashboard", { headers });
  }

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
