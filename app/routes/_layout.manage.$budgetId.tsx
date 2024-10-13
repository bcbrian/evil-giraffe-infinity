import { json, LoaderFunction, ActionFunction } from "@netlify/remix-runtime";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  useSearchParams,
  Link,
} from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { format, startOfMonth } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Plus,
  Minus,
} from "lucide-react";

interface Category {
  name: string;
  assigned: boolean;
  assignedTo: { id: string; name: string }[];
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgetId = Number(params.budgetId);
  if (isNaN(budgetId)) {
    return json({ error: "Invalid budget ID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");

  const currentDate = monthParam
    ? new UTCDate(monthParam)
    : startOfMonth(new UTCDate());

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

  const { data: allBudgets, error: budgetsError } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner", user.id);

  if (budgetsError) {
    return json({ error: "Failed to fetch budgets" }, { status: 500 });
  }

  const budget = allBudgets.find((b) => b.id === budgetId);

  if (!budget) {
    return json({ error: "Budget not found" }, { status: 404 });
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", firstDayOfMonth.toISOString())
    .lte("date", lastDayOfMonth.toISOString())
    .eq("owner", user.id);

  if (transactionsError) {
    return json({ error: "Failed to fetch transactions" }, { status: 500 });
  }

  const categoriesSet = new Set(
    transactions.map((transaction: Transaction) => transaction.category)
  );
  const categories = Array.from(categoriesSet).map((categoryName) => ({
    name: categoryName,
    assigned: allBudgets.some((b) => b.categories?.includes(categoryName)),
    assignedTo: allBudgets
      .filter((b) => b.categories?.includes(categoryName))
      .map((b) => ({ id: b.id, name: b.name })),
  }));

  const currentSpent = transactions.reduce(
    (sum: number, transaction: Transaction) => {
      if (budget.categories?.includes(transaction.category)) {
        return sum + transaction.amount;
      }
      return sum;
    },
    0
  );

  return json({
    budget,
    categories,
    currentSpent,
    allBudgets,
    currentMonth: currentDate.toISOString(),
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  console.log("Action function started");

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("User data:", JSON.stringify(user));

  if (!user) {
    console.log("Unauthorized: No user found");
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { budgetId } = params;
  const formData = await request.formData();
  const categoryName = formData.get("categoryName") as string;
  const assigned = formData.get("assigned") === "true";

  console.log(
    "Action parameters:",
    JSON.stringify({ budgetId, categoryName, assigned })
  );

  // Fetch the current budget
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select("categories")
    .eq("id", budgetId)
    .single();

  console.log("Fetched budget:", JSON.stringify(budget));
  console.log("Budget fetch error:", JSON.stringify(budgetError));

  if (budgetError) {
    console.log("Failed to fetch budget");
    return json({ error: "Failed to fetch budget" }, { status: 500 });
  }

  let updatedCategories: string[] = Array.isArray(budget.categories)
    ? budget.categories
    : [];

  console.log("Initial categories:", JSON.stringify(updatedCategories));

  if (assigned) {
    // Add the category if it's not already in the array
    if (!updatedCategories.includes(categoryName)) {
      updatedCategories.push(categoryName);
      console.log("Category added:", categoryName);
    } else {
      console.log("Category already exists:", categoryName);
    }
  } else {
    // Remove the category if it's in the array
    updatedCategories = updatedCategories.filter((cat) => cat !== categoryName);
    console.log("Category removed:", categoryName);
  }

  console.log("Updated categories:", JSON.stringify(updatedCategories));

  // Update the budget with the new categories
  const { data: updatedBudget, error: updateError } = await supabase
    .from("budgets")
    .update({ categories: updatedCategories })
    .eq("id", budgetId);

  console.log("Updated budget:", JSON.stringify(updatedBudget));
  console.log("Update error:", JSON.stringify(updateError));

  if (updateError) {
    console.log("Failed to update budget");
    return json({ error: "Failed to update budget" }, { status: 500 });
  }

  const { data: actualBudget } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", budgetId)
    .single();

  console.log("Actual budget:", JSON.stringify(actualBudget));

  console.log("Budget updated successfully");
  return json({ success: true, categories: updatedCategories });
};

export default function ManageBudget() {
  const { budget, categories, currentSpent, currentMonth } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const [, setSearchParams] = useSearchParams();

  const handleCategoryClick = (categoryName: string, assigned: boolean) => {
    fetcher.submit(
      { categoryName, assigned: (!assigned).toString() },
      { method: "post" }
    );
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const currentDate = new UTCDate(currentMonth);
    let newDate;

    if (direction === "prev") {
      newDate = new UTCDate(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - 1,
        1
      );
    } else {
      newDate = new UTCDate(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() + 1,
        1
      );
    }

    setSearchParams({ month: newDate.toISOString() });
  };

  const formatMonthYear = (dateString: string) => {
    const date = new UTCDate(dateString);
    return format(date, "MMMM yyyy");
  };

  const spentPercentage = Math.min((currentSpent / budget.amount) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gradient-to-br from-purple-900 to-indigo-900 min-h-screen text-purple-100"
    >
      <Link
        to="/manage"
        className="inline-block mb-6 text-purple-300 hover:text-purple-100 transition-colors duration-200"
      >
        ← Back to Budgets
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        {budget.name}
      </h1>
      <div className="mb-6 flex justify-between items-center bg-black bg-opacity-50 p-4 rounded-lg shadow-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleMonthChange("prev")}
          className="bg-purple-600 text-purple-100 p-2 rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out"
        >
          <ChevronLeft size={24} />
        </motion.button>
        <span className="font-semibold text-xl text-purple-300">
          {formatMonthYear(currentMonth)}
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleMonthChange("next")}
          className="bg-purple-600 text-purple-100 p-2 rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out"
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-black bg-opacity-50 p-6 rounded-lg shadow-lg"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg flex items-center">
            <DollarSign className="mr-2 text-green-400" />
            <span className="text-green-400">Budget: ${budget.amount}</span>
          </div>
          <div className="text-lg flex items-center">
            <DollarSign className="mr-2 text-pink-400" />
            <span className="text-pink-400">Spent: ${currentSpent}</span>
          </div>
        </div>
        <div className="w-full bg-purple-900 rounded-full h-4 mb-4">
          <motion.div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full"
            style={{ width: `${spentPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${spentPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="text-right text-sm text-purple-300">
          {spentPercentage.toFixed(1)}% used
        </div>
      </motion.div>
      <h2 className="text-2xl font-semibold mb-4 text-purple-300">
        Categories
      </h2>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <AnimatePresence>
          {categories.map((category: Category) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  handleCategoryClick(category.name, category.assigned)
                }
                className={`flex-grow text-left p-3 rounded-lg shadow-md transition-colors duration-200 ${
                  category.assignedTo.some((b) => b.id === budget.id)
                    ? "bg-purple-700 text-purple-100"
                    : "bg-purple-900 text-purple-300"
                }`}
              >
                <div className="flex items-center">
                  {category.assignedTo.some((b) => b.id === budget.id) ? (
                    <Minus className="mr-2" size={18} />
                  ) : (
                    <Plus className="mr-2" size={18} />
                  )}
                  {category.name}
                </div>
              </motion.button>
              {category.assignedTo.length > 0 && (
                <div className="ml-3 text-sm text-purple-400">
                  Assigned to:{" "}
                  {category.assignedTo.map((b) => b.name).join(", ")}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {actionData?.error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 mt-6 p-4 bg-red-900 bg-opacity-50 rounded-lg"
        >
          {actionData.error}
        </motion.div>
      )}
    </motion.div>
  );
}
