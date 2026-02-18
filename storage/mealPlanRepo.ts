import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedMealPlan } from '../types';

const KEYS = {
  savedPlans: 'abz_saved_meal_plans',
  activePlanId: 'abz_active_meal_plan_id',
  schemaVersion: 'abz_meal_plan_schema_version',
};

const CURRENT_SCHEMA_VERSION = 1;

let schemaChecked = false;

async function ensureSchema(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(KEYS.schemaVersion);
    const current = version ? parseInt(version, 10) : 0;
    if (current < CURRENT_SCHEMA_VERSION) {
      await AsyncStorage.setItem(
        KEYS.schemaVersion,
        String(CURRENT_SCHEMA_VERSION)
      );
      console.log('[mealPlanRepo] Schema version set to', CURRENT_SCHEMA_VERSION);
    }
  } catch (err) {
    console.log('[mealPlanRepo] Schema check error:', err);
  }
}

async function checkSchema(): Promise<void> {
  if (!schemaChecked) {
    await ensureSchema();
    schemaChecked = true;
  }
}

export async function getAllSavedMealPlans(): Promise<SavedMealPlan[]> {
  await checkSchema();
  try {
    const data = await AsyncStorage.getItem(KEYS.savedPlans);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.log('[mealPlanRepo] Error reading saved plans:', err);
    return [];
  }
}

export async function saveMealPlan(plan: SavedMealPlan): Promise<void> {
  try {
    const plans = await getAllSavedMealPlans();
    const filtered = plans.filter((p) => p.id !== plan.id);
    const updated = [plan, ...filtered];
    await AsyncStorage.setItem(KEYS.savedPlans, JSON.stringify(updated));
    console.log('[mealPlanRepo] Saved plan:', plan.name);
  } catch (err) {
    console.log('[mealPlanRepo] Error saving plan:', err);
  }
}

export async function getActiveMealPlan(): Promise<SavedMealPlan | null> {
  await checkSchema();
  try {
    const activeId = await AsyncStorage.getItem(KEYS.activePlanId);
    if (!activeId) return null;
    const plans = await getAllSavedMealPlans();
    return plans.find((p) => p.id === activeId) ?? null;
  } catch (err) {
    console.log('[mealPlanRepo] Error reading active plan:', err);
    return null;
  }
}

export async function setActiveMealPlan(planId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.activePlanId, planId);
    console.log('[mealPlanRepo] Set active plan:', planId);
  } catch (err) {
    console.log('[mealPlanRepo] Error setting active plan:', err);
  }
}

export async function deleteMealPlan(planId: string): Promise<void> {
  try {
    const plans = await getAllSavedMealPlans();
    const updated = plans.filter((p) => p.id !== planId);
    await AsyncStorage.setItem(KEYS.savedPlans, JSON.stringify(updated));

    const activeId = await AsyncStorage.getItem(KEYS.activePlanId);
    if (activeId === planId) {
      await AsyncStorage.removeItem(KEYS.activePlanId);
      console.log('[mealPlanRepo] Cleared active plan (deleted)');
    }
    console.log('[mealPlanRepo] Deleted plan:', planId);
  } catch (err) {
    console.log('[mealPlanRepo] Error deleting plan:', err);
  }
}

export async function updateMealPlan(
  planId: string,
  updates: Partial<SavedMealPlan>
): Promise<void> {
  try {
    const plans = await getAllSavedMealPlans();
    const idx = plans.findIndex((p) => p.id === planId);
    if (idx === -1) {
      console.log('[mealPlanRepo] Plan not found for update:', planId);
      return;
    }
    plans[idx] = { ...plans[idx], ...updates, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEYS.savedPlans, JSON.stringify(plans));
    console.log('[mealPlanRepo] Updated plan:', planId);
  } catch (err) {
    console.log('[mealPlanRepo] Error updating plan:', err);
  }
}

export async function clearActivePlan(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.activePlanId);
    console.log('[mealPlanRepo] Cleared active plan');
  } catch (err) {
    console.log('[mealPlanRepo] Error clearing active plan:', err);
  }
}
