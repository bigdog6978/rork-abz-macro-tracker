import { MealSlot, MealSuggestion, FoodCategory } from '../../types';
import { FOODS } from '../../constants/foodDatabase';
import { GroceryList, GroceryCategory, GroceryItem, GroceryCategoryGroup } from './types';

export interface GroceryDayMeals {
  dayLabel: string;
  meals: MealSlot[];
}

const CATEGORY_MAP: Record<FoodCategory, GroceryCategory> = {
  protein: 'Protein',
  carb: 'Carbs',
  fat: 'Fats',
  fruit: 'Produce',
  veggie: 'Produce',
  mixed: 'Other',
};

const CATEGORY_ORDER: GroceryCategory[] = ['Protein', 'Produce', 'Carbs', 'Fats', 'Other'];

function resolveGroceryCategory(food: MealSuggestion): GroceryCategory {
  const dbItem = FOODS[food.foodId];
  if (dbItem) {
    if (dbItem.tags.includes('veggie') || dbItem.tags.includes('fruit')) return 'Produce';
    if (dbItem.tags.includes('meat') || dbItem.tags.includes('fish') || dbItem.tags.includes('egg') || dbItem.tags.includes('dairy')) return 'Protein';
    if (dbItem.tags.includes('grain') || dbItem.tags.includes('starch') || dbItem.tags.includes('legume')) return 'Carbs';
    if (dbItem.tags.includes('nut') || dbItem.tags.includes('fat')) return 'Fats';
  }
  return CATEGORY_MAP[food.category] ?? 'Other';
}

function resolveUnit(food: MealSuggestion): { amount: number; unit: string } {
  const dbItem = FOODS[food.foodId];
  if (dbItem) {
    const amount = food.portionGrams / dbItem.gramsPerUnit;
    const roundedAmount = Math.round(amount * 10) / 10;
    return { amount: roundedAmount, unit: dbItem.unitLabel };
  }
  return { amount: food.portionGrams, unit: 'g' };
}

function normalizeKey(name: string, unit: string): string {
  return `${name.toLowerCase().trim()}::${unit.toLowerCase().trim()}`;
}

export function generateGroceryList(
  meals: MealSlot[],
  planId: string,
  dayLabel?: string
): GroceryList {
  return generateGroceryListFromDays([{ dayLabel: dayLabel ?? 'Plan', meals }], planId);
}

export function generateGroceryListFromDays(
  dayMeals: GroceryDayMeals[],
  planId: string
): GroceryList {
  console.log('[GroceryEngine] Generating grocery list for', dayMeals.length, 'days');

  const itemMap = new Map<string, GroceryItem & { categoryName: GroceryCategory }>();

  for (const day of dayMeals) {
    for (const meal of day.meals) {
      for (const food of meal.suggestions) {
        const category = resolveGroceryCategory(food);
        const { amount, unit } = resolveUnit(food);
        const key = normalizeKey(food.name, unit);
        const sourceLabel = `${day.dayLabel} · ${meal.name}`;

        const existing = itemMap.get(key);
        if (existing) {
          existing.totalAmount = Math.round((existing.totalAmount + amount) * 10) / 10;
          if (!existing.sources.includes(sourceLabel)) {
            existing.sources.push(sourceLabel);
          }
        } else {
          itemMap.set(key, {
            key,
            name: food.name,
            totalAmount: Math.round(amount * 10) / 10,
            unit,
            sources: [sourceLabel],
            checked: false,
            categoryName: category,
          });
        }
      }
    }
  }

  const grouped = new Map<GroceryCategory, GroceryItem[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }

  for (const item of itemMap.values()) {
    const list = grouped.get(item.categoryName) ?? [];
    const { categoryName: _, ...groceryItem } = item;
    list.push(groceryItem);
    grouped.set(item.categoryName, list);
  }

  const categories: GroceryCategoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat) ?? [];
    if (items.length > 0) {
      items.sort((a, b) => a.name.localeCompare(b.name));
      categories.push({ name: cat, items });
    }
  }

  console.log('[GroceryEngine] Generated', itemMap.size, 'items across', categories.length, 'categories');

  return {
    planId,
    createdAt: new Date().toISOString(),
    categories,
  };
}

export function formatGroceryListAsText(list: GroceryList): string {
  const lines: string[] = ['Grocery List', ''];

  for (const category of list.categories) {
    lines.push(`--- ${category.name} ---`);
    for (const item of category.items) {
      const checkMark = item.checked ? '[x]' : '[ ]';
      lines.push(`${checkMark} ${item.name} - ${formatAmount(item.totalAmount)} ${item.unit}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function formatAmount(amount: number): string {
  if (amount === Math.floor(amount)) return String(amount);
  return amount.toFixed(1);
}
