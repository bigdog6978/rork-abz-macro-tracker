import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type ExpoAudioModule = typeof import('expo-audio');
type AudioPlayerInstance = import('expo-audio').AudioPlayer;

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
let clickPlayer: AudioPlayerInstance | null = null;
let preloadPromise: Promise<void> | null = null;
let lastClickAt = 0;

let audioModule: ExpoAudioModule | null = null;
let audioModuleUnavailable = false;

/**
 * Lazily resolves `expo-audio`. Wrapped in try/catch so a missing or unbuilt
 * native module can never throw at module-load time (which would make any
 * component importing this file render as `undefined`). Falls back to
 * haptics-only when audio is unavailable.
 */
function loadAudioModule(): ExpoAudioModule | null {
  if (audioModule || audioModuleUnavailable) return audioModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audioModule = require('expo-audio') as ExpoAudioModule;
  } catch {
    audioModuleUnavailable = true;
    audioModule = null;
  }
  return audioModule;
}

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
    const audio = loadAudioModule();
    if (!audio) return;
    try {
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      const player = audio.createAudioPlayer(require('../assets/sounds/ui-click.wav'));
      player.volume = SOUND_VOLUME;
      clickPlayer = player;
    } catch {
      clickPlayer = null;
    }
  })();

  return preloadPromise;
}

async function playClickSound(intent: FeedbackIntent): Promise<void> {
  if (Platform.OS === 'web' || !soundEffectsEnabled) return;

  const now = Date.now();
  if (now - lastClickAt < CLICK_DEBOUNCE_MS) return;
  lastClickAt = now;

  if (!clickPlayer) {
    await preloadInteractionSounds();
  }
  const player = clickPlayer;
  if (!player) return;

  try {
    const volume =
      intent === 'confirm'
        ? CONFIRM_SOUND_VOLUME
        : intent === 'destructive'
          ? MUTED_SOUND_VOLUME
          : SOUND_VOLUME;
    player.volume = volume;
    await player.seekTo(0);
    player.play();
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
