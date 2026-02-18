import { FoodCategory } from '../../types';

export interface SubstituteCatalogItem {
  id: string;
  foodId: string;
  name: string;
  defaultServingG: number;
  macrosPerServing: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  category: FoodCategory;
  tags: string[];
}

export interface SubstituteResult {
  catalogItem: SubstituteCatalogItem;
  adjustedServingG: number;
  adjustedMacros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  adjustedPortion: string;
}
