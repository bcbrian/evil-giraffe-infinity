import { Form, useActionData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { redirect, json } from "@netlify/remix-runtime";

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user, error } = await supabase.auth.getUser();

  if (error) {
    return json({ error: error.message }, { headers });
  }

  if (user) {
    // Redirect to the dashboard if the user is already logged in
    return redirect("/");
  }

  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string | null;

  if (email === null) {
    throw new Error("Email is required");
  }
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const SITE_URL = process.env.SITE_URL || "http://localhost:8888";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE_URL}/callback` },
  });

  if (error) {
    return json({ error: error.message }, { headers });
  }

  // Redirect to the dashboard after successful login
  return redirect("/dashboard", { headers });
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const isSubmitting = false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
      <div className="w-96 bg-black bg-opacity-50 border-2 border-purple-500 shadow-lg shadow-purple-500/50 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-purple-300 mb-2">
          Evil Giraffe
        </h1>
        <p className="text-center text-purple-200 mb-6">
          Enter the financial jungle
        </p>
        <Form method="post" className="space-y-4">
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
              placeholder="gamer@evilgiraffe.com"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 ease-in-out transform hover:scale-105 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Sending..." : "Send Magic Link"}
          </button>
        </Form>
        {actionData?.error && (
          <div className="mt-4 p-2 bg-red-900 bg-opacity-50 border border-red-500 rounded flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-300">{actionData.error}</p>
          </div>
        )}
        {actionData?.success && (
          <div className="mt-4 p-2 bg-green-900 bg-opacity-50 border border-green-500 rounded flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-300">
              Check your email for the magic link!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
