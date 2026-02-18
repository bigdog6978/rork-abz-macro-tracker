import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryChecklist } from '../utils/grocery/types';

const PREFIX = 'abz_grocery_checklist_';

export async function loadChecklist(planId: string): Promise<GroceryChecklist> {
  try {
    const data = await AsyncStorage.getItem(`${PREFIX}${planId}`);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.log('[groceryRepo] Error loading checklist:', err);
    return {};
  }
}

export async function saveChecklist(
  planId: string,
  checklist: GroceryChecklist
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${planId}`, JSON.stringify(checklist));
    console.log('[groceryRepo] Saved checklist for plan:', planId);
  } catch (err) {
    console.log('[groceryRepo] Error saving checklist:', err);
  }
}
