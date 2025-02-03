import React from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunction } from "react-router";
import { getRecurringMonthlyTransactions } from "../utils/transactions-filter";
import type { Transaction } from "../utils/transactions-filter";

export const loader: LoaderFunction = async ({ request }) => {
  // Example data; in a real app, this would come from your API or database
  const transactions: Transaction[] = [
    {
      transactionId: "1",
      date: "2025-02-01",
      amount: 1.02,
      merchantName: "Services",
    },
    {
      transactionId: "2",
      date: "2025-02-01",
      amount: 1.02,
      merchantName: "Services",
    },
    {
      transactionId: "3",
      date: "2025-01-31",
      amount: 110.59,
      merchantName: "American Express",
    },
  ];

  // Check if the recurring filter is active using a query parameter
  const url = new URL(request.url);
  const filterParam = url.searchParams.get("filter");

  const filteredTransactions =
    filterParam === "recurring"
      ? getRecurringMonthlyTransactions(transactions)
      : transactions;

  return new Response(JSON.stringify({ transactions: filteredTransactions }), {
    headers: { "Content-Type": "application/json" },
  });
};

export default function Transactions() {
  const { transactions } = useLoaderData() as { transactions: Transaction[] };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Transactions</h1>
      <div className="mb-4">
        <a
          href="?filter=recurring"
          className="text-blue-600 hover:underline mr-4"
        >
          Show Recurring Transactions
        </a>
        <a href="." className="text-blue-600 hover:underline">
          Show All Transactions
        </a>
      </div>
      <ul className="list-disc">
        {transactions.map((tx) => (
          <li key={tx.transactionId}>
            {tx.merchantName} - ${tx.amount} on {tx.date}
          </li>
        ))}
      </ul>
    </div>
  );
}
