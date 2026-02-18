export interface ProviderSearchResult {
  externalId: string;
  name: string;
  brand?: string;
  hints?: Record<string, string>;
  providerId: 'usda' | 'openfoodfacts' | 'other';
}

export interface ProviderFoodDetail {
  externalId: string;
  name: string;
  brand?: string;
  nutrients: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  servingSize?: number;
  servingSizeUnit?: string;
  providerId: 'usda' | 'openfoodfacts' | 'other';
}

export interface FoodProvider {
  search(query: string, opts?: { limit?: number }): Promise<ProviderSearchResult[]>;
  getDetails(externalId: string): Promise<ProviderFoodDetail>;
  providerId: 'usda' | 'openfoodfacts' | 'other';
}
