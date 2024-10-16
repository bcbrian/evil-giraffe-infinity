// app/routes/confirm-signup.$token.tsx
import { LoaderFunction, redirect } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const loader: LoaderFunction = async ({ params, request }) => {
  const { token } = params;
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);

  // Find the signup record with the given token
  const { data, error } = await supabase
    .from("beta_signups")
    .select()
    .eq("confirmation_token", token)
    .single();

  if (error || !data) {
    // Token not found or other error
    return redirect("/signup?error=invalid_token");
  }

  if (data.confirmed) {
    // Already confirmed
    return redirect("/signup?error=already_confirmed");
  }

  // Update the record to mark it as confirmed
  const { error: updateError } = await supabase
    .from("beta_signups")
    .update({ confirmed: true })
    .eq("id", data.id);

  if (updateError) {
    return redirect("/signup?error=confirmation_failed");
  }

  // Add user to Resend campaign audience
  try {
    await resend.contacts.create({
      email: data.email,
      audienceId: "8e3b17e5-6c4e-4f2d-8972-f8f0f2a7ceeb",
    });
  } catch (resendError) {
    console.error("Error adding user to Resend audience:", resendError);
    // Note: We're not redirecting on this error to ensure the user's signup is still confirmed
  }

  // Redirect to a success page
  return redirect("/signup?success=confirmed");
};

export default function ConfirmSignup() {
  return null; // This route doesn't render anything, it just handles the confirmation
}
