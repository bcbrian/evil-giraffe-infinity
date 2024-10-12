import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { useState } from "react";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("search") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";
  const sortBy = url.searchParams.get("sortBy") || "date";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("owner", user.id)
    .ilike("name", `%${searchTerm}%`);

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { data: transactions, error } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ transactions });
};

export default function Transactions() {
  const { transactions } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchParams((prev) => {
      prev.set("search", search);
      return prev;
    });
  };

  const handleSort = (field: string) => {
    setSearchParams((prev) => {
      const currentSortBy = prev.get("sortBy");
      const currentSortOrder = prev.get("sortOrder");

      if (currentSortBy === field) {
        prev.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
      } else {
        prev.set("sortBy", field);
        prev.set("sortOrder", "asc");
      }

      return prev;
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>

      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="ml-2 bg-blue-500 text-white p-2 rounded"
        >
          Search
        </button>
      </form>

      <div className="mb-4">
        <input
          type="date"
          onChange={(e) =>
            setSearchParams((prev) => {
              prev.set("startDate", e.target.value);
              return prev;
            })
          }
          className="border p-2 rounded mr-2"
        />
        <input
          type="date"
          onChange={(e) =>
            setSearchParams((prev) => {
              prev.set("endDate", e.target.value);
              return prev;
            })
          }
          className="border p-2 rounded"
        />
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th onClick={() => handleSort("name")} className="cursor-pointer">
              Name{" "}
              {searchParams.get("sortBy") === "name" &&
                (searchParams.get("sortOrder") === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("amount")} className="cursor-pointer">
              Amount{" "}
              {searchParams.get("sortBy") === "amount" &&
                (searchParams.get("sortOrder") === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("date")} className="cursor-pointer">
              Date{" "}
              {searchParams.get("sortBy") === "date" &&
                (searchParams.get("sortOrder") === "asc" ? "▲" : "▼")}
            </th>
            <th
              onClick={() => handleSort("category")}
              className="cursor-pointer"
            >
              Category{" "}
              {searchParams.get("sortBy") === "category" &&
                (searchParams.get("sortOrder") === "asc" ? "▲" : "▼")}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction: Transaction) => (
            <tr key={transaction.id}>
              <td>{transaction.name}</td>
              <td>${transaction.amount.toFixed(2)}</td>
              <td>{new Date(transaction.date).toLocaleDateString()}</td>
              <td>{transaction.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
