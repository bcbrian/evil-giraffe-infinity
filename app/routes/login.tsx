import { useFetcher, redirect, data, Form } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Route, Info } from "./+types/login";

export async function loader({ request, context }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user, error } = await supabase.auth.getUser();

  if (error) {
    return data({ error: error.message }, { headers });
  }

  if (user) {
    // Redirect to the dashboard if the user is already logged in
    return redirect("/");
  }

  return {};
}

export async function action({ request }: Route.ActionArgs) {
  console.log("Starting login action");
  const formData = await request.formData();
  const email = formData.get("email") as string | null;

  console.log("Email from form:", email);

  if (email === null) {
    console.log("Email is null, returning error");
    return data({ error: "Email is required" }, { status: 400 });
  }

  // Get the allowed emails from the environment variable
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
  console.log("Allowed emails:", allowedEmails);

  // Check if the email is in the allowed list
  if (!allowedEmails.includes(email)) {
    console.log("Email not in allowed list, redirecting to signup");
    return redirect("/signup");
  }

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const SITE_URL = process.env.SITE_URL || "http://localhost:8888";
  console.log("Using SITE_URL:", SITE_URL);

  console.log("Attempting to sign in with OTP");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE_URL}/callback` },
  });

  let success = false;
  let message = "Magic link sent! Check your email.";
  if (error) {
    console.error("Supabase auth error:", error);
    message = error.message;
  }
  if (!error) {
    console.log("Successfully sent magic link");
    success = true;
  }

  // Return success message
  return data({ success, error: error?.message, message }, { headers });
}

export default function Login({ actionData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [renderedContent, setRenderedContent] =
    useState<React.ReactNode | null>(null);

  useEffect(() => {
    const isSubmitting = fetcher.state === "submitting";
    const isSuccess = fetcher.data?.success;

    console.log("fetcher", fetcher);

    setRenderedContent(
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <div className="w-96 bg-black bg-opacity-50 border-2 border-purple-500 shadow-lg shadow-purple-500/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-center text-purple-300 mb-2">
            Evil Giraffe
          </h1>
          <p className="text-center text-purple-200 mb-6">
            Enter the financial jungle
          </p>
          {!isSuccess ? (
            <fetcher.Form method="post" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-purple-300">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full bg-purple-950 border border-purple-500 text-purple-100 placeholder-purple-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="gamer@evilgiraffe.xyz"
                />
              </div>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Sending Magic Link...
                  </>
                ) : (
                  "Send Magic Link"
                )}
              </motion.button>
            </fetcher.Form>
          ) : (
            <div className="text-center">
              <p className="text-green-400 mb-4">{fetcher.data?.message}</p>
              <p className="text-purple-300">
                Check your email for the magic link to log in. If you don&#39;t
                see it, check your spam folder.
              </p>
            </div>
          )}
          {fetcher.data?.error && (
            <div className="mt-4 p-2 bg-red-900 bg-opacity-50 border border-red-500 rounded flex items-center space-x-2">
              <p className="text-red-300">{fetcher.data.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [fetcher.state, fetcher.data, fetcher.Form]);

  return renderedContent;
}
