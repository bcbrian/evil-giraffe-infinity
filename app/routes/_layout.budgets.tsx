import { data } from "react-router";
import { Link, useSearchParams } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { UTCDate } from "@date-fns/utc";
import MonthSelector from "~/components/MonthSelector";
import { motion } from "framer-motion";
import {
  DollarSign,
  AlertTriangle,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import {
  buildCategoryHierarchy,
  calculateBudgetSpent,
} from "~/utils/categoryUtils";
import type { Transaction } from "~/types";
import type { Route } from "./+types/budgets";

interface Budget {
  id: string;
  name: string;
  amount: number;
  categories: string[] | null;
}

interface LoaderData {
  budgets: Budget[];
  transactions: Transaction[];
  currentMonth: string;
  unassignedCategories: {
    id: string;
    name: string;
    mainCategory: string;
    subCategory: string;
  }[];
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
    return data({ error: "Failed to fetch data" }, { status: 500 });
  }

  const categoriesWithAssignment = buildCategoryHierarchy(
    transactions,
    budgets,
    undefined // Pass undefined since we're not looking at a specific budget
  );

  const unassignedCategories = categoriesWithAssignment.flatMap(
    (mainCategory) =>
      mainCategory.subCategories.flatMap((subCategory) =>
        subCategory.merchantNames
          .filter((merchant) => merchant.assignedBudgets.length === 0)
          .map((merchant) => ({
            id: merchant.id,
            name: merchant.displayName,
            mainCategory: mainCategory.displayName,
            subCategory: subCategory.displayName,
          }))
      )
  );

  return data({
    budgets,
    transactions,
    currentMonth: currentDate.toISOString(),
    unassignedCategories,
  });
}

export default function Budgets({ loaderData }: Route.ComponentProps) {
  const { budgets, transactions, currentMonth, unassignedCategories } =
    loaderData;
  const [, setSearchParams] = useSearchParams();

  if (!budgets || budgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-purple-100"
      >
        <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Manage Budgets
        </h1>
        <p className="text-purple-300 mb-6">
          You don&apos;t have any budgets yet
        </p>
        <Link to="/budgets/new">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-purple-600 text-purple-100 px-6 py-3 rounded-full font-semibold shadow-lg shadow-purple-500/50 flex items-center"
          >
            <PlusCircle className="mr-2" size={20} />
            Create Budget
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  const calculateBudgetUsage = (budget: Budget) => {
    return calculateBudgetSpent(budget, transactions);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Manage Budgets
        </h1>
        <Link to="/budgets/new">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-purple-600 p-3 rounded-full shadow-lg shadow-purple-500/50"
          >
            <PlusCircle size={24} />
          </motion.button>
        </Link>
      </div>
      <MonthSelector
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
      />
      <div className="space-y-4 mt-6">
        {budgets.map((budget) => {
          const usage = calculateBudgetUsage(budget);
          const percentSpent = (usage / budget.amount) * 100;
          const isOverBudget = percentSpent > 100;
          const linePosition = isOverBudget
            ? (budget.amount / usage) * 100
            : 100;

          return (
            <motion.div
              key={budget.id}
              whileHover={{ scale: 1.02 }}
              className="block bg-black bg-opacity-50 p-4 rounded-lg shadow-lg hover:shadow-purple-500/20 transition duration-300 ease-in-out"
            >
              <Link
                to={`/budgets/${budget.id}?month=${currentMonth}`}
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
                <div className="w-full bg-purple-900 rounded-full h-2.5 mb-2 relative overflow-hidden">
                  <motion.div
                    className="h-2.5 rounded-full"
                    style={{
                      background: isOverBudget
                        ? `linear-gradient(to right, 
                            #4ade80 0%, 
                            #3b82f6 ${linePosition / 2}%, 
                            #ef4444 ${linePosition}%, 
                            #ef4444 100%)`
                        : `linear-gradient(to right, 
                            #4ade80 0%, 
                            #3b82f6 100%)`,
                      width: `${Math.min(percentSpent, 100)}%`,
                      transition: "width 1s ease-out, background 1s ease-out",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentSpent, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  {isOverBudget && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white"
                      style={{
                        left: `${linePosition}%`,
                        transition: "left 1s ease-out",
                      }}
                    />
                  )}
                </div>
                <div className="text-sm text-purple-300 flex justify-between items-center">
                  <span>
                    ${usage.toFixed(2)} / ${budget.amount}
                    {isOverBudget ? (
                      <span className="text-red-400 ml-2">
                        (Over by: ${(usage - budget.amount).toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-purple-300 ml-2">
                        (Remaining: ${(budget.amount - usage).toFixed(2)})
                      </span>
                    )}
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassignedCategories.map((category) => (
              <li
                key={category.id}
                className="text-purple-200 bg-purple-800 bg-opacity-50 p-3 rounded-md flex flex-col"
              >
                <div className="flex items-center mb-1">
                  <AlertTriangle size={16} className="mr-2 text-yellow-400" />
                  <span className="font-semibold">{category.name}</span>
                </div>
                <div className="text-sm text-purple-300 ml-6">
                  {category.mainCategory} → {category.subCategory}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}{" "}
    </motion.div>
  );
}
