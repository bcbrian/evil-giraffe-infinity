import { Form, useActionData, useSearchParams } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { redirect, json } from "@netlify/remix-runtime";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";
import { ConfirmationEmail } from "~/emails/ConfirmationEmail";
import { useState } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: user, error } = await supabase.auth.getUser();

  if (error) {
    return json({ error: error.message }, { headers });
  }

  if (user) {
    return redirect("/");
  }

  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string | null;

  if (email === null) {
    return json({ error: "Email is required" }, { status: 400 });
  }

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  const { data: existingSignup, error: existingSignupError } = await supabase
    .from("beta_signups")
    .select("confirmed")
    .eq("email", email)
    .single();

  if (existingSignupError && existingSignupError.code !== "PGRST116") {
    return json(
      { error: "An error occurred. Please try again later." },
      { status: 500, headers }
    );
  }

  if (existingSignup) {
    if (existingSignup.confirmed) {
      return json(
        { error: "This email has already been confirmed for the beta." },
        { status: 400, headers }
      );
    } else {
      return json(
        {
          error:
            "You've already signed up. Please check your email for the confirmation link.",
        },
        { status: 400, headers }
      );
    }
  }

  const confirmationToken = uuidv4();

  const { error } = await supabase.from("beta_signups").insert({
    email,
    confirmation_token: confirmationToken,
    confirmed: false,
  });

  if (error) {
    return json({ error: error.message }, { status: 500, headers });
  }

  try {
    await resend.emails.send({
      from: "Evil Giraffe <noreply@evilgiraffe.xyz>",
      to: email,
      subject: "Confirm your Evil Giraffe Beta Signup",
      react: ConfirmationEmail({
        confirmationUrl: `${process.env.SITE_URL}/confirm-signup/${confirmationToken}`,
      }),
    });

    return json(
      {
        success: true,
        message:
          "Please check your email to complete the registration process.",
      },
      { headers }
    );
  } catch (error) {
    return json(
      { error: "Failed to send confirmation email" },
      { status: 500, headers }
    );
  }
};

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [receiveUpdates, setReceiveUpdates] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
      <div className="w-96 bg-black bg-opacity-50 border-2 border-purple-500 shadow-lg shadow-purple-500/50 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-purple-300 mb-2">
          Evil Giraffe Beta
        </h1>
        <p className="text-center text-purple-200 mb-6">
          Sign up for our beta program
        </p>
        {!actionData?.success && !success && (
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
                placeholder="gamer@evilgiraffe.xyz"
              />
            </div>
            <div className="flex items-center">
              <input
                id="receiveUpdates"
                name="receiveUpdates"
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-purple-300 rounded"
                onChange={(e) => setReceiveUpdates(e.target.checked)}
              />
              <label
                htmlFor="receiveUpdates"
                className="ml-2 block text-sm text-purple-300"
              >
                I want to receive updates about Evil Giraffe
              </label>
            </div>
            <p className="text-xs text-purple-400 mt-2">
              We&apos;ll only use your email to send you updates about Evil
              Giraffe&apos;s development, launch, and community events. We
              won&apos;t sell your data or send you messages about anything
              else.
            </p>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!receiveUpdates}
            >
              Sign Up for Beta
            </button>
          </Form>
        )}
        {actionData?.error && (
          <div className="mt-4 p-2 bg-red-900 bg-opacity-50 border border-red-500 rounded flex items-center space-x-2">
            <p className="text-red-300">{actionData.error}</p>
          </div>
        )}
        {actionData?.success && (
          <div className="mt-4 p-2 bg-green-900 bg-opacity-50 border border-green-500 rounded flex items-center space-x-2">
            <p className="text-green-300">
              {actionData.message ||
                "Thanks for signing up! Please check your email to confirm your registration."}
            </p>
          </div>
        )}
        {error === "invalid_token" && (
          <div className="mt-4 p-2 bg-red-900 bg-opacity-50 border border-red-500 rounded flex items-center space-x-2">
            <p className="text-red-300">
              Invalid or expired confirmation link. Please try signing up again.
            </p>
          </div>
        )}
        {error === "already_confirmed" && (
          <div className="mt-4 p-2 bg-yellow-900 bg-opacity-50 border border-yellow-500 rounded flex items-center space-x-2">
            <p className="text-yellow-300">
              Your email has already been confirmed. You&apos;re all set!
            </p>
          </div>
        )}
        {error === "confirmation_failed" && (
          <div className="mt-4 p-2 bg-red-900 bg-opacity-50 border border-red-500 rounded flex items-center space-x-2">
            <p className="text-red-300">
              Failed to confirm your email. Please try again later or contact
              support.
            </p>
          </div>
        )}
        {success === "confirmed" && (
          <div className="mt-4 p-2 bg-green-900 bg-opacity-50 border border-green-500 rounded flex items-center space-x-2">
            <p className="text-green-300">
              Your email has been confirmed! Welcome to the Evil Giraffe Beta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
