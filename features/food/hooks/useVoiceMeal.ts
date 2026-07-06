/**
 * Voice meal capture state for the Add Food screen: speech-recognition
 * lifecycle, permission flow, transcript → resolved-draft building, and the
 * review-modal state. Logic moved verbatim from app/add-food.tsx.
 *
 * The screen supplies `onWillStart` to close the keyboard / suggestions /
 * scanner before listening begins (cross-domain concerns stay in the screen).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { parseMealVoiceTranscript } from '../mealVoiceParser';
import {
  resolveVoiceItems,
  type VoiceResolvedItem,
  type VoiceUnresolvedItem,
} from '../voiceResolver';

export type VoiceMealDraft = {
  transcript: string;
  items: VoiceResolvedItem[];
  unresolved: VoiceUnresolvedItem[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

const BENIGN_SPEECH_ERRORS = new Set(['aborted', 'no-speech', 'interrupted', 'not-allowed']);

function canUseVoiceMealCapture(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }

  try {
    return typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function'
      ? ExpoSpeechRecognitionModule.isRecognitionAvailable()
      : false;
  } catch {
    return false;
  }
}

export function useVoiceMeal({ onWillStart }: { onWillStart?: () => void } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceMealDraft, setVoiceMealDraft] = useState<VoiceMealDraft | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [dismissedUnresolvedIds, setDismissedUnresolvedIds] = useState<string[]>([]);

  const voiceRequestIdRef = useRef(0);
  const voiceUserIntentRef = useRef(false);

  const voiceMealAvailable = useMemo(() => canUseVoiceMealCapture(), []);

  const buildVoiceMealDraft = useCallback(async (transcript: string) => {
    const parsedItems = parseMealVoiceTranscript(transcript);
    if (parsedItems.length === 0) {
      Alert.alert(
        'No meal detected',
        'Try speaking a full meal like "2 eggs, 1 avocado, 6 oz orange juice."'
      );
      return;
    }

    const requestId = Date.now();
    voiceRequestIdRef.current = requestId;
    setIsVoiceProcessing(true);

    try {
      // All items resolved through the same unified resolver used by typed search
      const results = await resolveVoiceItems(parsedItems);
      if (voiceRequestIdRef.current !== requestId) return;

      const items: VoiceResolvedItem[] = [];
      const unresolved: VoiceUnresolvedItem[] = [];
      for (const r of results) {
        if (r.status === 'resolved') items.push(r.item);
        else unresolved.push(r.item);
      }

      const totals = items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.macros.calories,
          protein_g: Math.round((acc.protein_g + item.macros.protein_g) * 10) / 10,
          carbs_g: Math.round((acc.carbs_g + item.macros.carbs_g) * 10) / 10,
          fat_g: Math.round((acc.fat_g + item.macros.fat_g) * 10) / 10,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );

      setVoiceMealDraft({ transcript, items, unresolved, totals });
      setDismissedUnresolvedIds([]);
      setVoiceModalVisible(true);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          unresolved.length === 0
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    } finally {
      if (voiceRequestIdRef.current === requestId) {
        setIsVoiceProcessing(false);
      }
    }
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    voiceUserIntentRef.current = false;
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim() ?? '';
    if (!transcript) return;
    setVoiceTranscript(transcript);

    if (event.isFinal) {
      void buildVoiceMealDraft(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setIsVoiceProcessing(false);

    if (BENIGN_SPEECH_ERRORS.has(event.error)) {
      voiceUserIntentRef.current = false;
      return;
    }

    if (!voiceUserIntentRef.current) {
      return;
    }

    voiceUserIntentRef.current = false;
    Alert.alert('Voice entry unavailable', event.message || 'Speech recognition failed. Please try again.');
  });

  useEffect(() => {
    return () => {
      voiceUserIntentRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Ignore missing native module during teardown.
      }
    };
  }, []);

  const handleStartVoiceMeal = useCallback(async () => {
    if (!voiceMealAvailable) {
      Alert.alert(
        'Voice meal not available',
        'Speech meal entry requires a fresh development build or production build with the speech-recognition native module included.'
      );
      return;
    }

    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            'Microphone access needed',
            'To speak meals into your food log, turn on microphone and speech recognition access for this app in Settings.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Microphone access needed',
            'Microphone and speech recognition permissions are used to speak meals into your food log.'
          );
        }
        return;
      }

      setVoiceMealDraft(null);
      setVoiceModalVisible(false);
      setVoiceTranscript('');
      setIsVoiceProcessing(false);
      setDismissedUnresolvedIds([]);

      onWillStart?.();

      voiceUserIntentRef.current = true;
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: [
          'eggs',
          'avocado',
          'orange juice',
          'chicken breast',
          'greek yogurt',
          'protein shake',
        ],
      });
    } catch (err) {
      console.log('[AddFood] Voice start error:', err);
      Alert.alert('Voice entry unavailable', 'Unable to start speech recognition on this device.');
    }
  }, [isListening, onWillStart, voiceMealAvailable]);

  const handleCancelVoice = useCallback(() => {
    voiceUserIntentRef.current = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // native module may not be available
    }
    setIsListening(false);
    setIsVoiceProcessing(false);
  }, []);

  return {
    voiceMealAvailable,
    isListening,
    voiceTranscript,
    isVoiceProcessing,
    voiceMealDraft,
    setVoiceMealDraft,
    voiceModalVisible,
    setVoiceModalVisible,
    dismissedUnresolvedIds,
    setDismissedUnresolvedIds,
    handleStartVoiceMeal,
    handleCancelVoice,
  };
}
