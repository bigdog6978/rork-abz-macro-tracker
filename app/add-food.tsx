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
import { Check, Search, Clock, Pencil, X, ChevronRight, Scan } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import { NormalizedFood } from '../features/food/types';
import * as foodService from '../features/food/foodService';
import * as foodsRepo from '../src/data/foodsRepo';
import SegmentedToggle from '../components/SegmentedToggle';
import {
  ServingUnit,
  getPreferredServingUnit,
  setPreferredServingUnit,
} from '../storage/userSettingsRepo';

const DEBOUNCE_MS = 300;
const OZ_TO_GRAMS = 28.349523125;
const QTY_BASE_GRAMS = 100;

const UNIT_OPTIONS: { label: string; value: ServingUnit }[] = [
  { label: 'Qty', value: 'qty' },
  { label: 'gm', value: 'g' },
  { label: 'oz', value: 'oz' },
];

const COUNT_FOOD_PATTERN =
  /\b(egg|eggs|date|dates|banana|bananas|apple|apples|slice|slices|piece|pieces|bar|bars|scoop|scoops|wrap|wraps|patty|patties|muffin|muffins|bagel|bagels|roll|rolls|cookie|cookies|biscuit|biscuits)\b/i;

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

function gramsToDisplay(grams: number, unit: ServingUnit): string {
  if (unit === 'oz') {
    return String(Math.round((grams / OZ_TO_GRAMS) * 10) / 10);
  }
  if (unit === 'qty') {
    const qty = grams / QTY_BASE_GRAMS;
    return String(Math.round(qty * 10) / 10);
  }
  return String(Math.round(grams));
}

