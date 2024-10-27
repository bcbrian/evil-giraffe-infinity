export interface Category {
  id: string;
  name: string;
  displayName: string;
  assigned: boolean;
  partiallyAssigned: boolean;
  assignedBudgets: { id: number; name: string }[];
  subCategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  displayName: string;
  assigned: boolean;
  partiallyAssigned: boolean;
  assignedBudgets: { id: number; name: string }[];
  merchantNames: MerchantName[];
}

export interface MerchantName {
  id: string;
  name: string;
  displayName: string;
  assignedOtherBudget: boolean;
  assigned: boolean;
  assignedBudgets: { id: number; name: string }[];
}

export interface Transaction {
  id: number;
  amount: number;
  date: string;
  mainCategory: string;
  subCategory: string;
  merchantName: string;
}
