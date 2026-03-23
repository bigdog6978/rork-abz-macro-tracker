import { saveData, loadData, STORAGE_KEYS } from '../services/storage';
import { DislikedFood } from '../types';

export async function getDislikedFoods(): Promise<DislikedFood[]> {
  const stored = await loadData<DislikedFood[]>(STORAGE_KEYS.DISLIKED_FOODS);
  return stored ?? [];
}

export async function setDislikedFoods(list: DislikedFood[]): Promise<void> {
  await saveData(STORAGE_KEYS.DISLIKED_FOODS, list);
}

export async function addDislikedFood(foodId: string, name: string): Promise<void> {
  const list = await getDislikedFoods();
  if (list.some((f) => f.foodId === foodId)) return;
  list.push({ id: `dislike_${foodId}`, foodId, name, createdAt: Date.now() });
  await setDislikedFoods(list);
}

export async function removeDislikedFood(foodId: string): Promise<void> {
  const list = await getDislikedFoods();
  await setDislikedFoods(list.filter((f) => f.foodId !== foodId));
}
