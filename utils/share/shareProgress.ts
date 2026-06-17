import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Linking, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { View } from 'react-native';
import { PHYSIQMACROS_FB_GROUP_URL } from './shareCaption';

export async function captureShareCard(ref: React.RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  try {
    const uri = await captureRef(ref, {
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
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your progress' });
  return true;
}

export async function copyCaptionToClipboard(caption: string): Promise<void> {
  await Clipboard.setStringAsync(caption);
}

export async function openPhysiqMacrosGroup(): Promise<void> {
  await Linking.openURL(PHYSIQMACROS_FB_GROUP_URL);
}

export async function saveImageToPhotos(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
