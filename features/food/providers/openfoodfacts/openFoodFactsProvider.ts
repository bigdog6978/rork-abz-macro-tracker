import { FoodProvider, ProviderSearchResult, ProviderFoodDetail } from '../FoodProvider';

export const openFoodFactsProvider: FoodProvider = {
  providerId: 'openfoodfacts' as const,

  async search(
    _query: string,
    _opts?: { limit?: number }
  ): Promise<ProviderSearchResult[]> {
    console.log('[OpenFoodFacts] Provider not yet implemented');
    return [];
  },

  async getDetails(_externalId: string): Promise<ProviderFoodDetail> {
    throw new Error('[OpenFoodFacts] Provider not yet implemented');
  },
};
