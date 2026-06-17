import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import type { View } from 'react-native';
import { PHYSIQMACROS_FB_GROUP_URL } from './shareCaption';

async function loadSharing() {
  try {
    return await import('expo-sharing');
  } catch (err) {
    if (__DEV__) console.warn('[shareProgress] expo-sharing unavailable', err);
    return null;
  }
}

async function loadMediaLibrary() {
  try {
    return await import('expo-media-library');
  } catch (err) {
    if (__DEV__) console.warn('[shareProgress] expo-media-library unavailable', err);
    return null;
  }
}

async function loadViewShot() {
  try {
    return await import('react-native-view-shot');
  } catch (err) {
    if (__DEV__) console.warn('[shareProgress] react-native-view-shot unavailable', err);
    return null;
  }
}

export async function captureShareCard(ref: React.RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  const viewShot = await loadViewShot();
  if (!viewShot) return null;
  try {
    const uri = await viewShot.captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  } catch (err) {
    console.warn('[shareProgress] capture failed', err);
    return null;
  }
}

export async function shareImageUri(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Sharing = await loadSharing();
  if (!Sharing) return false;
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return false;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your progress' });
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[shareProgress] share failed', err);
    return false;
  }
}

export async function copyCaptionToClipboard(caption: string): Promise<void> {
  await Clipboard.setStringAsync(caption);
}

export async function openPhysiqMacrosGroup(): Promise<void> {
  await Linking.openURL(PHYSIQMACROS_FB_GROUP_URL);
}

export async function saveImageToPhotos(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const MediaLibrary = await loadMediaLibrary();
  if (!MediaLibrary) return false;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await MediaLibrary.saveToLibraryAsync(uri);
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[shareProgress] save to photos failed', err);
    return false;
  }
}
