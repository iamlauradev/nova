// ─── Data model interfaces ───────────────────────────────────────────────────
// These types describe the shape of data returned by the API and stored in
// FinanceContext. Use them when migrating .js files to .ts/.tsx.

export interface Account {
  id: string;
  userId: number;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'investment' | 'other';
  balance: number;
  color: string;
  archived: 0 | 1;
}

export interface Transaction {
  id: string;
  userId: number;
  accountId: string;
  type: 'income' | 'expense' | 'transfer-in' | 'transfer-out';
  amount: number;
  description: string;
  category: string;
  date: string;           // ISO string
  notes: string;
  transferGroup: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;           // emoji fallback
  image?: string;         // emote key
  group?: string;
}

export interface Categories {
  income: Category[];
  expense: Category[];
}

export interface RecurringItem {
  id: string;
  userId: number;
  name: string;
  type: 'expense' | 'income' | 'savings' | 'financed' | 'debt';
  amount: number;
  category: string;
  accountId: string;
  frequency: 'monthly' | 'custom';
  dayOfMonth: string;
  notes: string;
  active: 0 | 1;
  customMonths: number;
}

export interface Budget {
  id: string;
  userId: number;
  categoryId: string;
  amount: number;
  period: 'monthly';
}

export interface Goal {
  id: string;
  userId: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  accountId: string;
  icon: string;
}

export interface Debt {
  id: string;
  userId: number;
  name: string;
  totalAmount: number;
  paidAmount: number;
  icon: string;
  color: string;
  notes: string;
  startDate: string;
  targetDate: string;
  active: 0 | 1;
}

export interface Loan {
  id: string;
  userId: number;
  name: string;
  totalAmount: number;
  collectedAmount: number;
  icon: string;
  color: string;
  notes: string;
  startDate: string;
  targetDate: string;
  active: 0 | 1;
}

export interface User {
  id: number;
  username: string;
  name: string;
}

// ─── Utility types ────────────────────────────────────────────────────────────

export type TransactionType = Transaction['type'];
export type AccountType = Account['type'];

/** Partial payload used when creating/editing a transaction */
export interface TransactionPayload {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  accountId: string;
  date: string;
  notes: string;
}

/** Result of suggestCategory() */
export type CategorySuggestion = string | null;
