import { FoodItemData } from '../constants/foodDatabase';
import { UserAllergy } from '../types';

const ALLERGY_SYNONYMS: Record<string, string[]> = {
  dairy: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'cheese', 'cream', 'butter', 'yogurt', 'milk/dairy'],
  'tree nuts': ['almond', 'walnut', 'cashew', 'pistachio', 'pecan', 'hazelnut', 'macadamia', 'brazil nut', 'tree nut'],
  shellfish: ['shrimp', 'crab', 'lobster', 'clam', 'scallop', 'oyster', 'mussel', 'shellfish'],
  wheat: ['wheat', 'gluten', 'barley', 'rye', 'wheat/gluten'],
  peanuts: ['peanut', 'peanuts'],
  eggs: ['egg', 'eggs'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'bass', 'trout', 'sardine', 'anchovy'],
  sesame: ['sesame', 'tahini'],
};

function expandAllergyToTerms(normalized: string): string[] {
  const lower = normalized.toLowerCase().trim();
  for (const [key, terms] of Object.entries(ALLERGY_SYNONYMS)) {
    if (key === lower || terms.some((t) => t === lower)) {
      return [lower, ...terms];
    }
  }
  return [lower];
}

export function isFoodBlockedByAllergies(
  food: FoodItemData,
  allergies: UserAllergy[]
): boolean {
  if (allergies.length === 0) return false;

  const foodNameNorm = food.name.toLowerCase();
  const foodTags = (food.tags ?? []).map((t) => t.toLowerCase());

  for (const allergy of allergies) {
    const terms = expandAllergyToTerms(allergy.normalized);
    for (const term of terms) {
      if (foodNameNorm.includes(term)) return true;
      if (foodTags.some((tag) => tag.includes(term) || term.includes(tag))) return true;
      if (food.id.toLowerCase().includes(term)) return true;
    }
  }
  return false;
}
