import { FoodProvider, ProviderSearchResult, ProviderFoodDetail } from '../FoodProvider';
import * as usdaClient from './usdaClient';

export const usdaProvider: FoodProvider = {
  providerId: 'usda',

  async search(
    query: string,
    opts?: { limit?: number }
  ): Promise<ProviderSearchResult[]> {
    const response = await usdaClient.searchFoods(query, opts?.limit ?? 10);
    return (response.foods ?? []).map((food) => ({
      externalId: String(food.fdcId),
      name: food.description,
      brand: food.brandOwner,
      hints: { dataType: food.dataType },
      providerId: 'usda' as const,
    }));
  },

  async getDetails(externalId: string): Promise<ProviderFoodDetail> {
    const detail = await usdaClient.getFoodDetail(externalId);
    const nutrients: ProviderFoodDetail['nutrients'] = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };

    for (const n of detail.foodNutrients ?? []) {
      const num = n.nutrient?.number;
      const amount = n.amount ?? 0;
      if (num === '208' || num === '957') nutrients.calories = amount;
      if (num === '203') nutrients.protein_g = amount;
      if (num === '205') nutrients.carbs_g = amount;
      if (num === '204') nutrients.fat_g = amount;
    }

    return {
      externalId: String(detail.fdcId),
      name: detail.description,
      brand: detail.brandOwner,
      nutrients,
      servingSize: detail.servingSize,
      servingSizeUnit: detail.servingSizeUnit,
      providerId: 'usda',
    };
  },
};
