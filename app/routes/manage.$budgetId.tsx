import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  useSearchParams,
} from "@remix-run/react";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { format, startOfMonth } from "date-fns";
import { UTCDate } from "@date-fns/utc";

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{budget.name}</h1>
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => handleMonthChange("prev")}
          className="bg-gray-200 p-2 rounded"
        >
          Previous Month
        </button>
        <span className="font-semibold">{formatMonthYear(currentMonth)}</span>
        <button
          onClick={() => handleMonthChange("next")}
          className="bg-gray-200 p-2 rounded"
        >
          Next Month
        </button>
      </div>
      <div className="mb-4">
        <div className="text-lg">Budget: ${budget.amount}</div>
        <div className="text-lg">Spent: ${currentSpent}</div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${Math.min((currentSpent / budget.amount) * 100, 100)}%`,
            }}
          ></div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Categories</h2>
      <div className="space-y-2">
        {categories.map((category: Category) => (
          <div
            key={category.name}
            className="flex items-center justify-between"
          >
            <button
              onClick={() =>
                handleCategoryClick(category.name, category.assigned)
              }
              className={`flex-grow text-left p-2 rounded ${
                category.assignedTo.some((b) => b.id === budget.id)
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {category.name}
            </button>
            {category.assignedTo.length > 0 && (
              <div className="ml-2 text-sm text-gray-500">
                Assigned to: {category.assignedTo.map((b) => b.name).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
      {actionData?.error && (
        <div className="text-red-500 mt-4">{actionData.error}</div>
      )}
    </div>
  );
}
