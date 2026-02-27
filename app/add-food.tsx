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
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Search, Clock, Pencil, X, ChevronRight, Scan, Bookmark } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import { NormalizedFood } from '../features/food/types';
import * as foodService from '../features/food/foodService';
import * as foodsRepo from '../src/data/foodsRepo';
import SegmentedToggle from '../components/SegmentedToggle';
import {
  MeasureMode,
  getPreferredServingUnit,
  setPreferredServingUnit,
} from '../storage/userSettingsRepo';
import {
  detectUnitFromName,
  pluralizeUnit,
} from '../features/food/servingDefaults';

const DEBOUNCE_MS = 300;
const OZ_TO_GRAMS = 28.349523125;

const MEASURE_OPTIONS: { label: string; value: MeasureMode }[] = [
  { label: 'Qty', value: 'qty' },
  { label: 'gm', value: 'grams' },
  { label: 'oz', value: 'ounces' },
];

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

/** Convert total grams to display value for the given measure mode */
function gramsToDisplay(
  grams: number,
  measureMode: MeasureMode,
  servingWeightG?: number
): string {
  if (measureMode === 'ounces') {
    return String(Math.round((grams / OZ_TO_GRAMS) * 10) / 10);
  }
  if (measureMode === 'qty' && servingWeightG && servingWeightG > 0) {
    const qty = grams / servingWeightG;
    return qty % 1 === 0 ? String(Math.round(qty)) : String(Math.round(qty * 10) / 10);
  }
  return String(Math.round(grams));
}

/** Convert display value to total grams */
function displayToTotalGrams(
  input: string,
  measureMode: MeasureMode,
  servingWeightG?: number
): number {
  const value = parseFloat(input) || 0;
  if (measureMode === 'ounces') return value * OZ_TO_GRAMS;
  if (measureMode === 'qty' && servingWeightG && servingWeightG > 0) {
    return value * servingWeightG;
  }
  return value;
}

