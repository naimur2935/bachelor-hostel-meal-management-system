export type UserRole = 'super_admin' | 'admin' | 'manager' | 'user';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  room_number?: string;
  created_at: string;
}

export interface MealEntry {
  id: string;
  user_id: string;
  date: string;
  lunch: boolean;
  dinner: boolean;
  modified_by?: string;
  modified_at?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: 'bazar' | 'gas' | 'electricity' | 'rent' | 'extra';
  description: string;
  added_by: string;
  created_at: string;
  month_year: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  type: 'meal' | 'utility';
  date: string;
  collected_by: string;
  month_year: string;
  created_at: string;
}

export interface MonthlySummary {
  total_meals: number;
  total_bazar_cost: number;
  meal_rate: number;
  total_utility: number;
}

export interface UserBalance {
  user_id: string;
  full_name: string;
  meal_count: number;
  meal_cost: number;
  meal_paid: number;
  utility_paid: number;
  balance: number;
}
