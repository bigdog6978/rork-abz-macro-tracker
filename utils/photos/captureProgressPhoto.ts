import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export type PhotoCaptureSource = 'camera' | 'library';

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === 'granted') return true;
  Alert.alert(
    'Camera access needed',
    'Allow camera access in Settings to take progress photos.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

async function ensureLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;
  Alert.alert(
    'Photo library access needed',
    'Allow photo library access in Settings to choose progress photos.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

export async function captureProgressPhoto(source: PhotoCaptureSource): Promise<string | null> {
  if (source === 'camera') {
    if (Platform.OS !== 'web') {
      const ok = await ensureCameraPermission();
      if (!ok) return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  if (Platform.OS !== 'web') {
    const ok = await ensureLibraryPermission();
    if (!ok) return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
