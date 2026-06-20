import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export type FeedbackIntent =
  | 'tap'
  | 'select'
  | 'confirm'
  | 'success'
  | 'warning'
  | 'destructive';

const PRESS_SCALE: Record<FeedbackIntent, number> = {
  tap: 0.96,
  select: 0.97,
  confirm: 0.94,
  success: 1,
  warning: 1,
  destructive: 0.95,
};

const CLICK_DEBOUNCE_MS = 80;
const SOUND_VOLUME = 0.35;
const CONFIRM_SOUND_VOLUME = 0.42;
const MUTED_SOUND_VOLUME = 0.22;

let soundEffectsEnabled = true;
let clickSound: Audio.Sound | null = null;
let preloadPromise: Promise<void> | null = null;
let lastClickAt = 0;

export function setSoundEffectsEnabled(enabled: boolean): void {
  soundEffectsEnabled = enabled;
}

export function getSoundEffectsEnabled(): boolean {
  return soundEffectsEnabled;
}

export function getPressScale(intent: FeedbackIntent): number {
  return PRESS_SCALE[intent];
}

export async function preloadInteractionSounds(): Promise<void> {
  if (Platform.OS === 'web' || preloadPromise) {
    return preloadPromise ?? Promise.resolve();
  }

  preloadPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/ui-click.wav'),
        { volume: SOUND_VOLUME, shouldPlay: false }
      );
      clickSound = sound;
    } catch {
      clickSound = null;
    }
  })();

  return preloadPromise;
}

async function playClickSound(intent: FeedbackIntent): Promise<void> {
  if (Platform.OS === 'web' || !soundEffectsEnabled) return;

  const now = Date.now();
  if (now - lastClickAt < CLICK_DEBOUNCE_MS) return;
  lastClickAt = now;

  if (!clickSound) {
    await preloadInteractionSounds();
  }
  if (!clickSound) return;

  try {
    const volume =
      intent === 'confirm'
        ? CONFIRM_SOUND_VOLUME
        : intent === 'destructive'
          ? MUTED_SOUND_VOLUME
          : SOUND_VOLUME;
    await clickSound.setVolumeAsync(volume);
    await clickSound.setPositionAsync(0);
    await clickSound.replayAsync();
  } catch {
    // Ignore playback errors — haptics still fire.
  }
}

function playHaptic(intent: FeedbackIntent): void {
  if (Platform.OS === 'web') return;

  switch (intent) {
    case 'tap':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'select':
      void Haptics.selectionAsync();
      break;
    case 'confirm':
    case 'destructive':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}

/** Fire haptic + optional UI click. Call on press-down for buttons. */
export function playFeedback(intent: FeedbackIntent): void {
  playHaptic(intent);
  if (intent === 'success' || intent === 'warning') return;
  void playClickSound(intent);
}

let reduceMotionCached = false;
let reduceMotionListenerAttached = false;

export async function initReduceMotionListener(): Promise<boolean> {
  try {
    reduceMotionCached = await AccessibilityInfo.isReduceMotionEnabled();
    if (!reduceMotionListenerAttached) {
      reduceMotionListenerAttached = true;
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        reduceMotionCached = enabled;
      });
    }
  } catch {
    reduceMotionCached = false;
  }
  return reduceMotionCached;
}

export function isReduceMotionEnabled(): boolean {
  return reduceMotionCached;
}
