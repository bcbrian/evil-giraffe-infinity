import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";

interface PlaidLinkButtonProps {
  token: string;
  onSuccess: PlaidLinkOnSuccess;
  className?: string;
  children?: React.ReactNode;
}

export default function PlaidLinkButton({
  token,
  onSuccess,
  className = "",
  children = "Connect Account",
}: PlaidLinkButtonProps) {
  const { open, ready, error } = usePlaidLink({
    token,
    onSuccess,
    onExit: (error, metadata) => {
      console.log("Exit: ", error, metadata);
    },
  });

  if (error) console.error("Plaid Link Error:", error);

  return (
    <button onClick={() => open()} disabled={!ready} className={className}>
      {children}
    </button>
  );
}
