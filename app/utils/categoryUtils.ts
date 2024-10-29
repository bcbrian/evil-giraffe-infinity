import { Category, MerchantName, MerchantNameAlt, Transaction } from "~/types";

export const createCategoryId = (
  main: string,
  sub?: string,
  merchant?: string
) => {
  return [main, sub, merchant].filter(Boolean).join(":");
};

export const buildCategoriesWithAssignment = (
  transactions: Transaction[],
  allBudgets: { id: number; name: string; categories: string[] }[],
  currentBudgetId?: number
): Category<MerchantName>[] => {
  if (!currentBudgetId) {
    throw new Error("Current budget ID is required");
  }
  return buildCategoryHierarchy<MerchantName>(
    transactions,
    allBudgets,
    currentBudgetId
  );
};
export const buildCategoryHierarchy = <
  T extends MerchantName | MerchantNameAlt
>(
  transactions: Transaction[],
  allBudgets: { id: number; name: string; categories: string[] }[],
  currentBudgetId?: number
): Category<T>[] => {
  const categoriesHierarchy = transactions.reduce((acc, transaction) => {
    const { mainCategory, subCategory, merchantName } = transaction;

    if (!acc[mainCategory]) {
      acc[mainCategory] = { subCategories: {} };
    }

    if (subCategory) {
      if (!acc[mainCategory].subCategories[subCategory]) {
        acc[mainCategory].subCategories[subCategory] = { merchantNames: [] };
      }

      if (
        merchantName &&
        !acc[mainCategory].subCategories[subCategory].merchantNames.includes(
          merchantName
        )
      ) {
        acc[mainCategory].subCategories[subCategory].merchantNames.push(
          merchantName
        );
      }
    }

    return acc;
  }, {} as Record<string, { subCategories: Record<string, { merchantNames: string[] }> }>);

  return Object.entries(categoriesHierarchy).map(([mainCategory, data]) => {
    const mainCategoryId = createCategoryId(mainCategory);
    const assignedBudgets = allBudgets.filter((b) =>
      b.categories?.some((c) => c.startsWith(mainCategoryId))
    );

    const subCategories = Object.entries(data.subCategories).map(
      ([subCategory, subData]) => {
        const subCategoryId = createCategoryId(mainCategory, subCategory);
        const subAssignedBudgets = allBudgets.filter((b) =>
          b.categories?.some((c) => c.startsWith(subCategoryId))
        );

        const merchantNames = subData.merchantNames.map((merchantName) => {
          const merchantId = createCategoryId(
            mainCategory,
            subCategory,
            merchantName
          );
          const merchantAssignedBudgets = allBudgets.filter((b) =>
            b.categories?.some((c) => c === merchantId)
          );

          return {
            id: merchantId,
            name: merchantName,
            displayName: merchantName,
            assignedOtherBudget: currentBudgetId
              ? merchantAssignedBudgets.some((b) => b.id !== currentBudgetId)
              : null,
            assigned: currentBudgetId
              ? merchantAssignedBudgets.some((b) => b.id === currentBudgetId)
              : null,
            assignedBudgets: merchantAssignedBudgets.map((b) => ({
              id: b.id,
              name: b.name,
            })),
          } as T;
        });

        const filteredMerchantNames = currentBudgetId
          ? merchantNames.filter((m) => !m.assignedOtherBudget)
          : merchantNames;
        const allAssigned = currentBudgetId
          ? filteredMerchantNames.every((m) => m.assigned)
          : null;
        const someAssigned = currentBudgetId
          ? filteredMerchantNames.some((m) => m.assigned)
          : null;

        return {
          id: subCategoryId,
          name: subCategory,
          displayName: subCategory.replace(/_/g, " "),
          assigned: allAssigned,
          partiallyAssigned: currentBudgetId
            ? !allAssigned && someAssigned
            : null,
          assignedBudgets: subAssignedBudgets.map((b) => ({
            id: b.id,
            name: b.name,
          })),
          merchantNames,
        };
      }
    );

    const allMerchants = currentBudgetId
      ? subCategories.flatMap((sc) =>
          sc.merchantNames.filter((m) => !m.assignedOtherBudget)
        )
      : subCategories.flatMap((sc) => sc.merchantNames);

    const allAssigned = currentBudgetId
      ? allMerchants.every((m) => m.assigned)
      : null;
    const someAssigned = currentBudgetId
      ? allMerchants.some((m) => m.assigned)
      : null;

    return {
      id: mainCategoryId,
      name: mainCategory,
      displayName: mainCategory.replace(/_/g, " "),
      assigned: allAssigned,
      partiallyAssigned: currentBudgetId ? !allAssigned && someAssigned : null,
      assignedBudgets: assignedBudgets.map((b) => ({ id: b.id, name: b.name })),
      subCategories,
    };
  });
};

export const calculateBudgetSpent = (
  budget: { categories: string[] | null },
  transactions: Transaction[]
) => {
  if (!budget.categories || budget.categories.length === 0) {
    return 0;
  }

  return transactions.reduce((sum, transaction) => {
    const merchantId = createCategoryId(
      transaction.mainCategory,
      transaction.subCategory,
      transaction.merchantName
    );

    if (budget.categories?.includes(merchantId) ?? false) {
      return sum + transaction.amount;
    }
    return sum;
  }, 0);
};
