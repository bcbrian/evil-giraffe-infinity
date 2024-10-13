import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunction } from "@netlify/remix-runtime";
import { redirect, json } from "@netlify/remix-runtime";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { motion } from "framer-motion";
import { PlusCircle, DollarSign } from "lucide-react";

interface Budget {
  id: string;
  name: string;
  amount: number;
  owner: string;
  categories: string[] | null;
  spent: number;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
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
    return json({ error: "Failed to fetch data" }, { status: 500, headers });
  }

  const budgetsWithSpent = budgets.map((budget: Budget) => {
    const spent = transactions
      .filter((t: Transaction) => budget.categories?.includes(t.category))
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    return { ...budget, spent };
  });

  return json({ budgets: budgetsWithSpent }, { headers });
};

export default function Budgets() {
  const { budgets } = useLoaderData<typeof loader>();

  if (!budgets || budgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-purple-100"
      >
        <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Budgets
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gradient-to-br from-purple-900 to-indigo-900 min-h-screen text-purple-100"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Budgets
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget: Budget) => (
          <motion.div
            key={budget.id}
            whileHover={{ scale: 1.03 }}
            className="bg-black bg-opacity-50 p-6 rounded-lg shadow-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-purple-300">
                {budget.name}
              </h2>
              <div className="flex items-center text-lg font-semibold text-purple-200">
                <DollarSign size={20} className="mr-1" />
                {budget.amount.toFixed(2)}
              </div>
            </div>
            <div className="w-full bg-purple-900 rounded-full h-4 mb-2">
              <motion.div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full"
                style={{ width: `${(budget.spent / budget.amount) * 100}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${(budget.spent / budget.amount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-sm text-purple-300">
              <span>Spent: ${budget.spent.toFixed(2)}</span>
              <span>
                Remaining: ${(budget.amount - budget.spent).toFixed(2)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
