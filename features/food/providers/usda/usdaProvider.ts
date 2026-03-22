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
      if (num === '208' || num === '957' || num === '1008') nutrients.calories = amount;
      if (num === '203' || num === '1003') nutrients.protein_g = amount;
      if (num === '205' || num === '1005') nutrients.carbs_g = amount;
      if (num === '204' || num === '1004' || num === '298') nutrients.fat_g = amount;
    }

    const protein = nutrients.protein_g ?? 0;
    const carbs = nutrients.carbs_g ?? 0;
    const fat = nutrients.fat_g ?? 0;

    if ((nutrients.calories ?? 0) <= 0) {
      nutrients.calories = protein * 4 + carbs * 4 + fat * 9;
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
