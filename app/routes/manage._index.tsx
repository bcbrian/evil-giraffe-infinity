import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { UTCDate } from "@date-fns/utc";
import MonthSelector from "~/components/MonthSelector";

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

  // Add this part to get unassigned categories
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
      return 0; // Return 0 if no categories are assigned
    }
    return transactions
      .filter((t) => budget.categories!.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleMonthChange = (newMonth: string) => {
    setSearchParams({ month: newMonth });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Budgets</h1>
      <MonthSelector
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
      />
      <div className="space-y-4">
        {budgets.map((budget) => {
          const usage = calculateBudgetUsage(budget);
          const percentage = Math.min((usage / budget.amount) * 100, 100);
          return (
            <Link
              key={budget.id}
              to={`/manage/${budget.id}?month=${currentMonth}`}
              className="block border p-4 rounded hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{budget.name}</span>
                <span>${budget.amount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                ${usage.toFixed(2)} / ${budget.amount}
              </div>
              {(!budget.categories || budget.categories.length === 0) && (
                <div className="text-sm text-yellow-600 mt-1">
                  No categories assigned
                </div>
              )}
            </Link>
          );
        })}
      </div>
      <Link
        to="/budgets"
        className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded"
      >
        Manage Budgets
      </Link>

      {/* Add this section to display unassigned categories */}
      {unassignedCategories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Unassigned Categories</h2>
          <ul className="list-disc list-inside">
            {unassignedCategories.map((category) => (
              <li key={category} className="text-gray-700">
                {category}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
