export interface FoodItemData {
  id: string;
  name: string;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  basePortionG: number;
  gramsPerUnit: number;
  unitLabel: string;
  tags: string[];
}

function f(
  id: string,
  name: string,
  cal: number,
  p: number,
  c: number,
  fat: number,
  baseG: number,
  gPerUnit: number,
  unitLabel: string,
  tags: string[]
): FoodItemData {
  return {
    id,
    name,
    per100g: { calories: cal, protein_g: p, carbs_g: c, fat_g: fat },
    basePortionG: baseG,
    gramsPerUnit: gPerUnit,
    unitLabel,
    tags,
  };
}

export const FOODS: Record<string, FoodItemData> = {
  chicken_breast: f('chicken_breast', 'Grilled chicken breast', 165, 31, 0, 3.6, 170, 28.35, 'oz', ['meat', 'animal', 'lean_protein']),
  salmon: f('salmon', 'Salmon fillet', 208, 20, 0, 13, 140, 28.35, 'oz', ['fish', 'animal']),
  ground_beef_90: f('ground_beef_90', 'Lean ground beef', 217, 27, 0, 11, 170, 28.35, 'oz', ['meat', 'animal', 'lean_protein']),
  eggs: f('eggs', 'Eggs', 155, 13, 1.1, 11, 150, 50, 'large egg', ['egg', 'animal']),
  turkey_breast: f('turkey_breast', 'Turkey breast', 135, 30, 0, 1, 170, 28.35, 'oz', ['meat', 'animal', 'lean_protein']),
  shrimp: f('shrimp', 'Shrimp', 99, 24, 0.2, 0.3, 140, 28.35, 'oz', ['fish', 'animal', 'shellfish', 'lean_protein']),
  ribeye: f('ribeye', 'Ribeye steak', 271, 24, 0, 19, 225, 28.35, 'oz', ['meat', 'animal', 'high_fat']),
  pork_loin: f('pork_loin', 'Pork tenderloin', 143, 27, 0, 3.5, 170, 28.35, 'oz', ['meat', 'animal', 'pork']),
  tuna_canned: f('tuna_canned', 'Tuna (canned in water)', 116, 26, 0, 0.8, 140, 28.35, 'oz', ['fish', 'animal', 'lean_protein']),
  cod: f('cod', 'Baked cod', 105, 23, 0, 0.9, 170, 28.35, 'oz', ['fish', 'animal', 'lean_protein']),
  bacon: f('bacon', 'Bacon', 541, 37, 1.4, 42, 42, 14, 'strip', ['meat', 'animal', 'pork', 'high_fat']),
  beef_liver: f('beef_liver', 'Beef liver', 135, 21, 3.9, 3.6, 85, 28.35, 'oz', ['meat', 'animal']),
  bone_broth: f('bone_broth', 'Bone broth', 7, 1, 0.5, 0.1, 240, 240, 'cup', ['animal']),
  beef_jerky: f('beef_jerky', 'Beef jerky', 410, 33, 11, 25, 56, 28.35, 'oz', ['meat', 'animal']),
  ground_beef_80: f('ground_beef_80', 'Ground beef patty', 254, 26, 0, 17, 225, 28.35, 'oz', ['meat', 'animal', 'high_fat']),
  lamb_chop: f('lamb_chop', 'Lamb chop', 258, 25, 0, 17, 170, 28.35, 'oz', ['meat', 'animal']),

  greek_yogurt: f('greek_yogurt', 'Greek yogurt (plain)', 73, 10, 3.6, 2, 170, 170, 'cup', ['dairy', 'animal']),
  cottage_cheese: f('cottage_cheese', 'Cottage cheese', 81, 11, 4, 2.3, 113, 113, 'cup (4 oz)', ['dairy', 'animal']),
  cheddar: f('cheddar', 'Cheddar cheese', 403, 25, 1.3, 33, 28, 28, 'oz', ['dairy', 'animal', 'gluten_free_ok']),
  mozzarella: f('mozzarella', 'Mozzarella', 280, 28, 3.1, 17, 28, 28, 'oz', ['dairy', 'animal']),
  feta: f('feta', 'Feta cheese', 264, 14, 4, 21, 28, 28, 'oz', ['dairy', 'animal']),
  cream_cheese: f('cream_cheese', 'Cream cheese', 342, 6, 4, 34, 28, 14, 'tbsp', ['dairy', 'animal']),
  butter: f('butter', 'Butter', 717, 0.9, 0.1, 81, 14, 14, 'tbsp', ['dairy', 'animal', 'high_fat']),
  string_cheese: f('string_cheese', 'String cheese', 280, 25, 2, 18, 56, 28, 'stick', ['dairy', 'animal']),

  tofu: f('tofu', 'Firm tofu', 144, 17, 3, 9, 170, 28.35, 'oz', ['plant', 'soy']),
  tempeh: f('tempeh', 'Tempeh', 192, 20, 8, 11, 170, 28.35, 'oz', ['plant', 'soy']),
  lentils: f('lentils', 'Cooked lentils', 116, 9, 20, 0.4, 200, 200, 'cup', ['plant', 'legume']),
  black_beans: f('black_beans', 'Black beans', 132, 9, 24, 0.5, 170, 170, 'cup', ['plant', 'legume']),
  chickpeas: f('chickpeas', 'Chickpeas', 164, 9, 27, 2.6, 164, 164, 'cup', ['plant', 'legume']),
  edamame: f('edamame', 'Edamame (shelled)', 121, 12, 9, 5, 155, 155, 'cup', ['plant', 'soy', 'legume']),

  oats_dry: f('oats_dry', 'Oatmeal (dry)', 389, 17, 66, 7, 40, 40, 'cup (dry)', ['grain', 'gluten']),
  brown_rice: f('brown_rice', 'Brown rice (cooked)', 112, 2.6, 24, 0.9, 200, 200, 'cup', ['grain']),
  white_rice: f('white_rice', 'White rice (cooked)', 130, 2.7, 28, 0.3, 200, 200, 'cup', ['grain']),
  sweet_potato: f('sweet_potato', 'Sweet potato', 86, 1.6, 20, 0.1, 130, 130, 'medium', ['starch']),
  quinoa: f('quinoa', 'Quinoa (cooked)', 120, 4.4, 21, 1.9, 185, 185, 'cup', ['grain']),
  ww_bread: f('ww_bread', 'Whole wheat bread', 252, 13, 43, 3.4, 56, 28, 'slice', ['grain', 'gluten']),
  banana: f('banana', 'Banana', 89, 1.1, 23, 0.3, 118, 118, 'medium', ['fruit']),
  berries: f('berries', 'Mixed berries', 57, 0.7, 14, 0.3, 150, 150, 'cup', ['fruit']),
  apple: f('apple', 'Apple', 52, 0.3, 14, 0.2, 182, 182, 'medium', ['fruit']),
  couscous: f('couscous', 'Couscous (cooked)', 112, 3.8, 23, 0.2, 157, 157, 'cup', ['grain', 'gluten']),
  ww_pasta: f('ww_pasta', 'Whole wheat pasta (cooked)', 124, 5, 25, 0.5, 140, 140, 'cup', ['grain', 'gluten']),
  pita: f('pita', 'Whole grain pita', 266, 10, 55, 1.7, 60, 60, 'pita', ['grain', 'gluten']),
  tortilla: f('tortilla', 'Whole wheat tortilla', 316, 8, 52, 8, 45, 45, 'tortilla', ['grain', 'gluten']),
  corn_tortilla: f('corn_tortilla', 'Corn tortilla', 218, 5.7, 44, 2.8, 52, 26, 'tortilla', ['grain']),
  potato: f('potato', 'Baked potato', 93, 2.5, 21, 0.1, 173, 173, 'medium', ['starch']),

  avocado: f('avocado', 'Avocado', 160, 2, 9, 15, 68, 68, 'half', ['fat', 'plant', 'high_fat']),
  almonds: f('almonds', 'Almonds', 579, 21, 22, 50, 28, 28, 'oz (23 almonds)', ['nut', 'plant', 'high_fat']),
  walnuts: f('walnuts', 'Walnuts', 654, 15, 14, 65, 28, 28, 'oz', ['nut', 'plant', 'high_fat']),
  macadamia: f('macadamia', 'Macadamia nuts', 718, 8, 14, 76, 28, 28, 'oz', ['nut', 'plant', 'high_fat']),
  peanut_butter: f('peanut_butter', 'Peanut butter', 588, 25, 20, 50, 32, 16, 'tbsp', ['nut', 'plant', 'legume', 'high_fat']),
  almond_butter: f('almond_butter', 'Almond butter', 614, 21, 19, 56, 32, 16, 'tbsp', ['nut', 'plant', 'high_fat']),
  olive_oil: f('olive_oil', 'Olive oil', 884, 0, 0, 100, 14, 14, 'tbsp', ['fat', 'plant', 'high_fat']),
  coconut_oil: f('coconut_oil', 'Coconut oil', 862, 0, 0, 100, 14, 14, 'tbsp', ['fat', 'plant', 'high_fat']),
  mixed_nuts: f('mixed_nuts', 'Mixed nuts', 607, 20, 21, 54, 28, 28, 'oz', ['nut', 'plant', 'high_fat']),
  trail_mix: f('trail_mix', 'Trail mix', 462, 14, 44, 29, 40, 28, 'oz', ['nut', 'plant', 'high_fat']),
  tahini: f('tahini', 'Tahini', 595, 17, 21, 54, 16, 16, 'tbsp', ['plant']),
  hummus: f('hummus', 'Hummus', 166, 8, 14, 10, 62, 31, 'tbsp', ['plant', 'legume']),

  broccoli: f('broccoli', 'Steamed broccoli', 35, 2.4, 7, 0.4, 91, 91, 'cup', ['veggie', 'plant']),
  spinach_cooked: f('spinach_cooked', 'Sautéed spinach', 23, 2.9, 3.8, 0.3, 180, 180, 'cup', ['veggie', 'plant']),
  mixed_greens: f('mixed_greens', 'Mixed green salad', 17, 1.5, 3, 0.2, 85, 85, 'cups (2)', ['veggie', 'plant']),
  asparagus: f('asparagus', 'Roasted asparagus', 22, 2.4, 4, 0.2, 134, 22, 'spear', ['veggie', 'plant']),
  bell_pepper: f('bell_pepper', 'Bell pepper', 26, 1, 6, 0.2, 119, 119, 'medium', ['veggie', 'plant']),
  cauliflower: f('cauliflower', 'Roasted cauliflower', 23, 1.8, 4.1, 0.5, 124, 124, 'cup', ['veggie', 'plant']),
  green_beans: f('green_beans', 'Green beans', 35, 1.8, 8, 0.1, 110, 110, 'cup', ['veggie', 'plant']),
  zucchini: f('zucchini', 'Grilled zucchini', 17, 1.2, 3, 0.3, 180, 180, 'cup', ['veggie', 'plant']),
  tomato: f('tomato', 'Tomato', 18, 0.9, 3.9, 0.2, 123, 123, 'medium', ['veggie', 'plant']),
  cucumber: f('cucumber', 'Cucumber', 15, 0.7, 3.6, 0.1, 150, 150, 'cup (sliced)', ['veggie', 'plant']),
  roasted_veggies: f('roasted_veggies', 'Roasted vegetables', 60, 1.5, 10, 2, 150, 150, 'cup', ['veggie', 'plant']),
  sauerkraut: f('sauerkraut', 'Sauerkraut', 19, 0.9, 4.3, 0.1, 142, 142, 'cup', ['veggie', 'plant']),

  whey_protein: f('whey_protein', 'Whey protein shake', 400, 80, 10, 5, 31, 31, 'scoop', ['dairy', 'animal']),
  plant_protein: f('plant_protein', 'Plant protein shake', 375, 75, 12, 4, 33, 33, 'scoop', ['plant']),
  pork_rinds: f('pork_rinds', 'Pork rinds', 544, 61, 0, 31, 28, 28, 'oz', ['meat', 'animal', 'pork', 'high_fat']),
  bulletproof_coffee: f('bulletproof_coffee', 'Bulletproof coffee', 231, 0.3, 0, 25, 100, 100, 'serving', ['dairy', 'animal']),
  dates: f('dates', 'Medjool dates', 277, 1.8, 75, 0.2, 48, 24, 'date', ['fruit', 'plant']),
  dark_chocolate: f('dark_chocolate', 'Dark chocolate (85%)', 598, 8, 46, 43, 28, 28, 'oz', ['plant']),
  rice_cake: f('rice_cake', 'Rice cakes', 387, 8, 81, 3, 18, 9, 'cake', ['grain']),
  tabbouleh: f('tabbouleh', 'Tabbouleh salad', 120, 3, 16, 6, 160, 160, 'cup', ['grain', 'gluten', 'plant']),
  tzatziki: f('tzatziki', 'Tzatziki sauce', 56, 3, 4, 3, 45, 15, 'tbsp', ['dairy', 'animal']),
  olives: f('olives', 'Olives', 115, 0.8, 6.3, 11, 30, 30, 'serving (6)', ['plant', 'fat']),
  sea_bass: f('sea_bass', 'Baked sea bass', 124, 24, 0, 2.6, 170, 28.35, 'oz', ['fish', 'animal']),
  hard_boiled_eggs: f('hard_boiled_eggs', 'Hard-boiled eggs', 155, 13, 1.1, 11, 100, 50, 'egg', ['egg', 'animal']),
};

