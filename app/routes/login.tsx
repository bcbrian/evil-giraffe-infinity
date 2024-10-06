import { Form, json, useActionData, redirect } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";

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

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return json({ error: error.message }, { headers });
  }

  return json({ success: true }, { headers });
};

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h1>Login</h1>
      <Form method="post">
        <label>
          Email:
          <input type="email" name="email" required />
        </label>
        <button type="submit">Send Magic Link</button>
      </Form>
      {actionData?.error && <p>{actionData.error}</p>}
      {actionData?.success && <p>Check your email for the magic link!</p>}
    </div>
  );
}