export default function AddFoodScreen() {
  const { addEntry } = useDailyLog();
  const params = useLocalSearchParams<{ fromBarcode?: string }>();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NormalizedFood[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error' | 'rate_limited'>('idle');
  const [searchErrorCode, setSearchErrorCode] = useState<string | undefined>();
  const [searchErrorDetail, setSearchErrorDetail] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NormalizedFood | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [name, setName] = useState('');
  const [measureMode, setMeasureMode] = useState<MeasureMode>('grams');
  const [quantityInput, setQuantityInput] = useState('100');
  const [unitLabel, setUnitLabel] = useState<string>('egg');
  const [servingWeightG, setServingWeightG] = useState<number>(50);
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const [recentFoods, setRecentFoods] = useState<
    { food: NormalizedFood; lastServingGrams: number }[]
  >([]);
  const [savedFoods, setSavedFoods] = useState<NormalizedFood[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computedMacrosRef = useRef<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);

  const apiAvailable = useMemo(() => foodService.isApiAvailable(), []);

  useEffect(() => {
    foodService
      .getRecentFoodsList()
      .then(setRecentFoods)
      .catch((err) => console.log('[AddFood] Error loading recents:', err));
  }, []);

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
          setMeasureMode('ounces');
          setQuantityInput(gramsToDisplay(100, 'ounces'));
        }
      })
      .catch((err) => console.log('[AddFood] Error loading unit pref:', err));
  }, []);

  useEffect(() => {
    const id = params.fromBarcode;
    if (!id || typeof id !== 'string') return;
    foodsRepo
      .getFoodById(id)
      .then((local) => {
        if (local) {
          const norm = foodsRepo.localFoodToNormalizedFood(local);
          setSelectedFood(norm);
          setName(norm.name);
          setQuery(norm.name);
          setShowSuggestions(false);
          const detected = detectUnitFromName(norm.name);
          const savedUnit = local.unitLabel && local.servingWeightG
            ? { unitLabel: local.unitLabel, servingWeightG: local.servingWeightG }
            : null;
          const useUnits = !!(savedUnit || detected);
          if (useUnits) {
            setMeasureMode('qty');
            const u = savedUnit ?? detected!;
            setUnitLabel(u.unitLabel);
            setServingWeightG(u.servingWeightG);
            setQuantityInput('1');
          } else {
            setMeasureMode('grams');
            setQuantityInput('100');
          }
          const grams = useUnits
            ? (savedUnit ?? detected!).servingWeightG
            : 100;
          const macros = foodService.computeMacrosForServing(norm, grams);
          computedMacrosRef.current = macros;
          setProtein(String(macros.protein_g));
          setCarbs(String(macros.carbs_g));
          setFat(String(macros.fat_g));
        }
      })
      .catch((err) => console.log('[AddFood] Error loading barcode food:', err));
  }, [params.fromBarcode]);

  const handleScanBarcode = useCallback(() => {
    router.push('/barcode-scanner');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

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
        setSuggestions([]);
        setSearchStatus('idle');
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchStatus('loading');
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await foodService.searchSuggestions(text);
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
      console.log('[AddFood] Selected suggestion:', food.name);
      setSelectedFood(food);
      setName(food.name);
      setShowSuggestions(false);
      setQuery(food.name);
      setIsCustomized(false);

      const detected = detectUnitFromName(food.name);
      if (detected) {
        setMeasureMode('qty');
        setUnitLabel(detected.unitLabel);
        setServingWeightG(detected.servingWeightG);
        setQuantityInput('1');
        const grams = detected.servingWeightG;
        const macros = foodService.computeMacrosForServing(food, grams);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
      } else {
        setMeasureMode('grams');
        setQuantityInput('100');
        const macros = foodService.computeMacrosForServing(food, 100);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
      }

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    []
  );

  const handleQuantityChange = useCallback(
    (text: string) => {
      setQuantityInput(text);
      const grams = displayToTotalGrams(text, measureMode, servingWeightG);
      if (selectedFood && grams > 0) {
        const macros = foodService.computeMacrosForServing(selectedFood, grams);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
        setIsCustomized(false);
      }
    },
    [selectedFood, measureMode, servingWeightG]
  );

  const handleServingWeightChange = useCallback(
    (text: string) => {
      const val = parseFloat(text) || 0;
      setServingWeightG(val > 0 ? val : 50);
      const grams = displayToTotalGrams(quantityInput, 'qty', val > 0 ? val : 50);
      if (selectedFood && grams > 0) {
        const macros = foodService.computeMacrosForServing(selectedFood, grams);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
        setIsCustomized(false);
      }
    },
    [selectedFood, quantityInput]
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

  const saveManualToLibrary = useCallback(
    async (
      foodName: string,
      grams: number,
      macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
      opts?: { unitLabel?: string; servingWeightG?: number }
    ) => {
      const scale = grams > 0 ? 100 / grams : 1;
      const per100g = {
        calories: Math.round(macros.calories * scale),
        protein: macros.protein_g * scale,
        carbs: macros.carbs_g * scale,
        fat: macros.fat_g * scale,
      };
      const addOpts = opts?.unitLabel && opts?.servingWeightG
        ? { unitLabel: opts.unitLabel, servingWeightG: opts.servingWeightG }
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

    setIsSaving(true);

    try {
      const macros = {
        calories: Math.round(computedCalories),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      };

      const grams = displayToTotalGrams(quantityInput, measureMode, servingWeightG) || 100;

      const qtyVal = parseFloat(quantityInput) || 0;
      const entry = foodService.createFoodEntry(
        selectedFood,
        foodName,
        grams,
        macros,
        isCustomized,
        measureMode === 'qty' && unitLabel && servingWeightG
          ? { measureMode: 'qty', quantity: qtyVal || 1, servingWeightG }
          : measureMode === 'ounces'
            ? { measureMode: 'ounces', quantity: qtyVal }
            : { measureMode: 'grams', quantity: grams }
      );

      addEntry(entry);

      const normalizedForRecent =
        selectedFood ??
        foodService.createManualNormalizedFood(foodName, macros, grams);
      await foodService.addToRecent(normalizedForRecent, grams);
      if (selectedFood?.providerId === 'openfoodfacts') {
        foodsRepo.recordFoodSelection(selectedFood.id).catch(() => {});
      }

      const isManual = !selectedFood || selectedFood.providerId === 'manual';
      if (saveToLibrary && isManual) {
        const unitOpts = measureMode === 'qty' && unitLabel && servingWeightG
          ? { unitLabel, servingWeightG }
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
    measureMode,
    servingWeightG,
    selectedFood,
    isCustomized,
    saveToLibrary,
    saveManualToLibrary,
    addEntry,
  ]);

  const handleManualMode = useCallback(() => {
    setSelectedFood(null);
    setName(query);
    setShowSuggestions(false);
    setIsCustomized(false);
    computedMacrosRef.current = null;
    const detected = detectUnitFromName(query);
    if (detected) {
      setMeasureMode('qty');
      setUnitLabel(detected.unitLabel);
      setServingWeightG(detected.servingWeightG);
      setQuantityInput('1');
    } else {
      setMeasureMode('grams');
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
    setMeasureMode('grams');
    setQuantityInput('100');
    setUnitLabel('egg');
    setServingWeightG(50);
    setIsCustomized(false);
    computedMacrosRef.current = null;
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
      if (detected) {
        setMeasureMode('qty');
        setUnitLabel(detected.unitLabel);
        setServingWeightG(detected.servingWeightG);
        setQuantityInput(grams === detected.servingWeightG ? '1' : String(Math.round((grams / detected.servingWeightG) * 10) / 10));
      } else {
        setMeasureMode('grams');
        setQuantityInput(String(Math.round(grams)));
      }
      const macros = foodService.computeMacrosForServing(food, grams);
      computedMacrosRef.current = macros;
      setProtein(String(macros.protein_g));
      setCarbs(String(macros.carbs_g));
      setFat(String(macros.fat_g));

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    []
  );

  const handleMeasureModeChange = useCallback(
    (newMode: MeasureMode) => {
      const currentGrams = displayToTotalGrams(quantityInput, measureMode, servingWeightG);
      let newServingWeightG = servingWeightG;
      if (newMode === 'qty') {
        const nameToDetect = selectedFood?.name ?? (name || query);
        const detected = detectUnitFromName(nameToDetect);
        if (detected) {
          setUnitLabel(detected.unitLabel);
          setServingWeightG(detected.servingWeightG);
          newServingWeightG = detected.servingWeightG;
        } else {
          setUnitLabel('serving');
          setServingWeightG(100);
          newServingWeightG = 100;
        }
      }
      setMeasureMode(newMode);
      setQuantityInput(gramsToDisplay(currentGrams, newMode, newServingWeightG));
      if (newMode === 'grams') {
        setPreferredServingUnit('g').catch((err) =>
          console.log('[AddFood] Error saving unit pref:', err)
        );
      } else if (newMode === 'ounces') {
        setPreferredServingUnit('oz').catch((err) =>
          console.log('[AddFood] Error saving unit pref:', err)
        );
      }
      if (selectedFood && currentGrams > 0) {
        const macros = foodService.computeMacrosForServing(selectedFood, currentGrams);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
      }
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [quantityInput, measureMode, servingWeightG, selectedFood, name, query]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
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
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="save-food-button"
              style={styles.headerIconBtn}
            >
              <View style={styles.headerIconWrap}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Check size={22} color={Colors.primary} />
                )}
              </View>
            </TouchableOpacity>
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
          <View style={styles.searchSection}>
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
                autoFocus
                testID="food-search-input"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSelection}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={styles.searchSpinner}
                />
              )}
            </View>

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
                <Scan size={18} color={Colors.primary} />
                <Text style={styles.scanBarcodeText}>Scan Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.savedFoodsLink}
                onPress={() => router.push('/saved-foods')}
                activeOpacity={0.7}
              >
                <Text style={styles.savedFoodsLinkText}>Saved Foods</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              {suggestions.map((food) => (
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
                    <Text style={styles.suggestionMacros}>
                      {formatNumber(food.per100g.calories)} cal · {formatNumber(food.per100g.protein_g)}p ·{' '}
                      {formatNumber(food.per100g.carbs_g)}c · {formatNumber(food.per100g.fat_g)}f per 100g
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.manualFallback}
                onPress={handleManualMode}
                activeOpacity={0.7}
              >
                <Pencil size={14} color={Colors.primary} />
                <Text style={styles.manualFallbackText}>
                  Can't find it? Enter manually
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
                  <Pencil size={14} color={Colors.primary} />
                  <Text style={styles.manualFallbackText}>Enter manually</Text>
                </TouchableOpacity>
              </View>
            )}

          {(!showSuggestions || query.length === 0) && (
            <View style={styles.entrySection}>
              {selectedFood && (
                <View style={styles.selectedBanner}>
                  <View style={styles.selectedBannerLeft}>
                    <View style={styles.providerBadge}>
                      <Text style={styles.providerBadgeText}>
                        {selectedFood.providerId.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {selectedFood.name}
                    </Text>
                  </View>
                  {isCustomized && (
                    <View style={styles.editedBadge}>
                      <Pencil size={10} color={Colors.warning} />
                      <Text style={styles.editedBadgeText}>Edited</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Food Name</Text>
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
                  {measureMode === 'qty'
                    ? `Qty (${pluralizeUnit(parseFloat(quantityInput) || 1, unitLabel)})`
                    : measureMode === 'grams'
                      ? 'Amount (gm)'
                      : 'Amount (oz)'}
                </Text>
                <View style={styles.servingControlRow}>
                  <TextInput
                    style={styles.servingTextInput}
                    value={quantityInput}
                    onChangeText={handleQuantityChange}
                    keyboardType="decimal-pad"
                    placeholder={
                      measureMode === 'qty' ? '1' : measureMode === 'ounces' ? '3.5' : '100'
                    }
                    placeholderTextColor={Colors.textTertiary}
                    testID="serving-input"
                  />
                  <SegmentedToggle
                    options={MEASURE_OPTIONS}
                    value={measureMode}
                    onChange={handleMeasureModeChange}
                    accessibilityLabel={`Measure mode: ${measureMode}`}
                    style={styles.servingToggle}
                  />
                </View>
                {measureMode === 'qty' && (
                  <View style={styles.perItemRow}>
                    <Text style={styles.perItemLabel}>1 {unitLabel} =</Text>
                    <TextInput
                      style={styles.perItemInput}
                      value={String(servingWeightG)}
                      onChangeText={handleServingWeightChange}
                      keyboardType="decimal-pad"
                      placeholder="50"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <Text style={styles.perItemUnit}>gm</Text>
                  </View>
                )}
                {measureMode === 'qty' && (
                  <Text style={styles.servingHelper}>Used to calculate macros.</Text>
                )}
              </View>

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

              {(!selectedFood || selectedFood.providerId === 'manual') && (
                <TouchableOpacity
                  style={styles.saveToLibraryRow}
                  onPress={() => setSaveToLibrary((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Bookmark
                    size={18}
                    color={saveToLibrary ? Colors.primary : Colors.textTertiary}
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
                    const addOpts = measureMode === 'qty' && unitLabel && servingWeightG
                      ? { unitLabel, servingWeightG }
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
                    const updated = await foodsRepo.getSavedFoods();
                    setSavedFoods(updated.map(foodsRepo.localFoodToNormalizedFood));
                  }}
                  activeOpacity={0.7}
                >
                  <Bookmark size={16} color={Colors.primary} />
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
                  <ActivityIndicator size="small" color={Colors.white} />
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    width: 44,
    height: 44,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
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
    marginTop: 12,
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  scanBarcodeText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  savedFoodsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  savedFoodsLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
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
  manualFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  manualFallbackText: {
    color: Colors.primary,
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
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  selectedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  providerBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  selectedName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editedBadgeText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
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
    backgroundColor: Colors.caloriesMuted,
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
    color: Colors.calories,
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
    backgroundColor: Colors.primary,
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
    borderColor: Colors.primary,
    alignSelf: 'flex-start',
  },
  usdaSaveBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.white,
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
