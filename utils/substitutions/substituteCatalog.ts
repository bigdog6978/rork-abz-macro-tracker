import { SubstituteCatalogItem } from './types';

export const SUBSTITUTE_CATALOG: SubstituteCatalogItem[] = [
  // PROTEIN
  {
    id: 'sub_chicken_breast', foodId: 'chicken_breast', name: 'Grilled chicken breast',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 281, protein_g: 52.7, carbs_g: 0, fat_g: 6.1 },
    tags: ['meat', 'animal', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_turkey_breast', foodId: 'turkey_breast', name: 'Turkey breast',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 230, protein_g: 51, carbs_g: 0, fat_g: 1.7 },
    tags: ['meat', 'animal', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_salmon', foodId: 'salmon', name: 'Salmon fillet',
    defaultServingG: 140, category: 'protein',
    macrosPerServing: { calories: 291, protein_g: 28, carbs_g: 0, fat_g: 18.2 },
    tags: ['fish', 'animal', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_cod', foodId: 'cod', name: 'Baked cod',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 179, protein_g: 39.1, carbs_g: 0, fat_g: 1.5 },
    tags: ['fish', 'animal', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_shrimp', foodId: 'shrimp', name: 'Shrimp',
    defaultServingG: 140, category: 'protein',
    macrosPerServing: { calories: 139, protein_g: 33.6, carbs_g: 0.3, fat_g: 0.4 },
    tags: ['fish', 'animal', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_eggs', foodId: 'eggs', name: 'Eggs',
    defaultServingG: 150, category: 'protein',
    macrosPerServing: { calories: 233, protein_g: 19.5, carbs_g: 1.7, fat_g: 16.5 },
    tags: ['egg', 'animal', 'gluten_free', 'vegetarian', 'paleo'],
  },
  {
    id: 'sub_ground_beef_90', foodId: 'ground_beef_90', name: 'Lean ground beef',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 369, protein_g: 45.9, carbs_g: 0, fat_g: 18.7 },
    tags: ['meat', 'animal', 'gluten_free', 'dairy_free', 'paleo', 'carnivore'],
  },
  {
    id: 'sub_ribeye', foodId: 'ribeye', name: 'Ribeye steak',
    defaultServingG: 225, category: 'protein',
    macrosPerServing: { calories: 610, protein_g: 54, carbs_g: 0, fat_g: 42.8 },
    tags: ['meat', 'animal', 'gluten_free', 'dairy_free', 'paleo', 'carnivore', 'keto'],
  },
  {
    id: 'sub_pork_loin', foodId: 'pork_loin', name: 'Pork tenderloin',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 243, protein_g: 45.9, carbs_g: 0, fat_g: 6.0 },
    tags: ['meat', 'animal', 'gluten_free', 'dairy_free', 'paleo', 'carnivore'],
  },
  {
    id: 'sub_tofu', foodId: 'tofu', name: 'Firm tofu',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 245, protein_g: 28.9, carbs_g: 5.1, fat_g: 15.3 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_tempeh', foodId: 'tempeh', name: 'Tempeh',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 326, protein_g: 34, carbs_g: 13.6, fat_g: 18.7 },
    tags: ['plant', 'vegetarian', 'vegan', 'dairy_free'],
  },
  {
    id: 'sub_greek_yogurt', foodId: 'greek_yogurt', name: 'Greek yogurt (plain)',
    defaultServingG: 170, category: 'protein',
    macrosPerServing: { calories: 124, protein_g: 17, carbs_g: 6.1, fat_g: 3.4 },
    tags: ['dairy', 'animal', 'vegetarian', 'gluten_free'],
  },
  {
    id: 'sub_cottage_cheese', foodId: 'cottage_cheese', name: 'Cottage cheese',
    defaultServingG: 113, category: 'protein',
    macrosPerServing: { calories: 92, protein_g: 12.4, carbs_g: 4.5, fat_g: 2.6 },
    tags: ['dairy', 'animal', 'vegetarian', 'gluten_free'],
  },
  {
    id: 'sub_lentils', foodId: 'lentils', name: 'Cooked lentils',
    defaultServingG: 200, category: 'protein',
    macrosPerServing: { calories: 232, protein_g: 18, carbs_g: 40, fat_g: 0.8 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_whey_protein', foodId: 'whey_protein', name: 'Whey protein shake',
    defaultServingG: 31, category: 'protein',
    macrosPerServing: { calories: 124, protein_g: 24.8, carbs_g: 3.1, fat_g: 1.6 },
    tags: ['dairy', 'animal', 'vegetarian', 'gluten_free'],
  },
  {
    id: 'sub_plant_protein', foodId: 'plant_protein', name: 'Plant protein shake',
    defaultServingG: 33, category: 'protein',
    macrosPerServing: { calories: 124, protein_g: 24.8, carbs_g: 4, fat_g: 1.3 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },

  // CARB
  {
    id: 'sub_oats', foodId: 'oats_dry', name: 'Oatmeal (dry)',
    defaultServingG: 40, category: 'carb',
    macrosPerServing: { calories: 156, protein_g: 6.8, carbs_g: 26.4, fat_g: 2.8 },
    tags: ['grain', 'vegetarian', 'vegan', 'dairy_free'],
  },
  {
    id: 'sub_brown_rice', foodId: 'brown_rice', name: 'Brown rice (cooked)',
    defaultServingG: 200, category: 'carb',
    macrosPerServing: { calories: 224, protein_g: 5.2, carbs_g: 48, fat_g: 1.8 },
    tags: ['grain', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_white_rice', foodId: 'white_rice', name: 'White rice (cooked)',
    defaultServingG: 200, category: 'carb',
    macrosPerServing: { calories: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6 },
    tags: ['grain', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_sweet_potato', foodId: 'sweet_potato', name: 'Sweet potato',
    defaultServingG: 130, category: 'carb',
    macrosPerServing: { calories: 112, protein_g: 2.1, carbs_g: 26, fat_g: 0.1 },
    tags: ['starch', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_quinoa', foodId: 'quinoa', name: 'Quinoa (cooked)',
    defaultServingG: 185, category: 'carb',
    macrosPerServing: { calories: 222, protein_g: 8.1, carbs_g: 38.9, fat_g: 3.5 },
    tags: ['grain', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_potato', foodId: 'potato', name: 'Baked potato',
    defaultServingG: 173, category: 'carb',
    macrosPerServing: { calories: 161, protein_g: 4.3, carbs_g: 36.3, fat_g: 0.2 },
    tags: ['starch', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_banana', foodId: 'banana', name: 'Banana',
    defaultServingG: 118, category: 'carb',
    macrosPerServing: { calories: 105, protein_g: 1.3, carbs_g: 27.1, fat_g: 0.4 },
    tags: ['fruit', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_ww_pasta', foodId: 'ww_pasta', name: 'Whole wheat pasta (cooked)',
    defaultServingG: 140, category: 'carb',
    macrosPerServing: { calories: 174, protein_g: 7, carbs_g: 35, fat_g: 0.7 },
    tags: ['grain', 'vegetarian', 'vegan', 'dairy_free'],
  },
  {
    id: 'sub_couscous', foodId: 'couscous', name: 'Couscous (cooked)',
    defaultServingG: 157, category: 'carb',
    macrosPerServing: { calories: 176, protein_g: 6, carbs_g: 36.1, fat_g: 0.3 },
    tags: ['grain', 'vegetarian', 'vegan', 'dairy_free'],
  },

  // FAT
  {
    id: 'sub_avocado', foodId: 'avocado', name: 'Avocado',
    defaultServingG: 68, category: 'fat',
    macrosPerServing: { calories: 109, protein_g: 1.4, carbs_g: 6.1, fat_g: 10.2 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_almonds', foodId: 'almonds', name: 'Almonds',
    defaultServingG: 28, category: 'fat',
    macrosPerServing: { calories: 162, protein_g: 5.9, carbs_g: 6.2, fat_g: 14 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_walnuts', foodId: 'walnuts', name: 'Walnuts',
    defaultServingG: 28, category: 'fat',
    macrosPerServing: { calories: 183, protein_g: 4.2, carbs_g: 3.9, fat_g: 18.2 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_olive_oil', foodId: 'olive_oil', name: 'Olive oil',
    defaultServingG: 14, category: 'fat',
    macrosPerServing: { calories: 124, protein_g: 0, carbs_g: 0, fat_g: 14 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_peanut_butter', foodId: 'peanut_butter', name: 'Peanut butter',
    defaultServingG: 32, category: 'fat',
    macrosPerServing: { calories: 188, protein_g: 8, carbs_g: 6.4, fat_g: 16 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'dairy_free'],
  },
  {
    id: 'sub_almond_butter', foodId: 'almond_butter', name: 'Almond butter',
    defaultServingG: 32, category: 'fat',
    macrosPerServing: { calories: 196, protein_g: 6.7, carbs_g: 6.1, fat_g: 17.9 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_macadamia', foodId: 'macadamia', name: 'Macadamia nuts',
    defaultServingG: 28, category: 'fat',
    macrosPerServing: { calories: 201, protein_g: 2.2, carbs_g: 3.9, fat_g: 21.3 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_mixed_nuts', foodId: 'mixed_nuts', name: 'Mixed nuts',
    defaultServingG: 28, category: 'fat',
    macrosPerServing: { calories: 170, protein_g: 5.6, carbs_g: 5.9, fat_g: 15.1 },
    tags: ['nut', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_butter', foodId: 'butter', name: 'Butter',
    defaultServingG: 14, category: 'fat',
    macrosPerServing: { calories: 100, protein_g: 0.1, carbs_g: 0, fat_g: 11.3 },
    tags: ['dairy', 'animal', 'vegetarian', 'gluten_free', 'carnivore', 'keto'],
  },
  {
    id: 'sub_coconut_oil', foodId: 'coconut_oil', name: 'Coconut oil',
    defaultServingG: 14, category: 'fat',
    macrosPerServing: { calories: 121, protein_g: 0, carbs_g: 0, fat_g: 14 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },

  // FRUIT
  {
    id: 'sub_berries', foodId: 'berries', name: 'Mixed berries',
    defaultServingG: 150, category: 'fruit',
    macrosPerServing: { calories: 86, protein_g: 1.1, carbs_g: 21, fat_g: 0.5 },
    tags: ['fruit', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_apple', foodId: 'apple', name: 'Apple',
    defaultServingG: 182, category: 'fruit',
    macrosPerServing: { calories: 95, protein_g: 0.5, carbs_g: 25.5, fat_g: 0.4 },
    tags: ['fruit', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_banana_fruit', foodId: 'banana', name: 'Banana',
    defaultServingG: 118, category: 'fruit',
    macrosPerServing: { calories: 105, protein_g: 1.3, carbs_g: 27.1, fat_g: 0.4 },
    tags: ['fruit', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_dates', foodId: 'dates', name: 'Medjool dates',
    defaultServingG: 48, category: 'fruit',
    macrosPerServing: { calories: 133, protein_g: 0.9, carbs_g: 36, fat_g: 0.1 },
    tags: ['fruit', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },

  // VEGGIE
  {
    id: 'sub_broccoli', foodId: 'broccoli', name: 'Steamed broccoli',
    defaultServingG: 91, category: 'veggie',
    macrosPerServing: { calories: 32, protein_g: 2.2, carbs_g: 6.4, fat_g: 0.4 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_spinach', foodId: 'spinach_cooked', name: 'Sautéed spinach',
    defaultServingG: 180, category: 'veggie',
    macrosPerServing: { calories: 41, protein_g: 5.2, carbs_g: 6.8, fat_g: 0.5 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_mixed_greens', foodId: 'mixed_greens', name: 'Mixed green salad',
    defaultServingG: 85, category: 'veggie',
    macrosPerServing: { calories: 14, protein_g: 1.3, carbs_g: 2.6, fat_g: 0.2 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_asparagus', foodId: 'asparagus', name: 'Roasted asparagus',
    defaultServingG: 134, category: 'veggie',
    macrosPerServing: { calories: 29, protein_g: 3.2, carbs_g: 5.4, fat_g: 0.3 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_cauliflower', foodId: 'cauliflower', name: 'Roasted cauliflower',
    defaultServingG: 124, category: 'veggie',
    macrosPerServing: { calories: 29, protein_g: 2.2, carbs_g: 5.1, fat_g: 0.6 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_green_beans', foodId: 'green_beans', name: 'Green beans',
    defaultServingG: 110, category: 'veggie',
    macrosPerServing: { calories: 39, protein_g: 2, carbs_g: 8.8, fat_g: 0.1 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },
  {
    id: 'sub_roasted_veggies', foodId: 'roasted_veggies', name: 'Roasted vegetables',
    defaultServingG: 150, category: 'veggie',
    macrosPerServing: { calories: 90, protein_g: 2.3, carbs_g: 15, fat_g: 3 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo'],
  },
  {
    id: 'sub_zucchini', foodId: 'zucchini', name: 'Grilled zucchini',
    defaultServingG: 180, category: 'veggie',
    macrosPerServing: { calories: 31, protein_g: 2.2, carbs_g: 5.4, fat_g: 0.5 },
    tags: ['veggie', 'plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'paleo', 'keto'],
  },

  // MIXED
  {
    id: 'sub_hummus', foodId: 'hummus', name: 'Hummus',
    defaultServingG: 62, category: 'mixed',
    macrosPerServing: { calories: 103, protein_g: 5, carbs_g: 8.7, fat_g: 6.2 },
    tags: ['plant', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
  },
  {
    id: 'sub_tabbouleh', foodId: 'tabbouleh', name: 'Tabbouleh salad',
    defaultServingG: 160, category: 'mixed',
    macrosPerServing: { calories: 192, protein_g: 4.8, carbs_g: 25.6, fat_g: 9.6 },
    tags: ['grain', 'plant', 'vegetarian', 'vegan', 'dairy_free'],
  },
];
