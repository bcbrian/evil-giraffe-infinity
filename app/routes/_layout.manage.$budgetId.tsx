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
  AlertTriangle,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  buildCategoriesWithAssignment,
  calculateBudgetSpent,
} from "~/utils/categoryUtils";
import { Category, MerchantName, SubCategory } from "~/types";

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

  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", budgetId)
    .single();

  if (budgetError) {
    return json({ error: "Failed to fetch budget" }, { status: 500 });
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

  const { data: allBudgets, error: allBudgetsError } = await supabase
    .from("budgets")
    .select("id, name, categories")
    .eq("owner", user.id);

  if (allBudgetsError) {
    return json({ error: "Failed to fetch budgets" }, { status: 500 });
  }

  const categoriesWithAssignment = buildCategoriesWithAssignment(
    transactions,
    allBudgets,
    budgetId
  );

  const currentSpent = calculateBudgetSpent(budget, transactions);

  return json({
    budget,
    categories: categoriesWithAssignment,
    currentSpent,
    currentMonth: currentDate.toISOString(),
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const budgetId = Number(params.budgetId);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Fetch all transactions and budgets for the user
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner", user.id);

  if (transactionsError) {
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }

  switch (intent) {
    case "updateBudgetAmount": {
      const budgetAmount = parseFloat(formData.get("budgetAmount") as string);
      if (isNaN(budgetAmount)) {
        return json({ error: "Invalid budget amount" }, { status: 400 });
      }
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ amount: budgetAmount })
        .eq("id", budgetId);

      if (updateError) {
        return json(
          { error: "Failed to update budget amount" },
          { status: 500 }
        );
      }
      return json({ success: true });
    }
    case "updateCategory": {
      const budgetId = Number(formData.get("budget") as string);
      const additions = JSON.parse(
        formData.get("additions") as string
      ) as string[];
      const removals = JSON.parse(
        formData.get("removals") as string
      ) as string[];

      // Fetch the current budget
      const { data: currentBudget, error: currentBudgetError } = await supabase
        .from("budgets")
        .select("categories")
        .eq("id", budgetId)
        .single();

      if (currentBudgetError) {
        return json(
          { error: "Failed to fetch current budget" },
          { status: 500 }
        );
      }

      let categories = currentBudget.categories || [];

      // Remove categories
      categories = categories.filter((c: string) => !removals.includes(c));

      // Add new categories
      categories = [...new Set([...categories, ...additions])];

      // Update the budget with new categories
      const { error: updateCategoryError } = await supabase
        .from("budgets")
        .update({ categories })
        .eq("id", budgetId);

      if (updateCategoryError) {
        return json(
          { error: "Failed to update budget categories" },
          { status: 500 }
        );
      }

      // Fetch all budgets again to get the updated data
      const { data: updatedAllBudgets, error: updatedAllBudgetsError } =
        await supabase.from("budgets").select("*").eq("owner", user.id);

      if (updatedAllBudgetsError) {
        return json(
          { error: "Failed to fetch updated budgets" },
          { status: 500 }
        );
      }

      // Recalculate currentSpent after updating categories
      const updatedCurrentSpent = calculateBudgetSpent(
        { categories },
        transactions
      );

      // Rebuild categoriesWithAssignment with updated data
      const updatedCategoriesWithAssignment = buildCategoriesWithAssignment(
        transactions,
        updatedAllBudgets,
        budgetId
      );

      return json({
        success: true,
        categories: updatedCategoriesWithAssignment,
        currentSpent: updatedCurrentSpent,
      });
    }
    default:
      return json({ error: "Invalid intent" }, { status: 400 });
  }
};