export function computeMacros(food: FoodItemData, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein_g: Math.round(food.per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(food.per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(food.per100g.fat_g * factor * 10) / 10,
  };
}

export function formatPortionLabel(food: FoodItemData, grams: number, measurementSystem: 'metric' | 'us' = 'us'): string {
  if (measurementSystem === 'metric') {
    return `${Math.round(grams)}g`;
  }

  const units = grams / food.gramsPerUnit;

  if (food.unitLabel === 'large egg' || food.unitLabel === 'egg') {
    const count = Math.round(units);
    return count === 1 ? '1 egg' : `${count} eggs`;
  }

  if (food.unitLabel === 'strip') {
    const count = Math.round(units);
    return count === 1 ? '1 strip' : `${count} strips`;
  }

  if (food.unitLabel === 'stick') {
    const count = Math.round(units);
    return count === 1 ? '1 stick' : `${count} sticks`;
  }

  if (food.unitLabel === 'date') {
    const count = Math.round(units);
    return count === 1 ? '1 date' : `${count} dates`;
  }

  if (food.unitLabel === 'cake') {
    const count = Math.round(units);
    return count === 1 ? '1 cake' : `${count} cakes`;
  }

  if (food.unitLabel === 'tortilla' || food.unitLabel === 'pita' || food.unitLabel === 'spear') {
    const count = Math.round(units);
    return `${count} ${food.unitLabel}${count !== 1 ? 's' : ''}`;
  }

  if (food.unitLabel === 'medium' || food.unitLabel === 'half') {
    const rounded = roundToFraction(units);
    if (food.unitLabel === 'half') {
      return `${rounded} ${units <= 1 ? 'half' : 'halves'}`;
    }
    return `${rounded} ${food.unitLabel}`;
  }

  if (food.unitLabel === 'serving') {
    const rounded = roundToFraction(units);
    return `${rounded} serving${units > 1.1 ? 's' : ''}`;
  }

  if (food.unitLabel === 'oz') {
    const oz = Math.round(grams / 28.35);
    return `${oz} oz`;
  }

  if (food.unitLabel === 'tbsp') {
    const tbsp = roundToFraction(units);
    return `${tbsp} tbsp`;
  }

  if (food.unitLabel === 'scoop') {
    const count = roundToFraction(units);
    return `${count} scoop${units > 1.1 ? 's' : ''}`;
  }

  if (food.unitLabel.startsWith('cup') || food.unitLabel.startsWith('cups')) {
    const cups = roundToFraction(units);
    if (food.unitLabel.includes('dry')) {
      return `${cups} cup${units > 1.1 ? 's' : ''} (dry)`;
    }
    return `${cups} cup${units > 1.1 ? 's' : ''}`;
  }

  if (food.unitLabel.includes('oz') && food.unitLabel !== 'oz') {
    const rounded = roundToFraction(units);
    return `${rounded} ${food.unitLabel}`;
  }

  const rounded = roundToFraction(units);
  return `${rounded} ${food.unitLabel}`;
}

function roundToFraction(val: number): string {
  if (val < 0.2) return '⅛';
  if (val < 0.3) return '¼';
  if (val < 0.4) return '⅓';
  if (val < 0.6) return '½';
  if (val < 0.7) return '⅔';
  if (val < 0.85) return '¾';
  if (val < 1.1) return '1';

  const whole = Math.floor(val);
  const frac = val - whole;

  if (frac < 0.1) return `${whole}`;
  if (frac < 0.3) return `${whole}¼`;
  if (frac < 0.4) return `${whole}⅓`;
  if (frac < 0.6) return `${whole}½`;
  if (frac < 0.7) return `${whole}⅔`;
  if (frac < 0.85) return `${whole}¾`;
  return `${whole + 1}`;
}
