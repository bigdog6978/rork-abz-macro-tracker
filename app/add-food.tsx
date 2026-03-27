import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Check, Search, Clock, Pencil, X, ChevronRight, Scan, Bookmark, Mic, LoaderCircle } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { NormalizedFood } from '../features/food/types';
import * as foodService from '../features/food/foodService';
import * as foodsRepo from '../src/data/foodsRepo';
import QuantityPillsCompact from '../components/ui/QuantityPillsCompact';
import QuantityCallout, { type CalloutReason } from '../components/ui/QuantityCallout';
import DensityModal from '../components/ui/DensityModal';
import VoiceRecordingSheet from '../components/ui/VoiceRecordingSheet';
import BarcodeScannerPanel from '../components/ui/BarcodeScannerPanel';
import type { UnitKind, UnitId } from '../src/lib/units';
import { getPreferredServingUnit } from '../storage/userSettingsRepo';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  detectUnitFromName,
  pluralizeUnit,
} from '../features/food/servingDefaults';
import { parseMealVoiceTranscript } from '../features/food/mealVoiceParser';
import { parseTextInput } from '../features/food/inputParser';
import {
  resolveVoiceItem,
  resolveVoiceItems,
  scoreConfidence,
  type VoiceResolvedItem,
  type VoiceUnresolvedItem,
} from '../features/food/voiceResolver';
import { Radius } from '../theme/tokens';

const DEBOUNCE_MS = 300;
const HEADER_BUTTON_SIZE = 44;

