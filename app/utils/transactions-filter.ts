export interface Transaction {
  transactionId: string;
  date: string; // ISO date string
  amount: number;
  merchantName: string | null;
  // Additional fields can be added as needed
}

function isWithinVariance(
  amount1: number,
  amount2: number,
  variance: number
): boolean {
  const allowedDeviation = variance * Math.max(amount1, amount2);
  return Math.abs(amount1 - amount2) <= allowedDeviation;
}

export function getRecurringMonthlyTransactions(
  transactions: Transaction[],
  variance: number = 0.03
): Transaction[] {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  // Filter transactions that occurred in the last two months
  const recentTransactions = transactions.filter(
    (tx) => new Date(tx.date) >= twoMonthsAgo
  );

  if (variance === 0) {
    // Group by exact match
    const groups: { [key: string]: Transaction[] } = {};
    recentTransactions.forEach((tx) => {
      const key = `${tx.merchantName}-${tx.amount}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.values(groups)
      .filter((group) => group.length >= 2)
      .flat();
  } else {
    // Fuzzy grouping: group transactions with the same merchantName and amounts within the given variance
    const groups: Transaction[][] = [];
    recentTransactions.forEach((tx) => {
      let added = false;
      for (let group of groups) {
        if (group.length > 0 && group[0].merchantName === tx.merchantName) {
          if (isWithinVariance(group[0].amount, tx.amount, variance)) {
            group.push(tx);
            added = true;
            break;
          }
        }
      }
      if (!added) {
        groups.push([tx]);
      }
    });
    return groups.filter((group) => group.length >= 2).flat();
  }
}
