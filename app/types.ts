export interface Category<T> {
  id: string;
  name: string;
  displayName: string;
  assigned: boolean | null;
  partiallyAssigned: boolean | null;
  assignedBudgets: { id: number; name: string }[];
  subCategories: SubCategory<T>[];
}

export interface SubCategory<T> {
  id: string;
  name: string;
  displayName: string;
  assigned: boolean | null;
  partiallyAssigned: boolean | null;
  assignedBudgets: { id: number; name: string }[];
  merchantNames: T[];
}

export interface MerchantName {
  id: string;
  name: string;
  displayName: string;
  assignedOtherBudget: boolean;
  assigned: boolean;
  assignedBudgets: { id: number; name: string }[];
}
export interface MerchantNameAlt {
  id: string;
  name: string;
  displayName: string;
  assignedOtherBudget: boolean | null;
  assigned: boolean | null;
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