export default function ManageBudget() {
  const {
    budget,
    categories: initialCategories,
    currentSpent,
    currentMonth,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<typeof action>();
  const [, setSearchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editedAmount, setEditedAmount] = useState(budget.amount.toString());
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedSubCategories, setExpandedSubCategories] = useState<
    Record<string, boolean>
  >({});
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    if (actionData?.categories) {
      setCategories(actionData.categories);
    }
  }, [actionData]);

  useEffect(() => {
    if (fetcher.data?.categories) {
      setCategories(fetcher.data.categories);
    }
  }, [fetcher.data]);

  const handleCategoryClick = (
    categoryId: string,
    currentlyAssigned: boolean
  ) => {
    const [main, sub, merchant] = categoryId.split(":");
    const newAssignmentState = !currentlyAssigned;

    const changes = {
      budget: budget.id,
      additions: [] as string[],
      removals: [] as string[],
    };

    if (!sub) {
      // Main category
      const mainCategory = categories.find(
        (c: Category) => c.id === categoryId
      );
      if (mainCategory) {
        const allMerchantIds = mainCategory.subCategories.flatMap(
          (sub: SubCategory) => sub.merchantNames.map((m: MerchantName) => m.id)
        );

        if (newAssignmentState) {
          changes.additions = allMerchantIds.filter((id: string) => {
            return !categories.some((c: Category) =>
              c.subCategories.some((s: SubCategory) =>
                s.merchantNames.some(
                  (m: MerchantName) => m.id === id && m.assigned
                )
              )
            );
          });
        } else {
          changes.removals = allMerchantIds;
        }
      }
    } else if (!merchant) {
      // Sub-category
      const mainCategory = categories.find((c: Category) => c.id === main);
      const subCategory = mainCategory?.subCategories.find(
        (s: SubCategory) => s.id === categoryId
      );
      if (subCategory) {
        const merchantIds = subCategory.merchantNames
          .filter((m: MerchantName) => {
            const result =
              (!m.assignedOtherBudget && !m.assigned) ||
              m.assignedBudgets.some((b: { id: number; name: string }) => {
                return b.id === budget.id;
              });
            return result;
          })
          .map((m: MerchantName) => m.id);

        if (newAssignmentState) {
          changes.additions = merchantIds.filter(
            (id: string) =>
              !subCategory.merchantNames.find((m: MerchantName) => m.id === id)
                ?.assigned
          );
        } else {
          changes.removals = merchantIds;
        }
      }
    } else {
      // Merchant category
      if (newAssignmentState) {
        changes.additions = [categoryId];
      } else {
        changes.removals = [categoryId];
      }
    }

    fetcher.submit(
      {
        intent: "updateCategory",
        budget: changes.budget,
        additions: JSON.stringify(changes.additions),
        removals: JSON.stringify(changes.removals),
      },
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

  const spentPercentage = (currentSpent / budget.amount) * 100;
  const isOverBudget = spentPercentage > 100;
  const linePosition = isOverBudget
    ? (budget.amount / currentSpent) * 100
    : 100;

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedAmount(budget.amount.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedAmount(e.target.value);
  };

  const toggleMainCategory = (mainCategory: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [mainCategory]: !prev[mainCategory],
    }));
  };

  const toggleSubCategory = (mainCategory: string, subCategory: string) => {
    setExpandedSubCategories((prev) => ({
      ...prev,
      [`${mainCategory}-${subCategory}`]:
        !prev[`${mainCategory}-${subCategory}`],
    }));
  };

  const renderCheckbox = (
    assigned: boolean,
    partiallyAssigned: boolean = false,
    disabled: boolean = false
  ) => {
    if (partiallyAssigned) {
      return (
        <div
          className={`w-6 h-6 mr-3 rounded-full border-2 border-blue-500 flex items-center justify-center ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        </div>
      );
    }
    return (
      <div
        className={`w-6 h-6 mr-3 rounded-full border-2 ${
          assigned ? "bg-green-500 border-green-500" : "border-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {assigned && (
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  };

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

      {/* Month selector */}
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
          className="bg-purple-600 text-purple-100 p-2 rounded-full shadow-md  hover:bg-purple-700 transition duration-300 ease-in-out"
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>

      {/* Budget information */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-black bg-opacity-50 p-6 rounded-lg shadow-lg"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg flex items-center">
            <DollarSign className="mr-2 text-green-400" />
            {isEditing ? (
              <fetcher.Form method="post" className="flex items-center">
                <input type="hidden" name="intent" value="updateBudgetAmount" />
                <input
                  type="number"
                  name="budgetAmount"
                  value={editedAmount}
                  onChange={handleAmountChange}
                  className="bg-purple-800 text-green-400 px-2 py-1 rounded w-24 mr-2"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="bg-green-500 text-white p-2 rounded-full shadow-md hover:bg-green-600 transition duration-300 ease-in-out mr-2"
                >
                  <Check size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition duration-300 ease-in-out"
                >
                  <X size={16} />
                </motion.button>
              </fetcher.Form>
            ) : (
              <span className="flex items-center text-green-400">
                Budget: $
                {fetcher.state !== "idle" ? (
                  <>
                    {editedAmount}
                    <Loader2 size={16} className="ml-2 animate-spin" />
                  </>
                ) : (
                  budget.amount
                )}
                {fetcher.state === "idle" && (
                  <button
                    onClick={handleEditClick}
                    className="ml-2 text-purple-300 hover:text-purple-100 transition-colors duration-200"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </span>
            )}
          </div>
          <div className="text-lg flex items-center">
            <DollarSign className="mr-2 text-pink-400" />
            <span className="text-pink-400">
              Spent: ${currentSpent.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-full bg-purple-900 rounded-full h-4 mb-4 relative overflow-hidden">
          <motion.div
            className="h-4 rounded-full"
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
              width: `${Math.min(spentPercentage, 100)}%`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(spentPercentage, 100)}%` }}
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
        <div className="flex justify-between text-sm text-purple-300">
          <span>{spentPercentage.toFixed(1)}% used</span>
          {isOverBudget && (
            <span className="text-red-400 flex items-center">
              <AlertTriangle size={16} className="mr-1" />
              Over budget by ${(currentSpent - budget.amount).toFixed(2)}
            </span>
          )}
        </div>
      </motion.div>

      {/* Categories */}
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
          {categories.map((mainCategory: Category) => (
            <motion.div
              key={mainCategory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-purple-900 bg-opacity-50 rounded-lg overflow-hidden mb-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleMainCategory(mainCategory.name)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(
                        mainCategory.id,
                        mainCategory.assigned
                      );
                    }}
                  >
                    {renderCheckbox(
                      mainCategory.assigned,
                      mainCategory.partiallyAssigned
                    )}
                  </button>
                  <span>
                    {mainCategory.displayName}{" "}
                    <span className="text-sm text-gray-400">
                      (
                      {
                        mainCategory.subCategories.flatMap((sub) =>
                          sub.merchantNames.filter(
                            (merchant) =>
                              merchant.assigned && !merchant.assignedOtherBudget
                          )
                        ).length
                      }
                      /
                      {
                        mainCategory.subCategories.flatMap((sub) =>
                          sub.merchantNames.filter(
                            (merchant) => !merchant.assignedOtherBudget
                          )
                        ).length
                      }
                      )
                    </span>
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className={`transform transition-transform duration-200 ${
                    expandedCategories[mainCategory.name] ? "rotate-180" : ""
                  }`}
                />
              </motion.button>
              <AnimatePresence>
                {expandedCategories[mainCategory.name] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pl-8 pr-4 pb-4"
                  >
                    {mainCategory.subCategories.map((subCategory) => (
                      <div key={subCategory.id} className="mb-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            toggleSubCategory(
                              mainCategory.name,
                              subCategory.name
                            )
                          }
                          className="w-full flex items-center justify-between py-2 text-left"
                        >
                          <div className="flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategoryClick(
                                  subCategory.id,
                                  subCategory.assigned
                                );
                              }}
                            >
                              {renderCheckbox(
                                subCategory.assigned,
                                subCategory.partiallyAssigned
                              )}
                            </button>
                            <span>
                              {subCategory.displayName}{" "}
                              <span className="text-sm text-gray-400">
                                (
                                {
                                  subCategory.merchantNames.filter(
                                    (merchant) =>
                                      merchant.assigned &&
                                      !merchant.assignedOtherBudget
                                  ).length
                                }
                                /
                                {
                                  subCategory.merchantNames.filter(
                                    (merchant) => !merchant.assignedOtherBudget
                                  ).length
                                }
                                )
                              </span>
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`transform transition-transform duration-200 ${
                              expandedSubCategories[
                                `${mainCategory.name}-${subCategory.name}`
                              ]
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </motion.button>
                        <AnimatePresence>
                          {expandedSubCategories[
                            `${mainCategory.name}-${subCategory.name}`
                          ] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pl-6 mt-2"
                            >
                              {subCategory.merchantNames.map((merchant) => (
                                <div
                                  key={merchant.id}
                                  className="flex items-center py-1"
                                >
                                  <button
                                    onClick={() => {
                                      handleCategoryClick(
                                        merchant.id,
                                        merchant.assigned
                                      );
                                    }}
                                    disabled={
                                      merchant.assignedBudgets.length > 0 &&
                                      merchant.assignedBudgets[0].id !==
                                        budget.id
                                    }
                                    className="flex items-center"
                                  >
                                    {renderCheckbox(
                                      merchant.assigned,
                                      false,
                                      merchant.assignedBudgets.length > 0 &&
                                        merchant.assignedBudgets[0].id !==
                                          budget.id
                                    )}
                                    <span>
                                      {merchant.displayName}{" "}
                                      {merchant.assignedBudgets.length > 0 &&
                                        merchant.assignedBudgets[0].id !==
                                          budget.id && (
                                          <span className="text-sm text-gray-400">
                                            (Assigned to{" "}
                                            {merchant.assignedBudgets[0].name})
                                          </span>
                                        )}
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
