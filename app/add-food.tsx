import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Search, Pencil, X, ChevronRight, Scan, Bookmark, Mic, LoaderCircle } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { NormalizedFood } from '../features/food/types';
import * as foodService from '../features/food/foodService';
import * as foodsRepo from '../src/data/foodsRepo';
import QuantityPillsCompact from '../components/ui/QuantityPillsCompact';
import QuantityCallout from '../components/ui/QuantityCallout';
import DensityModal from '../components/ui/DensityModal';
import VoiceRecordingSheet from '../components/ui/VoiceRecordingSheet';
import BarcodeScannerPanel from '../components/ui/BarcodeScannerPanel';
import type { UnitKind, UnitId } from '../src/lib/units';
import { getPreferredServingUnit } from '../storage/userSettingsRepo';
import {
  detectUnitFromName,
  pluralizeUnit,
} from '../features/food/servingDefaults';
import { useFoodSearch } from '../features/food/hooks/useFoodSearch';
import { useQuantityForm } from '../features/food/hooks/useQuantityForm';
import { useVoiceMeal } from '../features/food/hooks/useVoiceMeal';
import SuggestionsSection from '../components/add-food/SuggestionsSection';
import RecentsSection, { type RecentFoodItem } from '../components/add-food/RecentsSection';
import VoiceMealReviewModal from '../components/add-food/VoiceMealReviewModal';
import { Radius } from '../theme/tokens';
import { track } from '../services/analytics';

const HEADER_BUTTON_SIZE = 44;

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

