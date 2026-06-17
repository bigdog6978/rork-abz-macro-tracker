import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { ProgressPhoto } from '../features/progress/photoTypes';
import { STORAGE_KEYS, loadData, saveData } from '../services/storage';
import { toDateKey } from '../utils/dateKey';

const PHOTOS_DIR = `${documentDirectory ?? ''}progress-photos/`;

function sortPhotos(photos: ProgressPhoto[]): ProgressPhoto[] {
  return [...photos].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

async function readAll(): Promise<ProgressPhoto[]> {
  const data = await loadData<ProgressPhoto[]>(STORAGE_KEYS.PROGRESS_PHOTOS);
  return sortPhotos(data ?? []);
}

async function writeAll(photos: ProgressPhoto[]): Promise<void> {
  await saveData(STORAGE_KEYS.PROGRESS_PHOTOS, sortPhotos(photos));
}

export async function ensurePhotosDirectory(): Promise<void> {
  if (!documentDirectory) return;
  const info = await getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

export async function persistPhotoFile(sourceUri: string, photoId: string): Promise<string> {
  await ensurePhotosDirectory();
  const ext = sourceUri.includes('.png') ? 'png' : 'jpg';
  const dest = `${PHOTOS_DIR}${photoId}.${ext}`;
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deletePhotoFile(fileUri: string): Promise<void> {
  try {
    const info = await getInfoAsync(fileUri);
    if (info.exists) {
      await deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('[photosRepo] deletePhotoFile failed:', err);
  }
}

export async function getPhotos(userId: string): Promise<ProgressPhoto[]> {
  const all = await readAll();
  return all.filter((p) => p.userId === userId);
}

export async function getBaselinePhoto(userId: string): Promise<ProgressPhoto | null> {
  const photos = await getPhotos(userId);
  const baseline = photos.find((p) => p.isBaseline);
  return baseline ?? (photos.length > 0 ? photos[0] : null);
}

export async function getLatestPhoto(userId: string): Promise<ProgressPhoto | null> {
  const photos = await getPhotos(userId);
  return photos.length > 0 ? photos[photos.length - 1] : null;
}

export async function upsertPhoto(photo: ProgressPhoto): Promise<ProgressPhoto> {
  const dateKey = photo.dateKey || toDateKey(new Date(photo.recordedAt));
  const withKey = { ...photo, dateKey };
  const all = await readAll();
  const idx = all.findIndex((p) => p.id === withKey.id);
  let updated: ProgressPhoto[];
  if (idx >= 0) {
    updated = [...all];
    updated[idx] = withKey;
  } else {
    updated = [...all, withKey];
  }
  await writeAll(updated);
  return withKey;
}

export async function addPhoto(
  userId: string,
  sourceUri: string,
  options?: { isBaseline?: boolean; note?: string; dateKey?: string }
): Promise<ProgressPhoto> {
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fileUri = await persistPhotoFile(sourceUri, id);
  const dateKey = options?.dateKey ?? toDateKey(new Date());
  const existing = await getPhotos(userId);
  const isFirst = existing.length === 0;
  const photo: ProgressPhoto = {
    id,
    userId,
    dateKey,
    recordedAt: new Date().toISOString(),
    fileUri,
    isBaseline: options?.isBaseline ?? isFirst,
    note: options?.note,
  };
  if (photo.isBaseline) {
    const cleared = (await readAll()).map((p) =>
      p.userId === userId ? { ...p, isBaseline: false } : p
    );
    await writeAll(cleared);
  }
  return upsertPhoto(photo);
}

export async function setBaselinePhoto(userId: string, photoId: string): Promise<void> {
  const all = await readAll();
  const updated = all.map((p) => {
    if (p.userId !== userId) return p;
    return { ...p, isBaseline: p.id === photoId };
  });
  await writeAll(updated);
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  const all = await readAll();
  const target = all.find((p) => p.id === photoId && p.userId === userId);
  if (target) {
    await deletePhotoFile(target.fileUri);
  }
  await writeAll(all.filter((p) => !(p.id === photoId && p.userId === userId)));
}

/** Test helper */
export async function clearAllPhotos(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.PROGRESS_PHOTOS);
}
