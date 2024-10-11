import { usePlaidLink } from "react-plaid-link";

interface PlaidLinkButtonProps {
  token: string;
}

export default function PlaidLinkButton({ token }: PlaidLinkButtonProps) {
  const { open, ready, error } = usePlaidLink({
    token,
    onSuccess: (public_token, metadata) => {
      console.log("Public Token: ", public_token);
      console.log("Metadata: ", metadata);
      // Send the public_token to your server to exchange for an access_token
    },
    onExit: (error, metadata) => {
      console.log("Exit: ", error, metadata);
    },
  });
  console.log("error", error);

  return (
    <button onClick={() => open()} disabled={!ready}>
      Connect Account
    </button>
  );
}