export default function AddFoodScreen() {
  const { addEntry, addEntries } = useDailyLog();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    fromBarcode?: string;
    dateKey?: string;
    sourceContext?: string;
    autoStart?: string;
  }>();
  const dateKeyParam = typeof params.dateKey === 'string' ? params.dateKey : undefined;
  const isFromSavedFoods = params.sourceContext === 'saved-foods';

  const {
    query,
    setQuery,
    suggestions,
    searchStatus,
    searchErrorCode,
    searchErrorDetail,
    isSearching,
    showSuggestions,
    setShowSuggestions,
    parsedInput,
    setParsedInput,
    textResolvedItem,
    setTextResolvedItem,
    isResolvingText,
    setIsResolvingText,
    showOtherResults,
    setShowOtherResults,
    parsedInputRef,
    resolveRequestIdRef,
    handleSearch,
  } = useFoodSearch();

  const {
    name,
    setName,
    unitKind,
    setUnitKind,
    unitId,
    setUnitId,
    quantityInput,
    setQuantityInput,
    unitLabel,
    setUnitLabel,
    servingWeightG,
    setServingWeightG,
    showDensityModal,
    setShowDensityModal,
    scalingReason,
    setScalingReason,
    protein,
    carbs,
    fat,
    setProtein,
    setCarbs,
    setFat,
    isCustomized,
    setIsCustomized,
    selectedFood,
    setSelectedFood,
    computedMacrosRef,
    computedCalories,
    applyScalingResult,
    applyMacros,
    handleQuantityChange,
    handleServingWeightChange,
    handleMacroEdit,
    handleKindChange: handleKindChangeForm,
    handleUnitChange,
    resetForm,
  } = useQuantityForm();

  const [isSaving, setIsSaving] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerViewportWidth, setScannerViewportWidth] = useState(0);
  const [recentFoods, setRecentFoods] = useState<RecentFoodItem[]>([]);
  const [savedFoods, setSavedFoods] = useState<NormalizedFood[]>([]);

  const scannerAnim = useRef(new Animated.Value(0)).current;

  const apiAvailable = useMemo(() => foodService.isApiAvailable(), []);

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

  const handleVoiceWillStart = useCallback(() => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    if (scannerOpen) {
      animateScanner(0, () => setScannerOpen(false));
    }
  }, [animateScanner, scannerOpen, setShowSuggestions]);

  const {
    voiceMealAvailable,
    isListening,
    voiceTranscript,
    isVoiceProcessing,
    voiceMealDraft,
    voiceModalVisible,
    setVoiceModalVisible,
    dismissedUnresolvedIds,
    setDismissedUnresolvedIds,
    handleStartVoiceMeal,
    handleCancelVoice,
  } = useVoiceMeal({ onWillStart: handleVoiceWillStart });

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
  }, [setUnitKind, setUnitId, setQuantityInput]);

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
  }, [
    animateScanner,
    computedMacrosRef,
    setCarbs,
    setFat,
    setIsCustomized,
    setName,
    setProtein,
    setQuantityInput,
    setQuery,
    setScalingReason,
    setSelectedFood,
    setServingWeightG,
    setShowSuggestions,
    setUnitId,
    setUnitKind,
    setUnitLabel,
  ]);

  useEffect(() => {
    const id = params.fromBarcode;
    if (!id || typeof id !== 'string') return;
    loadFoodIntoForm(id);
  }, [loadFoodIntoForm, params.fromBarcode]);

  // FAB quick actions deep-link straight into voice / scanner (fire once).
  const autoStartFiredRef = useRef(false);
  useEffect(() => {
    if (autoStartFiredRef.current) return;
    if (params.autoStart === 'voice') {
      autoStartFiredRef.current = true;
      void handleStartVoiceMeal();
    } else if (params.autoStart === 'scanner') {
      autoStartFiredRef.current = true;
      handleScanBarcode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.autoStart]);

  const handleScanBarcode = useCallback(() => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    if (scannerOpen) {
      animateScanner(0, () => setScannerOpen(false));
      return;
    }
    setScannerOpen(true);
    animateScanner(1);
  }, [animateScanner, scannerOpen, setShowSuggestions]);

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
      track('food_logged', { method: 'voice', items: entries.length });
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
  }, [addEntries, dateKeyParam, voiceMealDraft, saveToLibrary, saveManualToLibrary, isFromSavedFoods, setVoiceModalVisible]);

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
          applyScalingResult(
            foodService.scaleMacrosFromQuantity(foodForServing, parsed.quantity, parsed.unitId, parsed.unitKind)
          );
        } else {
          applyScalingResult(
            foodService.scaleMacrosFromQuantity(foodWithServing, parsed.quantity, parsed.unitId, parsed.unitKind)
          );
        }
      } else if (detected) {
        setUnitKind('serving');
        setUnitId('piece');
        setUnitLabel(detected.unitLabel);
        setServingWeightG(detected.servingWeightG);
        setQuantityInput('1');
        applyScalingResult(
          foodService.scaleMacrosFromQuantity(foodWithServing, 1, 'piece', 'serving')
        );
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
        const result = foodService.scaleMacrosFromQuantity(resolvedFood, ozValue, 'oz', 'mass');
        if (!applyScalingResult(result)) {
          const lastGrams = lastGramsFromRecent(resolvedFood);
          const gramsForFallback = lastGrams ?? ozPerG;
          applyMacros(foodService.computeMacrosForServing(resolvedFood, gramsForFallback));
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
        const result = foodService.scaleMacrosFromQuantity(resolvedFood, lbValue, 'lb', 'mass');
        if (!applyScalingResult(result)) {
          const lastGrams = lastGramsFromRecent(resolvedFood);
          const gramsForFallback = lastGrams ?? lbPerG;
          applyMacros(foodService.computeMacrosForServing(resolvedFood, gramsForFallback));
        }
      } else {
        // Default to the user's last-logged portion of this food (recents),
        // falling back to 100 g only for never-logged foods.
        const lastGrams = lastGramsFromRecent(resolvedFood);
        const grams = lastGrams != null && lastGrams > 0 ? Math.round(lastGrams) : 100;
        setUnitKind('mass');
        setUnitId('g');
        setQuantityInput(String(grams));
        applyScalingResult(
          foodService.scaleMacrosFromQuantity(resolvedFood, grams, 'g', 'mass')
        );
      }
    },
    [
      recentFoods,
      applyMacros,
      applyScalingResult,
      parsedInputRef,
      resolveRequestIdRef,
      setIsCustomized,
      setIsResolvingText,
      setName,
      setParsedInput,
      setQuantityInput,
      setQuery,
      setSelectedFood,
      setServingWeightG,
      setShowSuggestions,
      setTextResolvedItem,
      setUnitId,
      setUnitKind,
      setUnitLabel,
    ]
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
      track('food_logged', { method: 'best_match', items: 1 });
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
  }, [textResolvedItem, addEntry, dateKeyParam, saveToLibrary, saveManualToLibrary, isFromSavedFoods, parsedInputRef, setParsedInput, setTextResolvedItem]);

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
      track('food_logged', {
        method: selectedFood
          ? selectedFood.providerId === 'manual'
            ? 'saved'
            : 'search'
          : 'manual',
        items: 1,
      });

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
    unitLabel,
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
  }, [
    query,
    computedMacrosRef,
    setIsCustomized,
    setName,
    setQuantityInput,
    setScalingReason,
    setSelectedFood,
    setServingWeightG,
    setShowSuggestions,
    setUnitId,
    setUnitKind,
    setUnitLabel,
  ]);

  const handleClearSelection = useCallback(() => {
    resetForm();
    setQuery('');
    setShowSuggestions(false);
  }, [resetForm, setQuery, setShowSuggestions]);

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
    },
    [
      computedMacrosRef,
      setCarbs,
      setFat,
      setIsCustomized,
      setName,
      setProtein,
      setQuantityInput,
      setQuery,
      setScalingReason,
      setSelectedFood,
      setServingWeightG,
      setShowSuggestions,
      setUnitId,
      setUnitKind,
      setUnitLabel,
    ]
  );

  const handleKindChange = useCallback(
    (k: UnitKind) => {
      handleKindChangeForm(k, name || query);
    },
    [handleKindChangeForm, name, query]
  );

  const handleToggleOtherResults = useCallback(() => {
    setShowOtherResults((v) => !v);
  }, [setShowOtherResults]);

  const handleDismissUnresolved = useCallback(
    (id: string) => {
      setDismissedUnresolvedIds((prev) => [...prev, id]);
    },
    [setDismissedUnresolvedIds]
  );

  const handleToggleSaveToLibrary = useCallback(() => {
    setSaveToLibrary((v) => !v);
  }, []);

  const handleCloseVoiceModal = useCallback(() => {
    setVoiceModalVisible(false);
  }, [setVoiceModalVisible]);

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
              <PhysiqPressable
                feedback="tap"
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="close-add-food"
                style={styles.headerIconBtn}
              >
                <View style={styles.headerIconWrap}>
                  <X size={22} color={Colors.textSecondary} />
                </View>
              </PhysiqPressable>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerBtnContainer}>
              <PhysiqPressable
                feedback="confirm"
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
              </PhysiqPressable>
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
                  <PhysiqPressable
                    feedback="tap"
                    onPress={handleClearSelection}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={Colors.textTertiary} />
                  </PhysiqPressable>
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
              <PhysiqPressable
                feedback="tap"
                style={styles.scanBarcodeBtn}
                onPress={handleScanBarcode}
                testID="scan-barcode-button"
              >
                {scannerOpen ? <X size={18} color={colors.primary} /> : <Scan size={18} color={colors.primary} />}
                <Text style={styles.scanBarcodeText}>{scannerOpen ? 'Close Scanner' : 'Scan Barcode'}</Text>
              </PhysiqPressable>
              <PhysiqPressable
                feedback="tap"
                style={[styles.scanBarcodeBtn, !voiceMealAvailable && styles.scanBarcodeBtnDisabled]}
                onPress={handleStartVoiceMeal}
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
              </PhysiqPressable>
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
              <PhysiqPressable
                feedback="tap"
                style={styles.savedFoodsLink}
                onPress={() => router.push('/saved-foods')}
              >
                <Text style={styles.savedFoodsLinkText}>Saved Foods</Text>
                <ChevronRight size={16} color={colors.primary} />
              </PhysiqPressable>
            </View>
          </View>

          {showSuggestions && (textResolvedItem || isResolvingText || suggestions.length > 0) && (
            <SuggestionsSection
              suggestions={suggestions}
              parsedInput={parsedInput}
              textResolvedItem={textResolvedItem}
              isResolvingText={isResolvingText}
              showOtherResults={showOtherResults}
              onToggleOtherResults={handleToggleOtherResults}
              isSaving={isSaving}
              onConfirmTextResolved={handleConfirmTextResolved}
              onSelectSuggestion={handleSelectSuggestion}
              onManualMode={handleManualMode}
            />
          )}

          {showSuggestions &&
            !isSearching &&
            query.length > 0 &&
            suggestions.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {getSearchErrorMessage(searchStatus, searchErrorCode, searchErrorDetail)}
                </Text>
                <PhysiqPressable
                  feedback="tap"
                  style={styles.manualFallback}
                  onPress={handleManualMode}
                >
                  <Pencil size={14} color={colors.primary} />
                  <Text style={styles.manualFallbackText}>Enter manually</Text>
                </PhysiqPressable>
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
                          applyScalingResult(
                            foodService.scaleMacrosFromQuantity(selectedFood, 100, 'g', 'mass')
                          );
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
                              applyScalingResult(
                                foodService.scaleMacrosFromQuantity(selectedFood, 100, 'g', 'mass')
                              );
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
                      applyScalingResult(result);
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
                  <PhysiqPressable
                    feedback="select"
                    style={styles.saveToLibraryRow}
                    onPress={handleToggleSaveToLibrary}
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
                  </PhysiqPressable>
                )}

              {selectedFood?.providerId === 'usda' && (
                <PhysiqPressable
                  feedback="confirm"
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
                >
                  <Bookmark size={16} color={colors.primary} />
                  <Text style={styles.usdaSaveBtnText}>Save to Saved Foods</Text>
                </PhysiqPressable>
              )}

              <PhysiqPressable
                feedback="confirm"
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSaving}
                testID="add-to-log-button"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Add to Today&apos;s Log</Text>
                )}
              </PhysiqPressable>
            </View>
          )}

          {!showSuggestions &&
            !selectedFood &&
            query.length === 0 &&
            (recentFoods.length > 0 || savedFoods.length > 0) && (
              <RecentsSection
                recentFoods={recentFoods}
                savedFoods={savedFoods}
                onSelectRecent={handleSelectRecent}
                onSelectSaved={handleSelectSuggestion}
              />
            )}
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      <VoiceMealReviewModal
        visible={voiceModalVisible}
        draft={voiceMealDraft}
        dismissedUnresolvedIds={dismissedUnresolvedIds}
        onDismissUnresolved={handleDismissUnresolved}
        showSaveToLibrary={!isFromSavedFoods}
        saveToLibrary={saveToLibrary}
        onToggleSaveToLibrary={handleToggleSaveToLibrary}
        isSaving={isSaving}
        onClose={handleCloseVoiceModal}
        onConfirm={handleConfirmVoiceMeal}
      />
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
});
