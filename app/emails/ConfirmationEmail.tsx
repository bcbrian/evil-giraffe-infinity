// app/emails/ConfirmationEmail.tsx
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";

export function ConfirmationEmail({
  confirmationUrl,
}: {
  confirmationUrl: string;
}) {
  return (
    <Html>
      <Text>Thanks for signing up for the Evil Giraffe Beta!</Text>
      <Text>Please confirm your email to complete the signup process:</Text>
      <Button href={confirmationUrl}>Confirm Email</Button>
    </Html>
  );
}
