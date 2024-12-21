import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { createSupabaseServerClient } from "./supabase/client.server";

import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";

// Define paths that don't require authentication
const publicPaths = ["/login", "/callback", "/signup", "/confirm-signup"];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export const meta: Route.MetaFunction = () => [
  { charset: "utf-8" },
  { title: "Evil Giraffe" },
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1,shrink-to-fit=no",
  },
];

export const loader: Route.LoaderFunction = async ({
  request,
}: {
  request: Request;
}) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const path = url.pathname;

  // Check if the current path starts with any of the public paths
  const isPublicPath = publicPaths.some((publicPath) =>
    path.startsWith(publicPath)
  );
  if (!user && !isPublicPath) {
    throw redirect("/login", { headers });
  }

  if (user && path === "/login") {
    throw redirect("/dashboard", { headers });
  }

  return data({ user }, { headers });
};

export const action: Route.ActionFunction = async ({
  request,
}: {
  request: Request;
}) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() as string | null;
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.signInWithOtp({ email: email ?? "" });

  if (error) {
    return { error: error.message };
  }

  return data({ success: true }, { headers });
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
