import { useEffect, useState } from "react";
import PlaidLinkButton from "~/components/PlaidLinkButton";

export default function LinkedAccounts() {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinkToken() {
      const response = await fetch("/api/create-link-token");
      const data = await response.json();
      console.log("data", data);
      setLinkToken(data.linkToken);
    }
    fetchLinkToken();
  }, []);

  console.log("linkToken", linkToken);
  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Linked Accounts</h1>
        {linkToken && <PlaidLinkButton token={linkToken} />}
      </div>
      {/* Render account list or empty state here */}
    </div>
  );
}