function displayToGrams(input: string, unit: ServingUnit): number {
  const value = parseFloat(input) || 0;
  if (unit === 'oz') return value * OZ_TO_GRAMS;
  if (unit === 'qty') return value * QTY_BASE_GRAMS;
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
  const [servingGrams, setServingGrams] = useState('100');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      .getSavedFoods('openfoodfacts')
      .then((local) => local.map(foodsRepo.localFoodToNormalizedFood))
      .then(setSavedFoods)
      .catch((err) => console.log('[AddFood] Error loading saved foods:', err));
  }, [params.fromBarcode]);

  useEffect(() => {
    getPreferredServingUnit()
      .then((unit) => {
        if (unit !== 'g') {
          setServingUnit(unit);
          setServingGrams(gramsToDisplay(100, unit));
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
          setProtein(String(norm.per100g.protein_g));
          setCarbs(String(norm.per100g.carbs_g));
          setFat(String(norm.per100g.fat_g));
          setServingGrams(gramsToDisplay(100, servingUnit || 'g'));
          computedMacrosRef.current = {
            calories: norm.per100g.calories,
            protein_g: norm.per100g.protein_g,
            carbs_g: norm.per100g.carbs_g,
            fat_g: norm.per100g.fat_g,
          };
        }
      })
      .catch((err) => console.log('[AddFood] Error loading barcode food:', err));
  }, [params.fromBarcode, servingUnit]);

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

      const autoUnit = COUNT_FOOD_PATTERN.test(food.name) ? 'qty' : servingUnit;
      if (autoUnit !== servingUnit) setServingUnit(autoUnit);

      const grams = 100;
      setServingGrams(gramsToDisplay(grams, autoUnit));
      const macros = foodService.computeMacrosForServing(food, grams);
      computedMacrosRef.current = macros;
      setProtein(String(macros.protein_g));
      setCarbs(String(macros.carbs_g));
      setFat(String(macros.fat_g));

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [servingUnit]
  );

  const handleServingChange = useCallback(
    (text: string) => {
      setServingGrams(text);
      const grams = displayToGrams(text, servingUnit);
      if (selectedFood && grams > 0) {
        const macros = foodService.computeMacrosForServing(selectedFood, grams);
        computedMacrosRef.current = macros;
        setProtein(String(macros.protein_g));
        setCarbs(String(macros.carbs_g));
        setFat(String(macros.fat_g));
        setIsCustomized(false);
      }
    },
    [selectedFood, servingUnit]
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

    setIsSaving(true);

    try {
      const macros = {
        calories: Math.round(computedCalories),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      };

      const grams = displayToGrams(servingGrams, servingUnit) || 100;

      const entry = foodService.createFoodEntry(
        selectedFood,
        foodName,
        grams,
        macros,
        isCustomized
      );

      addEntry(entry);

      const normalizedForRecent =
        selectedFood ??
        foodService.createManualNormalizedFood(foodName, macros, grams);
      await foodService.addToRecent(normalizedForRecent, grams);
      if (selectedFood?.providerId === 'openfoodfacts') {
        foodsRepo.recordFoodSelection(selectedFood.id).catch(() => {});
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
    servingGrams,
    servingUnit,
    selectedFood,
    isCustomized,
    addEntry,
  ]);

  const handleManualMode = useCallback(() => {
    setSelectedFood(null);
    setName(query);
    setShowSuggestions(false);
    setIsCustomized(false);
    computedMacrosRef.current = null;
  }, [query]);

  const handleClearSelection = useCallback(() => {
    setSelectedFood(null);
    setName('');
    setQuery('');
    setProtein('');
    setCarbs('');
    setFat('');
    setServingGrams(gramsToDisplay(100, servingUnit));
    setIsCustomized(false);
    computedMacrosRef.current = null;
    setShowSuggestions(false);
  }, [servingUnit]);

  const handleSelectRecent = useCallback(
    (food: NormalizedFood, lastGrams: number) => {
      setSelectedFood(food);
      setName(food.name);
      setQuery(food.name);
      setShowSuggestions(false);
      setIsCustomized(false);

      const grams = lastGrams || 100;
      setServingGrams(gramsToDisplay(grams, servingUnit));
      const macros = foodService.computeMacrosForServing(food, grams);
      computedMacrosRef.current = macros;
      setProtein(String(macros.protein_g));
      setCarbs(String(macros.carbs_g));
      setFat(String(macros.fat_g));

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [servingUnit]
  );

  const handleUnitChange = useCallback(
    (newUnit: ServingUnit) => {
      const currentGrams = displayToGrams(servingGrams, servingUnit);
      setServingUnit(newUnit);
      setServingGrams(gramsToDisplay(currentGrams, newUnit));
      setPreferredServingUnit(newUnit).catch((err) =>
        console.log('[AddFood] Error saving unit pref:', err)
      );
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [servingGrams, servingUnit]
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

            <TouchableOpacity
              style={styles.scanBarcodeBtn}
              onPress={handleScanBarcode}
              activeOpacity={0.7}
              testID="scan-barcode-button"
            >
              <Scan size={18} color={Colors.primary} />
              <Text style={styles.scanBarcodeText}>Scan Barcode</Text>
            </TouchableOpacity>
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
                <Text style={styles.inputLabel}>Serving Size</Text>
                <View style={styles.servingControlRow}>
                  <TextInput
                    style={styles.servingTextInput}
                    value={servingGrams}
                    onChangeText={handleServingChange}
                    keyboardType="decimal-pad"
                    placeholder={servingUnit === 'oz' ? '3.5' : servingUnit === 'qty' ? '1' : '100'}
                    placeholderTextColor={Colors.textTertiary}
                    testID="serving-input"
                  />
                  <SegmentedToggle
                    options={UNIT_OPTIONS}
                    value={servingUnit}
                    onChange={handleUnitChange}
                    accessibilityLabel={`Serving units: ${servingUnit}`}
                    style={styles.servingToggle}
                  />
                </View>
                {servingUnit === 'qty' && (
                  <Text style={styles.servingHelper}>Based on: 100g serving</Text>
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
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
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
