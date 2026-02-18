export type GroceryCategory = 'Protein' | 'Carbs' | 'Produce' | 'Fats' | 'Other';

export interface GroceryItem {
  key: string;
  name: string;
  totalAmount: number;
  unit: string;
  sources: string[];
  checked: boolean;
}

export interface GroceryCategoryGroup {
  name: GroceryCategory;
  items: GroceryItem[];
}

export interface GroceryList {
  planId: string;
  createdAt: string;
  categories: GroceryCategoryGroup[];
}

export type GroceryChecklist = Record<string, boolean>;
