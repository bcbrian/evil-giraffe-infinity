import { json, LoaderFunction } from "@netlify/remix-runtime";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { UTCDate } from "@date-fns/utc";
import MonthSelector from "~/components/MonthSelector";
import { motion } from "framer-motion";
import { DollarSign, AlertTriangle, ChevronRight } from "lucide-react";

interface Budget {
  id: string;
  name: string;
  amount: number;
  categories: string[] | null;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
}

interface LoaderData {
  budgets: Budget[];
  transactions: Transaction[];
  currentMonth: string;
  unassignedCategories: string[];
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
  const monthParam = url.searchParams.get("month");

  const currentDate = monthParam
    ? new UTCDate(monthParam)
    : new UTCDate(new UTCDate().setUTCDate(1));

  const firstDayOfMonth = new UTCDate(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    1
  );
  const lastDayOfMonth = new UTCDate(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + 1,
    0
  );

  const { data: budgets, error: budgetsError } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner", user.id);

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner", user.id)
    .gte("date", firstDayOfMonth.toISOString())
    .lte("date", lastDayOfMonth.toISOString());

  if (budgetsError || transactionsError) {
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const allCategories = Array.from(
    new Set(transactions.map((t) => t.category))
  );
  const assignedCategories = budgets.flatMap((b) => b.categories || []);
  const unassignedCategories = allCategories.filter(
    (c) => !assignedCategories.includes(c)
  );

  return json({
    budgets,
    transactions,
    currentMonth: currentDate.toISOString(),
    unassignedCategories,
  });
};

export default function Manage() {
  const { budgets, transactions, currentMonth, unassignedCategories } =
    useLoaderData<LoaderData>();
  const [, setSearchParams] = useSearchParams();

  const calculateBudgetUsage = (budget: Budget) => {
    if (!budget.categories || budget.categories.length === 0) {
      return 0;
    }
    return transactions
      .filter((t) => budget.categories!.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleMonthChange = (newMonth: string) => {
    setSearchParams({ month: newMonth });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gradient-to-br from-purple-900 to-indigo-900 min-h-screen text-purple-100"
    >
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Manage Budgets
      </h1>
      <MonthSelector
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
      />
      <div className="space-y-4 mt-6">
        {budgets.map((budget) => {
          const usage = calculateBudgetUsage(budget);
          const percentage = Math.min((usage / budget.amount) * 100, 100);
          return (
            <motion.div
              key={budget.id}
              whileHover={{ scale: 1.02 }}
              className="block bg-black bg-opacity-50 p-4 rounded-lg shadow-lg hover:shadow-purple-500/20 transition duration-300 ease-in-out"
            >
              <Link
                to={`/manage/${budget.id}?month=${currentMonth}`}
                className="flex flex-col"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-purple-300">
                    {budget.name}
                  </span>
                  <span className="text-purple-200 flex items-center">
                    <DollarSign size={16} className="mr-1" />
                    {budget.amount}
                  </span>
                </div>
                <div className="w-full bg-purple-900 rounded-full h-2.5 mb-2">
                  <motion.div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <div className="text-sm text-purple-300 flex justify-between items-center">
                  <span>
                    ${usage.toFixed(2)} / ${budget.amount}
                  </span>
                  <ChevronRight size={16} />
                </div>
                {(!budget.categories || budget.categories.length === 0) && (
                  <div className="text-sm text-yellow-400 mt-1 flex items-center">
                    <AlertTriangle size={16} className="mr-1" />
                    No categories assigned
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
      <Link
        to="/budgets"
        className="mt-6 inline-block px-6 py-3 bg-purple-600 text-purple-100 rounded-full font-semibold shadow-lg shadow-purple-500/50 hover:bg-purple-700 transition duration-300 ease-in-out"
      >
        Manage Budgets
      </Link>

      {unassignedCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 bg-black bg-opacity-50 p-6 rounded-lg shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-4 text-purple-300">
            Unassigned Categories
          </h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {unassignedCategories.map((category) => (
              <li
                key={category}
                className="text-purple-200 bg-purple-800 bg-opacity-50 px-3 py-2 rounded-md flex items-center"
              >
                <AlertTriangle size={16} className="mr-2 text-yellow-400" />
                {category}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