type VoiceMealDraft = {
  transcript: string;
  items: VoiceResolvedItem[];
  unresolved: VoiceUnresolvedItem[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

function getSearchErrorMessage(
  searchStatus: string,
  errorCode?: string,
  errorDetail?: string
): string {
  if (searchStatus === 'rate_limited') {
    return 'Search temporarily rate-limited. Try again in a minute.';
  }
  if (searchStatus === 'error') {
    let msg: string;
    switch (errorCode) {
      case 'USDA_API_KEY_MISSING':
        msg = 'USDA key not configured for this build. You can still enter macros manually.';
        break;
      case 'API_KEY_REJECTED':
        msg = 'API key rejected. Check your USDA FoodData Central key.';
        break;
      case 'NETWORK_TIMEOUT':
        msg = 'Network issue reaching USDA API. Check your connection.';
        break;
      case 'NETWORK_ERROR':
        msg = 'Network error reaching USDA API. Check your connection.';
        break;
      case 'INVALID_ENDPOINT':
        msg = 'Invalid USDA API configuration.';
        break;
      case 'RATE_LIMIT':
        msg = 'Search temporarily rate-limited. Try again in a minute.';
        break;
      default:
        msg = 'Search unavailable. You can still enter macros manually.';
    }
    if (errorDetail && errorDetail.length > 0 && errorDetail.length < 150) {
      return `${msg} (USDA: ${errorDetail})`;
    }
    return msg;
  }
  return 'No results found';
}


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

export default function AddFoodScreen() {
  const { addEntry, addEntries } = useDailyLog();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    fromBarcode?: string;
    dateKey?: string;
    sourceContext?: string;
  }>();
  const dateKeyParam = typeof params.dateKey === 'string' ? params.dateKey : undefined;
  const isFromSavedFoods = params.sourceContext === 'saved-foods';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NormalizedFood[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error' | 'rate_limited'>('idle');
  const [searchErrorCode, setSearchErrorCode] = useState<string | undefined>();
  const [searchErrorDetail, setSearchErrorDetail] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NormalizedFood | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [name, setName] = useState('');
  const [unitKind, setUnitKind] = useState<UnitKind>('mass');
  const [unitId, setUnitId] = useState<UnitId>('g');
  const [quantityInput, setQuantityInput] = useState('100');
  const [unitLabel, setUnitLabel] = useState<string>('egg');
  const [servingWeightG, setServingWeightG] = useState<number>(50);
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [scalingReason, setScalingReason] = useState<CalloutReason | null>(null);
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerViewportWidth, setScannerViewportWidth] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceMealDraft, setVoiceMealDraft] = useState<VoiceMealDraft | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [dismissedUnresolvedIds, setDismissedUnresolvedIds] = useState<string[]>([]);

  const [recentFoods, setRecentFoods] = useState<
    { food: NormalizedFood; lastServingGrams: number }[]
  >([]);
  const [savedFoods, setSavedFoods] = useState<NormalizedFood[]>([]);

  type ParsedInput = { quantity: number; unitId: UnitId; unitKind: UnitKind; foodQuery: string };
  const [parsedInput, setParsedInput] = useState<ParsedInput | null>(null);
  const [textResolvedItem, setTextResolvedItem] = useState<VoiceResolvedItem | null>(null);
  const [isResolvingText, setIsResolvingText] = useState(false);
  const [showOtherResults, setShowOtherResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRequestIdRef = useRef(0);
  // Ref mirrors parsedInput state for synchronous reads inside callbacks
  const parsedInputRef = useRef<ParsedInput | null>(null);
  const scannerAnim = useRef(new Animated.Value(0)).current;
  const voiceRequestIdRef = useRef(0);
  const voiceUserIntentRef = useRef(false);
  const computedMacrosRef = useRef<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);

  const apiAvailable = useMemo(() => foodService.isApiAvailable(), []);
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

  useEffect(() => {
    foodService
      .getRecentFoodsList()
      .then(setRecentFoods)
      .catch((err) => console.log('[AddFood] Error loading recents:', err));
  }, []);

  useEffect(() => {
    if (isFromSavedFoods) {
      setSaveToLibrary(false);
    }
  }, [isFromSavedFoods]);

  useEffect(() => {
    foodsRepo
      .getSavedFoods()
      .then((local) => local.map(foodsRepo.localFoodToNormalizedFood))
      .then(setSavedFoods)
      .catch((err) => console.log('[AddFood] Error loading saved foods:', err));
  }, [params.fromBarcode]);

  const animateScanner = useCallback(
    (toValue: number, onComplete?: () => void) => {
      Animated.timing(scannerAnim, {
        toValue,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onComplete?.();
      });
    },
    [scannerAnim]
  );

  useEffect(() => {
    getPreferredServingUnit()
      .then((unit) => {
        if (unit === 'oz') {
          setUnitKind('mass');
          setUnitId('oz');
          setQuantityInput('3.5');
        }
      })
      .catch((err) => console.log('[AddFood] Error loading unit pref:', err));
  }, []);

  const loadFoodIntoForm = useCallback(async (id: string) => {
    try {
      const local = await foodsRepo.getFoodById(id);
      if (!local) return;

      const norm = foodsRepo.localFoodToNormalizedFood(local);
      setSelectedFood(norm);
      setName(norm.name);
      setQuery(norm.name);
      setShowSuggestions(false);
      setIsCustomized(false);
      setScannerOpen(false);
      animateScanner(0);

      const detected = detectUnitFromName(norm.name);
      const savedUnit = local.unitLabel && local.servingWeightG
        ? { unitLabel: local.unitLabel, servingWeightG: local.servingWeightG }
        : null;
      const savedVolumeMl =
        typeof local.servingVolumeMl === 'number' && local.servingVolumeMl > 0
          ? local.servingVolumeMl
          : null;
      const useUnits = !!(savedUnit || detected);
      const unitConfig = savedUnit ?? detected;
      const foodWithServing = useUnits && unitConfig
        ? { ...norm, servingWeightGrams: unitConfig.servingWeightG }
        : norm;

      let value = 100;
      let unit: UnitId = 'g';
      let kind: UnitKind = 'mass';

      if (savedUnit && (savedUnit.unitLabel === 'oz' || savedUnit.unitLabel === 'lb')) {
        const isOz = savedUnit.unitLabel === 'oz';
        const perUnitG = isOz ? 28.3495 : 453.592;
        setUnitKind('mass');
        setUnitId(isOz ? 'oz' : 'lb');

        let rawQty: number;
        if (typeof local.savedQuantity === 'number' && local.savedQuantity > 0) {
          rawQty = local.savedQuantity;
        } else {
          const recents = await foodService.getRecentFoodsList();
          const target = norm.name.trim().toLowerCase();
          const match =
            recents.find((r) => r.food.id === norm.id) ??
            recents.find((r) => r.food.name.trim().toLowerCase() === target);
          const lastGrams = match?.lastServingGrams;
          rawQty = lastGrams != null && lastGrams > 0 ? lastGrams / perUnitG : 1;
        }

        const qtyStr =
          rawQty === Math.round(rawQty)
            ? String(Math.round(rawQty))
            : String(Math.round(rawQty * 10) / 10);
        setQuantityInput(qtyStr);
        value = parseFloat(qtyStr) || rawQty;
        unit = isOz ? 'oz' : 'lb';
        kind = 'mass';
      } else if (useUnits && unitConfig) {
        setUnitKind('serving');
        setUnitId('piece');
        setUnitLabel(unitConfig.unitLabel);
        setServingWeightG(unitConfig.servingWeightG);
        setQuantityInput('1');
        value = 1;
        unit = 'piece';
        kind = 'serving';
      } else if (savedVolumeMl) {
        setUnitKind('volume');
        setUnitId('ml');
        setQuantityInput(String(savedVolumeMl));
        value = savedVolumeMl;
        unit = 'ml';
        kind = 'volume';
      } else {
        setUnitKind('mass');
        setUnitId('g');
        setQuantityInput('100');
      }

      const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, unit, kind);
      if (result.ok) {
        computedMacrosRef.current = result.macros;
        setProtein(String(result.macros.protein_g));
        setCarbs(String(result.macros.carbs_g));
        setFat(String(result.macros.fat_g));
        setScalingReason(null);
      } else {
        computedMacrosRef.current = null;
        setProtein('');
        setCarbs('');
        setFat('');
        setScalingReason(result.reason);
      }
    } catch (err) {
      console.log('[AddFood] Error loading barcode food:', err);
    }
  }, [animateScanner]);

  useEffect(() => {
    const id = params.fromBarcode;
    if (!id || typeof id !== 'string') return;
    loadFoodIntoForm(id);
  }, [loadFoodIntoForm, params.fromBarcode]);

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

  const BENIGN_SPEECH_ERRORS = new Set(['aborted', 'no-speech', 'interrupted', 'not-allowed']);

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

  const handleScanBarcode = useCallback(() => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (scannerOpen) {
      animateScanner(0, () => setScannerOpen(false));
      return;
    }
    setScannerOpen(true);
    animateScanner(1);
  }, [animateScanner, scannerOpen]);

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

      Keyboard.dismiss();
      setShowSuggestions(false);
      setVoiceMealDraft(null);
      setVoiceModalVisible(false);
      setVoiceTranscript('');
      setIsVoiceProcessing(false);
      setDismissedUnresolvedIds([]);

      if (scannerOpen) {
        animateScanner(0, () => setScannerOpen(false));
      }

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

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
  }, [animateScanner, isListening, scannerOpen, voiceMealAvailable]);

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

  const saveManualToLibrary = useCallback(
    async (
      foodName: string,
      grams: number,
      macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
      opts?: { unitLabel?: string; servingWeightG?: number; density_g_per_ml?: number; savedQuantity?: number }
    ) => {
      const scale = grams > 0 ? 100 / grams : 1;
      const per100g = {
        calories: Math.round(macros.calories * scale),
        protein: macros.protein_g * scale,
        carbs: macros.carbs_g * scale,
        fat: macros.fat_g * scale,
      };
      const addOpts =
        opts?.unitLabel && opts?.servingWeightG
          ? { unitLabel: opts.unitLabel, servingWeightG: opts.servingWeightG, density_g_per_ml: opts.density_g_per_ml, savedQuantity: opts.savedQuantity }
          : opts?.density_g_per_ml
            ? { density_g_per_ml: opts.density_g_per_ml, servingSize: `${grams}g` }
            : { servingSize: `${grams}g` };
      const existing = await foodsRepo.getSavedFoods('manual');
      const dup = existing.find((f) => f.name.toLowerCase() === foodName.trim().toLowerCase());
      if (dup) {
        return new Promise<void>((resolve) => {
          Alert.alert(
            'Replace existing saved food?',
            'A saved food with this name already exists.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
              {
                text: 'Replace',
                onPress: async () => {
                  await foodsRepo.addManualFood({ name: foodName.trim(), calories: per100g.calories, protein: per100g.protein, carbs: per100g.carbs, fat: per100g.fat, ...addOpts });
                  resolve();
                },
              },
              {
                text: 'Keep both',
                onPress: async () => {
                  await foodsRepo.addManualFood({ name: `${foodName.trim()} (2)`, calories: per100g.calories, protein: per100g.protein, carbs: per100g.carbs, fat: per100g.fat, ...addOpts });
                  resolve();
                },
              },
            ]
          );
        });
      }
      await foodsRepo.addManualFood({ name: foodName.trim(), calories: per100g.calories, protein: per100g.protein, carbs: per100g.carbs, fat: per100g.fat, ...addOpts });
    },
    []
  );

  const handleConfirmVoiceMeal = useCallback(async () => {
    if (!voiceMealDraft || voiceMealDraft.items.length === 0) return;

    setIsSaving(true);
    try {
      const entries = voiceMealDraft.items.map((item) =>
        foodService.createFoodEntry(
          item.food,
          item.displayName,
          item.grams,
          item.macros,
          false,
          item.entryOpts
        )
      );

      addEntries(entries, dateKeyParam);
      await Promise.all(
        voiceMealDraft.items.map((item) => foodService.addToRecent(item.food, item.grams))
      );

      if (saveToLibrary && !isFromSavedFoods) {
        await Promise.all(
          voiceMealDraft.items.map((item) => {
            const voiceSaveOpts =
              item.entryOpts?.measureMode === 'qty' && item.entryOpts.servingWeightG
                ? {
                    unitLabel: detectUnitFromName(item.food.name)?.unitLabel ?? 'serving',
                    servingWeightG: item.entryOpts.servingWeightG,
                  }
                : item.entryOpts?.measureMode === 'ounces'
                  ? { unitLabel: 'oz', servingWeightG: 28.3495, savedQuantity: item.entryOpts.quantity }
                  : item.entryOpts?.measureMode === 'grams'
                    ? { servingSize: `${Math.round(item.grams)}g` }
                    : undefined;
            return saveManualToLibrary(item.displayName, item.grams, item.macros, voiceSaveOpts);
          })
        );
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setVoiceModalVisible(false);
      router.back();
    } catch (err) {
      console.log('[AddFood] Voice confirm error:', err);
      Alert.alert('Error', 'Failed to add the spoken meal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [addEntries, dateKeyParam, voiceMealDraft, saveToLibrary, saveManualToLibrary, isFromSavedFoods]);

  const computedCalories =
    (parseFloat(protein) || 0) * 4 +
    (parseFloat(carbs) || 0) * 4 +
    (parseFloat(fat) || 0) * 9;

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setShowSuggestions(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        parsedInputRef.current = null;
        setParsedInput(null);
        setTextResolvedItem(null);
        setIsResolvingText(false);
        setShowOtherResults(false);
        setSuggestions([]);
        setSearchStatus('idle');
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchStatus('loading');
      const parsed = parseTextInput(text);
      const nextParsed =
        parsed.quantity != null && parsed.unitId != null && parsed.unitKind != null
          ? { quantity: parsed.quantity, unitId: parsed.unitId, unitKind: parsed.unitKind, foodQuery: parsed.foodQuery }
          : null;
      parsedInputRef.current = nextParsed;
      setParsedInput(nextParsed);

      // When a quantity+unit is parsed, run the voice resolver in parallel for a clean top pick
      if (nextParsed) {
        const requestId = ++resolveRequestIdRef.current;
        setTextResolvedItem(null);
        setIsResolvingText(true);
        setShowOtherResults(false);
        resolveVoiceItem({
          label: text.trim(),
          query: nextParsed.foodQuery,
          quantity: nextParsed.quantity,
          unitId: nextParsed.unitId,
          unitKind: nextParsed.unitKind,
          ambiguousOunces: false,
        }).then((result) => {
          if (resolveRequestIdRef.current !== requestId) return;
          setIsResolvingText(false);
          if (result.status === 'resolved') {
            setTextResolvedItem(result.item);
          } else {
            setTextResolvedItem(null);
          }
        }).catch(() => {
          if (resolveRequestIdRef.current !== requestId) return;
          setIsResolvingText(false);
          setTextResolvedItem(null);
        });
      } else {
        setTextResolvedItem(null);
        setIsResolvingText(false);
        setShowOtherResults(true);
      }

      const searchQuery = parsed.foodQuery || text.trim();
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await foodService.searchSuggestions(searchQuery);
          if (result.status === 'ok') {
            setSuggestions(result.results);
            setSearchStatus('idle');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else if (result.status === 'empty') {
            setSuggestions([]);
            setSearchStatus('idle');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else if (result.status === 'rate_limited') {
            setSuggestions([]);
            setSearchStatus('rate_limited');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else {
            setSuggestions([]);
            setSearchStatus('error');
            setSearchErrorCode(result.status === 'error' ? result.errorCode : undefined);
            setSearchErrorDetail(result.status === 'error' ? result.errorDetail : undefined);
          }
        } catch {
          setSuggestions([]);
          setSearchStatus('error');
          setSearchErrorCode('UNKNOWN');
          setSearchErrorDetail(undefined);
        } finally {
          setIsSearching(false);
        }
      }, DEBOUNCE_MS);
    },
    []
  );

  const handleSelectSuggestion = useCallback(
    async (food: NormalizedFood) => {
      const resolvedFood =
        food.providerId === 'usda' && food.externalId
          ? (await foodService.getFood(food.externalId)) ?? food
          : food;

      const lastGramsFromRecent = (f: NormalizedFood): number | undefined => {
        const byId = recentFoods.find((r) => r.food.id === f.id);
        if (byId != null && byId.lastServingGrams > 0) return byId.lastServingGrams;
        const target = f.name.trim().toLowerCase();
        const byName = recentFoods.find(
          (r) => r.food.name.trim().toLowerCase() === target
        );
        if (byName != null && byName.lastServingGrams > 0) return byName.lastServingGrams;
        return undefined;
      };

      console.log('[AddFood] Selected suggestion:', resolvedFood.name);
      setSelectedFood(resolvedFood);
      setName(resolvedFood.name);
      setShowSuggestions(false);
      setQuery(resolvedFood.name);
      setIsCustomized(false);

      const parsed = parsedInputRef.current;
      parsedInputRef.current = null;
      setParsedInput(null);
      setTextResolvedItem(null);
      setIsResolvingText(false);
      resolveRequestIdRef.current++;

      const detected = detectUnitFromName(resolvedFood.name);
      const foodWithServing = detected
        ? { ...resolvedFood, servingWeightGrams: resolvedFood.servingWeightGrams ?? detected.servingWeightG }
        : resolvedFood;

      if (parsed) {
        setUnitKind(parsed.unitKind);
        setUnitId(parsed.unitId);
        setQuantityInput(String(parsed.quantity));
        if (parsed.unitKind === 'serving') {
          const sw = detected?.servingWeightG ?? 100;
          setUnitLabel(detected?.unitLabel ?? 'serving');
          setServingWeightG(sw);
          const foodForServing = { ...foodWithServing, servingWeightGrams: sw };
          const result = foodService.scaleMacrosFromQuantity(
            foodForServing,
            parsed.quantity,
            parsed.unitId,
            parsed.unitKind
          );
          if (result.ok) {
            computedMacrosRef.current = result.macros;
            setProtein(String(result.macros.protein_g));
            setCarbs(String(result.macros.carbs_g));
            setFat(String(result.macros.fat_g));
            setScalingReason(null);
          } else {
            setScalingReason(result.reason);
          }
        } else {
          const result = foodService.scaleMacrosFromQuantity(
            foodWithServing,
            parsed.quantity,
            parsed.unitId,
            parsed.unitKind
          );
          if (result.ok) {
            computedMacrosRef.current = result.macros;
            setProtein(String(result.macros.protein_g));
            setCarbs(String(result.macros.carbs_g));
            setFat(String(result.macros.fat_g));
            setScalingReason(null);
          } else {
            setScalingReason(result.reason);
          }
        }
      } else if (detected) {
        setUnitKind('serving');
        setUnitId('piece');
        setUnitLabel(detected.unitLabel);
        setServingWeightG(detected.servingWeightG);
        setQuantityInput('1');
        const result = foodService.scaleMacrosFromQuantity(foodWithServing, 1, 'piece', 'serving');
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          setScalingReason(result.reason);
        }
      } else if (resolvedFood.unitLabel === 'oz' && resolvedFood.servingWeightGrams) {
        const ozPerG = resolvedFood.servingWeightGrams;
        setUnitKind('mass');
        setUnitId('oz');
        const rawOz = (typeof resolvedFood.savedQuantity === 'number' && resolvedFood.savedQuantity > 0)
          ? resolvedFood.savedQuantity
          : (lastGramsFromRecent(resolvedFood) != null ? (lastGramsFromRecent(resolvedFood) as number) / 28.3495 : 1);
        const ozStr =
          rawOz === Math.round(rawOz)
            ? String(Math.round(rawOz))
            : String(Math.round(rawOz * 10) / 10);
        setQuantityInput(ozStr);
        const ozValue = parseFloat(ozStr) || rawOz;
        const result = foodService.scaleMacrosFromQuantity(
          resolvedFood,
          ozValue,
          'oz',
          'mass'
        );
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          const lastGrams = lastGramsFromRecent(resolvedFood);
          const gramsForFallback = lastGrams ?? ozPerG;
          const macros = foodService.computeMacrosForServing(resolvedFood, gramsForFallback);
          computedMacrosRef.current = macros;
          setProtein(String(macros.protein_g));
          setCarbs(String(macros.carbs_g));
          setFat(String(macros.fat_g));
          setScalingReason(null);
        }
      } else if (resolvedFood.unitLabel === 'lb' && resolvedFood.servingWeightGrams) {
        const lbPerG = resolvedFood.servingWeightGrams;
        setUnitKind('mass');
        setUnitId('lb');
        const rawLb = (typeof resolvedFood.savedQuantity === 'number' && resolvedFood.savedQuantity > 0)
          ? resolvedFood.savedQuantity
          : (lastGramsFromRecent(resolvedFood) != null ? (lastGramsFromRecent(resolvedFood) as number) / 453.592 : 1);
        const lbStr =
          rawLb === Math.round(rawLb)
            ? String(Math.round(rawLb))
            : String(Math.round(rawLb * 10) / 10);
        setQuantityInput(lbStr);
        const lbValue = parseFloat(lbStr) || rawLb;
        const result = foodService.scaleMacrosFromQuantity(
          resolvedFood,
          lbValue,
          'lb',
          'mass'
        );
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          const lastGrams = lastGramsFromRecent(resolvedFood);
          const gramsForFallback = lastGrams ?? lbPerG;
          const macros = foodService.computeMacrosForServing(resolvedFood, gramsForFallback);
          computedMacrosRef.current = macros;
          setProtein(String(macros.protein_g));
          setCarbs(String(macros.carbs_g));
          setFat(String(macros.fat_g));
          setScalingReason(null);
        }
      } else {
        setUnitKind('mass');
        setUnitId('g');
        setQuantityInput('100');
        const result = foodService.scaleMacrosFromQuantity(resolvedFood, 100, 'g', 'mass');
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          setScalingReason(result.reason);
        }
      }

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [recentFoods]
  );

  const handleQuickAdd = useCallback(
    async (food: NormalizedFood) => {
      const parsed = parsedInputRef.current;
      if (!parsed) return;

      const resolvedFood =
        food.providerId === 'usda' && food.externalId
          ? (await foodService.getFood(food.externalId)) ?? food
          : food;

      const detected = detectUnitFromName(resolvedFood.name);
      const foodWithServing = detected
        ? { ...resolvedFood, servingWeightGrams: resolvedFood.servingWeightGrams ?? detected.servingWeightG }
        : resolvedFood;

      const scaling =
        parsed.unitKind === 'serving'
          ? foodService.scaleMacrosFromQuantity(
              { ...foodWithServing, servingWeightGrams: detected?.servingWeightG ?? 100 },
              parsed.quantity,
              parsed.unitId,
              parsed.unitKind
            )
          : foodService.scaleMacrosFromQuantity(
              foodWithServing,
              parsed.quantity,
              parsed.unitId,
              parsed.unitKind
            );

      if (!scaling.ok) return;

      const entryOpts =
        parsed.unitKind === 'serving' && detected
          ? { measureMode: 'qty' as const, quantity: parsed.quantity, servingWeightG: detected.servingWeightG }
          : parsed.unitId === 'oz'
            ? { measureMode: 'ounces' as const, quantity: parsed.quantity }
            : { measureMode: 'grams' as const, quantity: scaling.gramsUsedForScaling };

      const entry = foodService.createFoodEntry(
        resolvedFood,
        resolvedFood.name,
        scaling.gramsUsedForScaling,
        scaling.macros,
        false,
        entryOpts
      );

      setIsSaving(true);
      try {
        addEntry(entry, dateKeyParam);
        await foodService.addToRecent(resolvedFood, scaling.gramsUsedForScaling);
        parsedInputRef.current = null;
        setParsedInput(null);
        setTextResolvedItem(null);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      } catch (err) {
        console.log('[AddFood] Quick add error:', err);
        Alert.alert('Error', 'Failed to add food. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [addEntry, dateKeyParam]
  );

  const handleConfirmTextResolved = useCallback(async () => {
    if (!textResolvedItem) return;
    setIsSaving(true);
    try {
      const entry = foodService.createFoodEntry(
        textResolvedItem.food,
        textResolvedItem.displayName,
        textResolvedItem.grams,
        textResolvedItem.macros,
        false,
        textResolvedItem.entryOpts
      );
      addEntry(entry, dateKeyParam);
      await foodService.addToRecent(textResolvedItem.food, textResolvedItem.grams);
      if (saveToLibrary && !isFromSavedFoods) {
        const _item = textResolvedItem;
        const _saveOpts =
          _item.entryOpts?.measureMode === 'qty' && _item.entryOpts.servingWeightG
            ? {
                unitLabel: detectUnitFromName(_item.food.name)?.unitLabel ?? 'serving',
                servingWeightG: _item.entryOpts.servingWeightG,
              }
            : _item.entryOpts?.measureMode === 'ounces'
              ? { unitLabel: 'oz', servingWeightG: 28.3495, savedQuantity: _item.entryOpts.quantity }
              : _item.entryOpts?.measureMode === 'grams'
                ? { servingSize: `${Math.round(_item.grams)}g` }
                : undefined;
        await saveManualToLibrary(_item.displayName, _item.grams, _item.macros, _saveOpts);
      }
      setTextResolvedItem(null);
      setParsedInput(null);
      parsedInputRef.current = null;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (err) {
      console.log('[AddFood] Text resolve confirm error:', err);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [textResolvedItem, addEntry, dateKeyParam, saveToLibrary, saveManualToLibrary, isFromSavedFoods]);

  const handleQuantityChange = useCallback(
    (text: string) => {
      setQuantityInput(text);
      const value = parseFloat(text) || 0;
      if (!selectedFood || value <= 0) return;
      const foodWithServing =
        unitKind === 'serving'
          ? { ...selectedFood, servingWeightGrams: selectedFood.servingWeightGrams ?? servingWeightG }
          : selectedFood;
      const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, unitId, unitKind);
      if (result.ok) {
        computedMacrosRef.current = result.macros;
        setProtein(String(result.macros.protein_g));
        setCarbs(String(result.macros.carbs_g));
        setFat(String(result.macros.fat_g));
        setIsCustomized(false);
        setScalingReason(null);
      } else {
        setScalingReason(result.reason);
      }
    },
    [selectedFood, unitKind, unitId, servingWeightG]
  );

  const handleServingWeightChange = useCallback(
    (val: number) => {
      const g = val > 0 ? val : 50;
      setServingWeightG(g);
      const value = parseFloat(quantityInput) || 0;
      if (!selectedFood || value <= 0) return;
      const foodWithServing = { ...selectedFood, servingWeightGrams: g };
      const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, unitId, 'serving');
      if (result.ok) {
        computedMacrosRef.current = result.macros;
        setProtein(String(result.macros.protein_g));
        setCarbs(String(result.macros.carbs_g));
        setFat(String(result.macros.fat_g));
        setIsCustomized(false);
        setScalingReason(null);
      } else {
        setScalingReason(result.reason);
      }
    },
    [selectedFood, quantityInput, unitId]
  );

  const handleMacroEdit = useCallback(
    (field: 'protein' | 'carbs' | 'fat', value: string) => {
      if (field === 'protein') setProtein(value);
      if (field === 'carbs') setCarbs(value);
      if (field === 'fat') setFat(value);

      if (selectedFood && computedMacrosRef.current) {
        setIsCustomized(true);
      }
    },
    [selectedFood]
  );

  const handleSave = useCallback(async () => {
    const foodName = name.trim() || query.trim();
    if (!foodName) {
      Alert.alert('Missing Name', 'Please enter a food name.');
      return;
    }
    if (!protein && !carbs && !fat) {
      Alert.alert('Missing Macros', 'Please enter at least one macro value.');
      return;
    }

    const value = parseFloat(quantityInput) || 0;
    const foodWithServing: NormalizedFood | null =
      unitKind === 'serving' && selectedFood
        ? { ...selectedFood, servingWeightGrams: selectedFood.servingWeightGrams ?? servingWeightG }
        : selectedFood;
    const scaling =
      foodWithServing && value > 0
        ? foodService.scaleMacrosFromQuantity(foodWithServing, value, unitId, unitKind)
        : null;

    if (scaling && !scaling.ok) {
      Alert.alert(
        'Cannot add to log',
        'Please fix the amount (e.g. add density or switch to grams) before saving.'
      );
      return;
    }

    const macros = scaling?.ok
      ? scaling.macros
      : {
          calories: Math.round(computedCalories),
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
        };
    const grams = scaling?.ok ? scaling.gramsUsedForScaling : 100;

    setIsSaving(true);

    try {
      const qtyVal = parseFloat(quantityInput) || 0;
      const entryOpts =
        unitKind === 'serving' && servingWeightG > 0
          ? { measureMode: 'qty' as const, quantity: qtyVal || 1, servingWeightG }
          : unitId === 'oz'
            ? { measureMode: 'ounces' as const, quantity: qtyVal }
            : { measureMode: 'grams' as const, quantity: grams };

      const entry = foodService.createFoodEntry(
        selectedFood ?? null,
        foodName,
        grams,
        macros,
        isCustomized,
        entryOpts
      );

      addEntry(entry, dateKeyParam);

      const normalizedForRecent =
        selectedFood ??
        foodService.createManualNormalizedFood(foodName, macros, grams);
      await foodService.addToRecent(normalizedForRecent, grams);
      if (selectedFood?.providerId === 'openfoodfacts') {
        foodsRepo.recordFoodSelection(selectedFood.id).catch(() => {});
      }

      const isManual = !selectedFood || selectedFood.providerId === 'manual';
      if (saveToLibrary && isManual && !isFromSavedFoods) {
        const density = typeof selectedFood?.density_g_per_ml === 'number' ? selectedFood.density_g_per_ml : undefined;
        const unitOpts =
          unitKind === 'serving' && unitLabel && servingWeightG
            ? { unitLabel, servingWeightG, density_g_per_ml: density }
            : unitKind === 'mass' && (unitId === 'oz' || unitId === 'lb')
              ? { unitLabel: unitId, servingWeightG: unitId === 'oz' ? 28.3495 : 453.592, savedQuantity: qtyVal }
              : density !== undefined
                ? { density_g_per_ml: density }
                : undefined;
        await saveManualToLibrary(foodName, grams, macros, unitOpts);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (err) {
      console.log('[AddFood] Save error:', err);
      Alert.alert('Error', 'Failed to save food entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    query,
    protein,
    carbs,
    fat,
    computedCalories,
    quantityInput,
    unitKind,
    unitId,
    servingWeightG,
    selectedFood,
    isCustomized,
    saveToLibrary,
    saveManualToLibrary,
    addEntry,
    dateKeyParam,
    isFromSavedFoods,
  ]);

  const handleManualMode = useCallback(() => {
    setSelectedFood(null);
    setName(query);
    setShowSuggestions(false);
    setIsCustomized(false);
    computedMacrosRef.current = null;
    setScalingReason(null);
    const detected = detectUnitFromName(query);
    if (detected) {
      setUnitKind('serving');
      setUnitId('piece');
      setUnitLabel(detected.unitLabel);
      setServingWeightG(detected.servingWeightG);
      setQuantityInput('1');
    } else {
      setUnitKind('mass');
      setUnitId('g');
      setQuantityInput('100');
    }
  }, [query]);

  const handleClearSelection = useCallback(() => {
    setSelectedFood(null);
    setName('');
    setQuery('');
    setProtein('');
    setCarbs('');
    setFat('');
    setUnitKind('mass');
    setUnitId('g');
    setQuantityInput('100');
    setUnitLabel('egg');
    setServingWeightG(50);
    setIsCustomized(false);
    computedMacrosRef.current = null;
    setScalingReason(null);
    setShowSuggestions(false);
  }, []);

  const handleSelectRecent = useCallback(
    (food: NormalizedFood, lastGrams: number) => {
      setSelectedFood(food);
      setName(food.name);
      setQuery(food.name);
      setShowSuggestions(false);
      setIsCustomized(false);

      const detected = detectUnitFromName(food.name);
      const grams = lastGrams || 100;
      const foodWithServing = detected
        ? { ...food, servingWeightGrams: detected.servingWeightG }
        : food;
      let value: number;
      let unit: UnitId;
      let kind: UnitKind;
      if (detected) {
        setUnitKind('serving');
        setUnitId('piece');
        setUnitLabel(detected.unitLabel);
        setServingWeightG(detected.servingWeightG);
        const qty = grams / detected.servingWeightG;
        const qtyStr = qty === Math.round(qty) ? String(Math.round(qty)) : String(Math.round(qty * 10) / 10);
        setQuantityInput(qtyStr);
        value = parseFloat(qtyStr) || qty;
        unit = 'piece';
        kind = 'serving';
      } else if (food.unitLabel === 'oz' && food.servingWeightGrams) {
        const ozQty = (typeof food.savedQuantity === 'number' && food.savedQuantity > 0)
          ? food.savedQuantity
          : grams / 28.3495;
        const ozStr = ozQty === Math.round(ozQty) ? String(Math.round(ozQty)) : String(Math.round(ozQty * 10) / 10);
        setUnitKind('mass');
        setUnitId('oz');
        setQuantityInput(ozStr);
        value = parseFloat(ozStr) || ozQty;
        unit = 'oz';
        kind = 'mass';
      } else if (food.unitLabel === 'lb' && food.servingWeightGrams) {
        const lbQty = (typeof food.savedQuantity === 'number' && food.savedQuantity > 0)
          ? food.savedQuantity
          : grams / 453.592;
        const lbStr = lbQty === Math.round(lbQty) ? String(Math.round(lbQty)) : String(Math.round(lbQty * 10) / 10);
        setUnitKind('mass');
        setUnitId('lb');
        setQuantityInput(lbStr);
        value = parseFloat(lbStr) || lbQty;
        unit = 'lb';
        kind = 'mass';
      } else if (typeof food.density_g_per_ml === 'number' && food.density_g_per_ml > 0) {
        const ml = grams / food.density_g_per_ml;
        const mlRounded = Math.max(1, Math.round(ml));
        setUnitKind('volume');
        setUnitId('ml');
        setQuantityInput(String(mlRounded));
        value = mlRounded;
        unit = 'ml';
        kind = 'volume';
      } else {
        setUnitKind('mass');
        setUnitId('g');
        setQuantityInput(String(Math.round(grams)));
        value = grams;
        unit = 'g';
        kind = 'mass';
      }
      const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, unit, kind);
      const macros = result.ok ? result.macros : foodService.computeMacrosForServing(food, grams);
      computedMacrosRef.current = macros;
      setProtein(String(macros.protein_g));
      setCarbs(String(macros.carbs_g));
      setFat(String(macros.fat_g));
      setScalingReason(result.ok ? null : result.reason);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    []
  );

  const handleKindChange = useCallback(
    (k: UnitKind) => {
      setUnitKind(k);
      if (k === 'mass') {
        setUnitId('g');
      } else if (k === 'volume') {
        setUnitId('ml');
      } else {
        setUnitId('serving');
        // Update serving label/weight from the current food name (Bug B fix)
        const detected = detectUnitFromName(name || query);
        if (detected) {
          setUnitLabel(detected.unitLabel);
          setServingWeightG(detected.servingWeightG);
        }
      }
      // Don't recalculate if user has manually edited macros (Bug C fix)
      if (isCustomized) return;
      const value = parseFloat(quantityInput) || 0;
      const newUnit = k === 'mass' ? 'g' : k === 'volume' ? 'ml' : 'serving';
      const effectiveSwg =
        k === 'serving'
          ? (detectUnitFromName(name || query)?.servingWeightG ?? servingWeightG)
          : servingWeightG;
      const foodWithServing: NormalizedFood | null =
        k === 'serving' && selectedFood
          ? { ...selectedFood, servingWeightGrams: selectedFood.servingWeightGrams ?? effectiveSwg }
          : selectedFood;
      if (foodWithServing && value > 0) {
        const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, newUnit, k);
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          setScalingReason(result.reason);
        }
      }
    },
    [quantityInput, selectedFood, servingWeightG, isCustomized, name, query]
  );

  const handleUnitChange = useCallback(
    (u: UnitId) => {
      setUnitId(u);
      // Don't recalculate if user has manually edited macros (Bug C fix)
      if (isCustomized) return;
      const value = parseFloat(quantityInput) || 0;
      const foodWithServing: NormalizedFood | null =
        unitKind === 'serving' && selectedFood
          ? { ...selectedFood, servingWeightGrams: selectedFood.servingWeightGrams ?? servingWeightG }
          : selectedFood;
      if (foodWithServing && value > 0) {
        const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, u, unitKind);
        if (result.ok) {
          computedMacrosRef.current = result.macros;
          setProtein(String(result.macros.protein_g));
          setCarbs(String(result.macros.carbs_g));
          setFat(String(result.macros.fat_g));
          setScalingReason(null);
        } else {
          setScalingReason(result.reason);
        }
      }
    },
    [quantityInput, unitKind, selectedFood, servingWeightG, isCustomized]
  );

  const searchShellStyle = {
    height: scannerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [54, 0],
    }),
    opacity: scannerAnim.interpolate({
      inputRange: [0, 0.85, 1],
      outputRange: [1, 0.08, 0],
    }),
    marginBottom: scannerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0],
    }),
  };

  const scannerShellStyle = {
    height: scannerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, scannerViewportWidth || 320],
    }),
    opacity: scannerAnim,
    marginTop: scannerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

  return (
    <DismissKeyboard>
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <View style={styles.headerBtnContainer}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="close-add-food"
                style={styles.headerIconBtn}
              >
                <View style={styles.headerIconWrap}>
                  <X size={22} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerBtnContainer}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="save-food-button"
                style={styles.headerIconBtn}
              >
                <View style={styles.headerIconWrap}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Check size={22} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ResponsiveContainer>
          <View
            style={styles.searchSection}
            onLayout={(event) => {
              const width = Math.round(event.nativeEvent.layout.width);
              if (width > 0 && width !== scannerViewportWidth) {
                setScannerViewportWidth(width);
              }
            }}
          >
            <Animated.View style={[styles.searchShell, searchShellStyle]}>
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={handleSearch}
                  placeholder={
                    apiAvailable
                      ? 'Search foods or enter name...'
                      : 'Enter food name...'
                  }
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus={false}
                  editable={!scannerOpen}
                  testID="food-search-input"
                />
                {query.length > 0 && !scannerOpen && (
                  <TouchableOpacity
                    onPress={handleClearSelection}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}
                {isSearching && !scannerOpen && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.searchSpinner}
                  />
                )}
              </View>
            </Animated.View>

            <Animated.View style={[styles.scannerShell, scannerShellStyle]}>
              {scannerOpen ? (
                <BarcodeScannerPanel
                  variant="inline"
                  onCancel={() => {
                    animateScanner(0, () => setScannerOpen(false));
                  }}
                  onSaved={(foodId) => {
                    void loadFoodIntoForm(foodId);
                  }}
                />
              ) : null}
            </Animated.View>

            {!apiAvailable && (
              <View style={styles.apiNotice}>
                <Text style={styles.apiNoticeText}>
                  USDA key not configured for this build. You can still enter macros manually.
                </Text>
              </View>
            )}

            <View style={styles.scanRow}>
              <TouchableOpacity
                style={styles.scanBarcodeBtn}
                onPress={handleScanBarcode}
                activeOpacity={0.7}
                testID="scan-barcode-button"
              >
                {scannerOpen ? <X size={18} color={colors.primary} /> : <Scan size={18} color={colors.primary} />}
                <Text style={styles.scanBarcodeText}>{scannerOpen ? 'Close Scanner' : 'Scan Barcode'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scanBarcodeBtn, !voiceMealAvailable && styles.scanBarcodeBtnDisabled]}
                onPress={handleStartVoiceMeal}
                activeOpacity={0.7}
                testID="voice-meal-button"
              >
                {isListening || isVoiceProcessing ? (
                  <LoaderCircle size={18} color={colors.primary} />
                ) : (
                  <Mic size={18} color={colors.primary} />
                )}
                <Text style={styles.scanBarcodeText}>
                  {isListening ? 'Listening...' : isVoiceProcessing ? 'Building Meal...' : 'Speak Meal'}
                </Text>
              </TouchableOpacity>
            </View>

            {!voiceMealAvailable && (
              <Text style={styles.voiceSupportHint}>
                Voice meal entry needs a new dev build or production build before it can be tested.
              </Text>
            )}

            <VoiceRecordingSheet
              visible={isListening || isVoiceProcessing}
              isListening={isListening}
              isProcessing={isVoiceProcessing}
              transcript={voiceTranscript}
              onCancel={handleCancelVoice}
              colors={colors}
            />

            <View style={styles.savedFoodsRow}>
              <TouchableOpacity
                style={styles.savedFoodsLink}
                onPress={() => router.push('/saved-foods')}
                activeOpacity={0.7}
              >
                <Text style={styles.savedFoodsLinkText}>Saved Foods</Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {showSuggestions && (textResolvedItem || isResolvingText || suggestions.length > 0) && (() => {
            const parsed = parsedInput;
            // Derive unit label for "other results" scaled macros (no resolver)
            const otherUnitLabel =
              parsed?.unitId === 'fl_oz'
                ? 'fl oz'
                : parsed?.unitId ?? '';

            // Resolved quantity and unit for the best-match card header
            const resolvedQtyDisplay = textResolvedItem?.quantity ?? 0;
            const resolvedUnitLabel = textResolvedItem?.displayUnit ?? '';

            return (
            <View style={styles.suggestionsSection}>
              {/* ── Best Match Card (voice-resolver result) ── */}
              {(isResolvingText || textResolvedItem) && (
                <View style={styles.quickAddSection}>
                  {isResolvingText ? (
                    <View style={styles.resolvingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.resolvingText}>Finding best match…</Text>
                    </View>
                  ) : textResolvedItem ? (
                    <>
                      <Text style={styles.quickAddHeader}>
                        BEST MATCH
                      </Text>
                      <TouchableOpacity
                        style={styles.quickAddCard}
                        onPress={handleConfirmTextResolved}
                        activeOpacity={0.7}
                        disabled={isSaving}
                        testID="quick-add-card"
                      >
                        <View style={styles.quickAddContent}>
                          <Text style={styles.quickAddAmountLabel}>
                            {resolvedQtyDisplay} {resolvedUnitLabel}
                          </Text>
                          <Text style={styles.quickAddTitle} numberOfLines={2}>
                            {textResolvedItem.displayName}
                          </Text>
                          <Text style={styles.quickAddMacros}>
                            {formatNumber(textResolvedItem.macros.calories)} cal ·{' '}
                            {formatNumber(textResolvedItem.macros.protein_g)}p ·{' '}
                            {formatNumber(textResolvedItem.macros.carbs_g)}c ·{' '}
                            {formatNumber(textResolvedItem.macros.fat_g)}f
                          </Text>
                        </View>
                        <View style={[styles.quickAddButton, { backgroundColor: colors.primary }]}>
                          <Text style={styles.quickAddButtonText}>+ Add</Text>
                        </View>
                      </TouchableOpacity>

                      {/* ── Other Results toggle ── */}
                      {suggestions.length > 0 && (
                        <TouchableOpacity
                          style={styles.otherResultsToggle}
                          onPress={() => setShowOtherResults(v => !v)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.otherResultsToggleText}>
                            {showOtherResults ? 'Hide other results ▲' : 'Other results ▼'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : null}
                </View>
              )}

              {/* ── Suggestion list (always shown when no resolver is active; toggled otherwise) ── */}
              {(!textResolvedItem && !isResolvingText) || showOtherResults ? (
                suggestions.map((food) => {
                  const cardDetected = parsed?.unitKind === 'serving' ? detectUnitFromName(food.name) : null;
                  const cardFood =
                    cardDetected && parsed?.unitKind === 'serving'
                      ? { ...food, servingWeightGrams: food.servingWeightGrams ?? cardDetected.servingWeightG }
                      : food;
                  const cardScaling = parsed
                    ? foodService.scaleMacrosFromQuantity(cardFood, parsed.quantity, parsed.unitId, parsed.unitKind)
                    : null;
                  const showScaled = cardScaling?.ok;

                  return (
                    <TouchableOpacity
                      key={food.id}
                      style={styles.suggestionCard}
                      onPress={() => handleSelectSuggestion(food)}
                      activeOpacity={0.7}
                      testID={`suggestion-${food.id}`}
                    >
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {food.name}
                        </Text>
                        {food.brand ? (
                          <Text style={styles.suggestionBrand} numberOfLines={1}>
                            {food.brand}
                          </Text>
                        ) : null}
                        {showScaled && cardScaling ? (
                          <Text style={styles.suggestionMacros}>
                            {formatNumber(cardScaling.macros.calories)} cal ·{' '}
                            {formatNumber(cardScaling.macros.protein_g)}p ·{' '}
                            {formatNumber(cardScaling.macros.carbs_g)}c ·{' '}
                            {formatNumber(cardScaling.macros.fat_g)}f
                            {'  '}
                            <Text style={styles.suggestionMacrosFor}>
                              for {parsed?.quantity} {otherUnitLabel}
                            </Text>
                          </Text>
                        ) : (
                          <Text style={styles.suggestionMacros}>
                            {formatNumber(food.per100g.calories)} cal · {formatNumber(food.per100g.protein_g)}p ·{' '}
                            {formatNumber(food.per100g.carbs_g)}c · {formatNumber(food.per100g.fat_g)}f per 100g
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={16} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  );
                })
              ) : null}

              <TouchableOpacity
                style={styles.manualFallback}
                onPress={handleManualMode}
                activeOpacity={0.7}
              >
                <Pencil size={14} color={colors.primary} />
                <Text style={styles.manualFallbackText}>
                  Can't find it? Enter manually
                </Text>
              </TouchableOpacity>
            </View>
            );
          })()}

          {showSuggestions &&
            !isSearching &&
            query.length > 0 &&
            suggestions.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {getSearchErrorMessage(searchStatus, searchErrorCode, searchErrorDetail)}
                </Text>
                <TouchableOpacity
                  style={styles.manualFallback}
                  onPress={handleManualMode}
                  activeOpacity={0.7}
                >
                  <Pencil size={14} color={colors.primary} />
                  <Text style={styles.manualFallbackText}>Enter manually</Text>
                </TouchableOpacity>
              </View>
            )}

          {(!showSuggestions || query.length === 0) && (
            <View style={styles.entrySection}>
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>Food Name</Text>
                  {selectedFood && (
                    <Text style={styles.inputLabelMeta}>
                      {selectedFood.providerId.toUpperCase()}
                    </Text>
                  )}
                  {isCustomized && (
                    <View style={styles.inputLabelEdited}>
                      <Pencil size={10} color={Colors.warning} />
                      <Text style={styles.inputLabelEditedText}>Edited</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.textInput}
                  value={name || query}
                  onChangeText={(text) => {
                    setName(text);
                    if (selectedFood) setIsCustomized(true);
                  }}
                  placeholder="e.g. Grilled Chicken"
                  placeholderTextColor={Colors.textTertiary}
                  testID="food-name-input"
                />
              </View>

              <View style={styles.servingSection}>
                <Text style={styles.inputLabel}>
                  {unitKind === 'serving'
                    ? `Amount (${pluralizeUnit(parseFloat(quantityInput) || 1, unitLabel)})`
                    : 'Amount'}
                </Text>
                <QuantityPillsCompact
                  value={quantityInput}
                  unit={unitId}
                  kind={unitKind}
                  onValueChange={handleQuantityChange}
                  onUnitChange={handleUnitChange}
                  onKindChange={handleKindChange}
                  servingWeightG={servingWeightG}
                  onServingWeightChange={handleServingWeightChange}
                  showPerItemRow={unitKind === 'serving'}
                  unitLabel={unitLabel}
                />
                {scalingReason && (
                  <QuantityCallout
                    reason={scalingReason}
                    onPrimary={() => {
                      if (scalingReason === 'NEEDS_DENSITY') {
                        setShowDensityModal(true);
                      } else if (scalingReason === 'UNSUPPORTED_SERVING' || scalingReason === 'NEEDS_SERVING_INFO') {
                        setUnitKind('mass');
                        setUnitId('g');
                        setQuantityInput('100');
                        if (selectedFood) {
                          const result = foodService.scaleMacrosFromQuantity(selectedFood, 100, 'g', 'mass');
                          if (result.ok) {
                            computedMacrosRef.current = result.macros;
                            setProtein(String(result.macros.protein_g));
                            setCarbs(String(result.macros.carbs_g));
                            setFat(String(result.macros.fat_g));
                            setScalingReason(null);
                          }
                        }
                      }
                    }}
                    onSecondary={
                      scalingReason === 'NEEDS_DENSITY' || scalingReason === 'NEEDS_SERVING_INFO'
                        ? () => {
                            setUnitKind('mass');
                            setUnitId('g');
                            setQuantityInput('100');
                            if (selectedFood) {
                              const result = foodService.scaleMacrosFromQuantity(selectedFood, 100, 'g', 'mass');
                              if (result.ok) {
                                computedMacrosRef.current = result.macros;
                                setProtein(String(result.macros.protein_g));
                                setCarbs(String(result.macros.carbs_g));
                                setFat(String(result.macros.fat_g));
                                setScalingReason(null);
                              }
                            }
                          }
                        : undefined
                    }
                  />
                )}
              </View>

              {showDensityModal && selectedFood && (
                <DensityModal
                  key={selectedFood.id}
                  visible={showDensityModal}
                  initialValue={selectedFood.density_g_per_ml}
                  onSave={async (density) => {
                    setShowDensityModal(false);
                    const updated = { ...selectedFood, density_g_per_ml: density };
                    setSelectedFood(updated);
                    try {
                      const updatedLocal = await foodsRepo.updateFoodDensity(selectedFood.id, density);
                      if (updatedLocal) {
                        const saved = await foodsRepo.getSavedFoods();
                        setSavedFoods(saved.map(foodsRepo.localFoodToNormalizedFood));
                      }
                    } catch {
                      // Food may not be in DB yet; in-memory update is enough
                    }
                    const value = parseFloat(quantityInput) || 0;
                    const result = foodService.scaleMacrosFromQuantity(updated, value, unitId, unitKind);
                    if (result.ok) {
                      computedMacrosRef.current = result.macros;
                      setProtein(String(result.macros.protein_g));
                      setCarbs(String(result.macros.carbs_g));
                      setFat(String(result.macros.fat_g));
                      setScalingReason(null);
                    }
                  }}
                  onCancel={() => setShowDensityModal(false)}
                />
              )}

              <View style={styles.macroInputRow}>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroInputLabel, { color: Colors.protein }]}>
                    Protein (g)
                  </Text>
                  <TextInput
                    style={[styles.macroTextInput, { borderColor: Colors.protein }]}
                    value={protein}
                    onChangeText={(v) => handleMacroEdit('protein', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    testID="protein-input"
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroInputLabel, { color: Colors.carbs }]}>
                    Carbs (g)
                  </Text>
                  <TextInput
                    style={[styles.macroTextInput, { borderColor: Colors.carbs }]}
                    value={carbs}
                    onChangeText={(v) => handleMacroEdit('carbs', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    testID="carbs-input"
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroInputLabel, { color: Colors.fat }]}>
                    Fat (g)
                  </Text>
                  <TextInput
                    style={[styles.macroTextInput, { borderColor: Colors.fat }]}
                    value={fat}
                    onChangeText={(v) => handleMacroEdit('fat', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    testID="fat-input"
                  />
                </View>
              </View>

              <View style={styles.caloriePreview}>
                <Text style={styles.caloriePreviewLabel}>Estimated Calories</Text>
                <Text style={styles.caloriePreviewValue}>
                  {formatNumber(computedCalories)}
                </Text>
              </View>

              {!isFromSavedFoods &&
                (!selectedFood || selectedFood.providerId === 'manual') && (
                  <TouchableOpacity
                    style={styles.saveToLibraryRow}
                    onPress={() => setSaveToLibrary((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Bookmark
                      size={18}
                      color={saveToLibrary ? colors.primary : Colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.saveToLibraryText,
                        saveToLibrary && styles.saveToLibraryTextActive,
                      ]}
                    >
                      Save to Saved Foods
                    </Text>
                    <View
                      style={[
                        styles.toggleTrack,
                        saveToLibrary && styles.toggleTrackActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          saveToLibrary && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                )}

              {selectedFood?.providerId === 'usda' && (
                <TouchableOpacity
                  style={styles.usdaSaveBtn}
                  onPress={async () => {
                    const fdcId = selectedFood.id.replace(/^usda:/, '');
                    const p = selectedFood.per100g;
                    const density = typeof selectedFood.density_g_per_ml === 'number' ? selectedFood.density_g_per_ml : undefined;
                    const addOpts =
                      unitKind === 'serving' && unitLabel && servingWeightG
                        ? { unitLabel, servingWeightG, density_g_per_ml: density }
                        : density !== undefined
                          ? { density_g_per_ml: density, servingSize: '100g' }
                          : { servingSize: '100g' };
                    await foodsRepo.addUsdaFood(fdcId, {
                      name: selectedFood.name,
                      brand: selectedFood.brand,
                      calories: p.calories,
                      protein: p.protein_g,
                      carbs: p.carbs_g,
                      fat: p.fat_g,
                      ...addOpts,
                    });
                    if (Platform.OS !== 'web') {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    const updated = await foodsRepo.getUserSavedFoods();
                    setSavedFoods(updated.map(foodsRepo.localFoodToNormalizedFood));
                  }}
                  activeOpacity={0.7}
                >
                  <Bookmark size={16} color={colors.primary} />
                  <Text style={styles.usdaSaveBtnText}>Save to Saved Foods</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={isSaving}
                testID="add-to-log-button"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Add to Today's Log</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {!showSuggestions &&
            !selectedFood &&
            query.length === 0 &&
            (recentFoods.length > 0 || savedFoods.length > 0) && (
              <View style={styles.recentsSection}>
                {recentFoods.length > 0 && (
                  <>
                    <View style={styles.recentHeader}>
                      <Clock size={14} color={Colors.textSecondary} />
                      <Text style={styles.recentTitle}>Recent</Text>
                    </View>
                    {recentFoods.slice(0, 10).map((item) => (
                      <TouchableOpacity
                        key={item.food.id}
                        style={styles.recentCard}
                        onPress={() =>
                          handleSelectRecent(item.food, item.lastServingGrams)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={styles.recentInfo}>
                          <Text style={styles.recentName} numberOfLines={1}>
                            {item.food.name}
                          </Text>
                          <Text style={styles.recentMeta}>
                            {item.lastServingGrams}g ·{' '}
                            {formatNumber(
                              (item.food.per100g.calories * item.lastServingGrams) /
                                100
                            )}{' '}
                            cal
                          </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {savedFoods.length > 0 && (
                  <>
                    <View style={[styles.recentHeader, { marginTop: recentFoods.length > 0 ? 20 : 0 }]}>
                      <Scan size={14} color={Colors.textSecondary} />
                      <Text style={styles.recentTitle}>Saved Foods</Text>
                    </View>
                    {savedFoods.slice(0, 10).map((food) => (
                      <TouchableOpacity
                        key={food.id}
                        style={styles.recentCard}
                        onPress={() => handleSelectSuggestion(food)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recentInfo}>
                          <Text style={styles.recentName} numberOfLines={1}>
                            {food.name}
                          </Text>
                          <Text style={styles.recentMeta}>
                            {formatNumber(food.per100g.calories)} cal ·{' '}
                            {formatNumber(food.per100g.protein_g)}p ·{' '}
                            {formatNumber(food.per100g.carbs_g)}c ·{' '}
                            {formatNumber(food.per100g.fat_g)}f per 100g
                          </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            )}
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <Pressable style={styles.voiceModalOverlay} onPress={() => setVoiceModalVisible(false)}>
          <Pressable style={styles.voiceModalSheet} onPress={() => {}}>
            <Text style={styles.voiceModalTitle}>Review Spoken Meal</Text>
            <Text style={styles.voiceModalSubtitle}>
              Check the items and macros before adding to your log.
            </Text>

            {voiceMealDraft && (() => {
              const activeUnresolved = voiceMealDraft.unresolved.filter(
                (u) => !dismissedUnresolvedIds.includes(u.id)
              );
              const hasResolved = voiceMealDraft.items.length > 0;
              const confirmLabel = hasResolved && activeUnresolved.length > 0
                ? `Add ${voiceMealDraft.items.length} item${voiceMealDraft.items.length !== 1 ? 's' : ''} to Log`
                : 'Confirm and Add';

              return (
                <>
                  <View style={styles.voiceTranscriptCard}>
                    <Text style={styles.voiceTranscriptLabel}>Transcript</Text>
                    <Text style={styles.voiceTranscriptModalText}>{voiceMealDraft.transcript}</Text>
                  </View>

                  <ScrollView
                    style={styles.voiceItemsScroll}
                    contentContainerStyle={styles.voiceItemsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {voiceMealDraft.items.map((item) => (
                      <View key={item.id} style={styles.voiceItemCard}>
                        <View style={styles.voiceItemHeader}>
                          <View style={styles.voiceItemNameRow}>
                            <Text style={styles.voiceItemName} numberOfLines={2}>
                              {item.quantity} {item.displayUnit} {item.displayName}
                            </Text>
                            {item.confidence !== 'high' && (
                              <View
                                style={[
                                  styles.voiceConfidenceBadge,
                                  item.confidence === 'medium'
                                    ? styles.voiceConfidenceMedium
                                    : styles.voiceConfidenceLow,
                                ]}
                              >
                                <Text style={styles.voiceConfidenceText}>
                                  {item.confidence === 'medium' ? '~match' : '?match'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.voiceItemCalories}>
                            {formatNumber(item.macros.calories)} cal
                          </Text>
                        </View>
                        <Text style={styles.voiceItemMacros}>
                          {formatNumber(item.macros.protein_g)}p · {formatNumber(item.macros.carbs_g)}c · {formatNumber(item.macros.fat_g)}f
                        </Text>
                        {item.confidence !== 'high' && item.alternatives.length > 0 && (
                          <Text style={styles.voiceAlternativesHint}>
                            {item.alternatives.length} alternative{item.alternatives.length > 1 ? 's' : ''} available — retake to refine
                          </Text>
                        )}
                      </View>
                    ))}

                    {activeUnresolved.length > 0 && (
                      <View style={styles.voiceUnresolvedCard}>
                        <Text style={styles.voiceUnresolvedTitle}>Could not resolve</Text>
                        {activeUnresolved.map((item) => (
                          <View key={item.id} style={styles.voiceUnresolvedRow}>
                            <View style={styles.voiceUnresolvedInfo}>
                              <Text style={styles.voiceUnresolvedLabel}>{item.label}</Text>
                              <Text style={styles.voiceUnresolvedReason}>{item.reason}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() =>
                                setDismissedUnresolvedIds((prev) => [...prev, item.id])
                              }
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              accessibilityLabel={`Dismiss ${item.label}`}
                            >
                              <X size={16} color={Colors.textTertiary} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {hasResolved && (
                          <Text style={styles.voiceUnresolvedDismissHint}>
                            Tap × to dismiss and add the rest
                          </Text>
                        )}
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.voiceTotalsCard}>
                    <Text style={styles.voiceTotalsTitle}>Meal totals</Text>
                    <Text style={styles.voiceTotalsValue}>
                      {formatNumber(voiceMealDraft.totals.calories)} cal · {formatNumber(voiceMealDraft.totals.protein_g)}p · {formatNumber(voiceMealDraft.totals.carbs_g)}c · {formatNumber(voiceMealDraft.totals.fat_g)}f
                    </Text>
                  </View>

                  {!isFromSavedFoods && (
                    <TouchableOpacity
                      style={styles.saveToLibraryRow}
                      onPress={() => setSaveToLibrary((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <Bookmark
                        size={18}
                        color={saveToLibrary ? colors.primary : Colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.saveToLibraryText,
                          saveToLibrary && styles.saveToLibraryTextActive,
                        ]}
                      >
                        Save to Saved Foods
                      </Text>
                      <View
                        style={[
                          styles.toggleTrack,
                          saveToLibrary && styles.toggleTrackActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            saveToLibrary && styles.toggleThumbActive,
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  )}

                  <View style={styles.voiceModalActions}>
                    <TouchableOpacity
                      style={styles.voiceSecondaryButton}
                      onPress={() => setVoiceModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.voiceSecondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.voicePrimaryButton,
                        (!hasResolved || isSaving) && styles.voicePrimaryButtonDisabled,
                      ]}
                      onPress={handleConfirmVoiceMeal}
                      activeOpacity={0.8}
                      disabled={!hasResolved || isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <Text style={styles.voicePrimaryButtonText}>{confirmLabel}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </DismissKeyboard>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtnContainer: {
    width: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  searchSection: {
    marginBottom: 8,
  },
  searchShell: {
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  scannerShell: {
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  apiNotice: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  apiNoticeText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  savedFoodsRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scanBarcodeBtnDisabled: {
    opacity: 0.45,
  },
  scanBarcodeText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  voiceSupportHint: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  savedFoodsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  savedFoodsLinkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  voiceModalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '82%',
  },
  voiceModalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  voiceModalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  voiceTranscriptCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginTop: 16,
  },
  voiceTranscriptLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  voiceTranscriptModalText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  voiceItemsScroll: {
    marginTop: 14,
    maxHeight: 280,
  },
  voiceItemsContent: {
    gap: 10,
  },
  voiceItemCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  voiceItemHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  voiceItemNameRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  voiceItemName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    flexShrink: 1,
  },
  voiceConfidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceConfidenceMedium: {
    backgroundColor: Colors.warningMuted,
  },
  voiceConfidenceLow: {
    backgroundColor: Colors.dangerMuted,
  },
  voiceConfidenceText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  voiceAlternativesHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  voiceItemCalories: {
    color: Colors.calories,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  voiceItemMacros: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  voiceUnresolvedCard: {
    backgroundColor: Colors.dangerMuted,
    borderRadius: 12,
    padding: 14,
  },
  voiceUnresolvedTitle: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  voiceUnresolvedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  voiceUnresolvedInfo: {
    flex: 1,
  },
  voiceUnresolvedLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  voiceUnresolvedReason: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  voiceUnresolvedDismissHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 10,
  },
  voiceTotalsCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  voiceTotalsTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  voiceTotalsValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  voiceModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  voiceSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 15,
    backgroundColor: Colors.cardElevated,
  },
  voiceSecondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  voicePrimaryButton: {
    flex: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: colors.primary,
  },
  voicePrimaryButtonDisabled: {
    opacity: 0.45,
  },
  voicePrimaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  suggestionsSection: {
    marginBottom: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  suggestionBrand: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  suggestionMacros: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 3,
  },
  quickAddSection: {
    marginBottom: 12,
  },
  quickAddHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  quickAddCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
  },
  quickAddContent: {
    flex: 1,
  },
  quickAddTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  quickAddMacros: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  quickAddForLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  quickAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  quickAddButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickAddAmountLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  resolvingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
  },
  resolvingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  otherResultsToggle: {
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  otherResultsToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  suggestionMacrosFor: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  manualFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  manualFallbackText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  entrySection: {
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  inputLabelMeta: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  inputLabelEdited: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputLabelEditedText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  servingSection: {
    marginBottom: 16,
  },
  servingControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingToggle: {
    flex: 3,
  },
  servingTextInput: {
    flex: 2,
    minWidth: 80,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  perItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  perItemLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  perItemInput: {
    width: 70,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  perItemUnit: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  servingHelper: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  servingUnit: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 10,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  macroInput: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  macroTextInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  caloriePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  caloriePreviewLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  caloriePreviewValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  saveToLibraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 8,
  },
  saveToLibraryText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  saveToLibraryTextActive: {
    color: Colors.text,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-end',
  },
  usdaSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  usdaSaveBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  recentsSection: {
    marginTop: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  recentMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
