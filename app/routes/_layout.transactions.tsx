import { data } from "react-router";
import { useSearchParams } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, ChevronUp, ChevronDown, Tag } from "lucide-react";
import type { Route } from "./+types/transactions";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "Unauthorized" }, { status: 401 });
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
    return data({ error: error.message }, { status: 500 });
  }

  return data({ transactions });
}

export default function Transactions({ loaderData }: Route.ComponentProps) {
  const { transactions } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const SortIcon = ({ field }: { field: string }) => {
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp size={16} />
    ) : (
      <ChevronDown size={16} />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 bg-gradient-to-br from-purple-900 to-indigo-900 min-h-screen text-purple-100"
    >
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Transactions
      </h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex items-center bg-black bg-opacity-50 rounded-lg overflow-hidden">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="flex-grow p-3 bg-transparent text-purple-100 placeholder-purple-300 focus:outline-none"
          />
          <button
            type="submit"
            className="p-3 bg-purple-600 text-white hover:bg-purple-700 transition duration-300"
          >
            <Search size={20} />
          </button>
        </div>
      </form>

      <div className="mb-6 flex space-x-4">
        <div className="flex-1 bg-black bg-opacity-50 rounded-lg overflow-hidden">
          <input
            type="date"
            onChange={(e) =>
              setSearchParams((prev) => {
                prev.set("startDate", e.target.value);
                return prev;
              })
            }
            className="w-full p-3 bg-transparent text-purple-100 focus:outline-none"
          />
        </div>
        <div className="flex-1 bg-black bg-opacity-50 rounded-lg overflow-hidden">
          <input
            type="date"
            onChange={(e) =>
              setSearchParams((prev) => {
                prev.set("endDate", e.target.value);
                return prev;
              })
            }
            className="w-full p-3 bg-transparent text-purple-100 focus:outline-none"
          />
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {transactions.map((transaction: Transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-black bg-opacity-50 p-4 rounded-lg shadow-lg"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-purple-300">
                  {transaction.name}
                </h3>
                <span className="text-green-400 font-bold">
                  ${transaction.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-purple-400">
                <span className="flex items-center">
                  <Calendar size={16} className="mr-1" />
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Tag size={16} className="mr-1" />
                  {transaction.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-black bg-opacity-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-700">
                <th
                  onClick={() => handleSort("name")}
                  className="p-3 text-left cursor-pointer hover:bg-purple-800"
                >
                  <div className="flex items-center">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="p-3 text-left cursor-pointer hover:bg-purple-800"
                >
                  <div className="flex items-center">
                    Amount <SortIcon field="amount" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("date")}
                  className="p-3 text-left cursor-pointer hover:bg-purple-800"
                >
                  <div className="flex items-center">
                    Date <SortIcon field="date" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="p-3 text-left cursor-pointer hover:bg-purple-800"
                >
                  <div className="flex items-center">
                    Category <SortIcon field="category" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {transactions.map((transaction: Transaction) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-purple-700 hover:bg-purple-800"
                  >
                    <td className="p-3">{transaction.name}</td>
                    <td className="p-3 text-green-400">
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">{transaction.category}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
