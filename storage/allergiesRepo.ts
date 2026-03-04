import { saveData, loadData, STORAGE_KEYS } from '../services/storage';
import { UserAllergy } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function normalizeAllergy(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export async function getAllergies(): Promise<UserAllergy[]> {
  const stored = await loadData<UserAllergy[]>(STORAGE_KEYS.USER_ALLERGIES);
  return stored ?? [];
}

export async function setAllergies(list: UserAllergy[]): Promise<void> {
  await saveData(STORAGE_KEYS.USER_ALLERGIES, list);
}

export async function addAllergy(name: string): Promise<UserAllergy> {
  const list = await getAllergies();
  const normalized = normalizeAllergy(name);
  const exists = list.some((a) => a.normalized === normalized);
  if (exists) {
    return list.find((a) => a.normalized === normalized)!;
  }
  const now = Date.now();
  const allergy: UserAllergy = {
    id: generateId(),
    name: name.trim(),
    normalized,
    createdAt: now,
    updatedAt: now,
  };
  list.push(allergy);
  await setAllergies(list);
  return allergy;
}

export async function removeAllergy(id: string): Promise<void> {
  const list = await getAllergies();
  const next = list.filter((a) => a.id !== id);
  await setAllergies(next);
}

export async function updateAllergy(id: string, name: string): Promise<UserAllergy | null> {
  const list = await getAllergies();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const normalized = normalizeAllergy(name);
  const exists = list.some((a) => a.id !== id && a.normalized === normalized);
  if (exists) return null;
  const now = Date.now();
  const updated: UserAllergy = {
    ...list[idx],
    name: name.trim(),
    normalized,
    updatedAt: now,
  };
  list[idx] = updated;
  await setAllergies(list);
  return updated;
}
