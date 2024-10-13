import { json, LoaderFunction } from "@netlify/remix-runtime";
import { useLoaderData } from "@remix-run/react";
import { BudgetCircle } from "~/components/BudgetCircle";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { motion } from "framer-motion";

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({
      budgetPercentage: null,
      remainingAmount: null,
      daysLeft: null,
      error: "Unauthorized",
    });
  }

  const currentDate = new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Fetch transactions for the current month
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("owner", user.id)
    .gte("date", firstDayOfMonth.toISOString())
    .lte("date", lastDayOfMonth.toISOString());

  if (transactionsError) {
    return json({
      budgetPercentage: null,
      remainingAmount: null,
      daysLeft: null,
      error: "Failed to fetch transactions",
    });
  }

  // Fetch all budgets
  const { data: budgets, error: budgetsError } = await supabase
    .from("budgets")
    .select("amount")
    .eq("owner", user.id);

  if (budgetsError) {
    return json({
      budgetPercentage: null,
      remainingAmount: null,
      daysLeft: null,
      error: "Failed to fetch budgets",
    });
  }

  const totalTransactions = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);

  const remainingAmount = Math.max(totalBudget - totalTransactions, 0);
  const budgetPercentage = Math.min(
    Math.round((totalTransactions / totalBudget) * 100),
    100
  );

  const daysLeft = lastDayOfMonth.getDate() - currentDate.getDate() + 1;

  return json({
    budgetPercentage,
    remainingAmount,
    daysLeft,
    error: undefined,
  });
};

export default function Dashboard() {
  const { budgetPercentage, remainingAmount, daysLeft, error } =
    useLoaderData<typeof loader>();

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center text-red-400 bg-red-900 bg-opacity-50 p-4 rounded-lg shadow-lg"
      >
        {error}
      </motion.div>
    );
  }

  if (
    budgetPercentage === null ||
    remainingAmount === null ||
    daysLeft === null
  ) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center text-purple-300"
      >
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        <span className="ml-2">Loading...</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full p-4"
    >
      <BudgetCircle
        percentage={budgetPercentage}
        amount={remainingAmount}
        daysLeft={daysLeft}
        backgroundColor="rgba(76, 29, 149, 0.5)"
        startColor="#22c55e"
        endColor="#ef4444"
        textColor="text-purple-100"
        strokeColor="text-purple-400"
      />
    </motion.div>
  );
}
