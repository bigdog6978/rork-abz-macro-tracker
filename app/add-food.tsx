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
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Search, Clock, Pencil, X, ChevronRight } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useDailyLog } from '../providers/DailyLogProvider';
import { NormalizedFood } from '../features/food/types';
import * as foodService from '../features/food/foodService';
import SegmentedToggle from '../components/SegmentedToggle';
import {
  ServingUnit,
  getPreferredServingUnit,
  setPreferredServingUnit,
} from '../storage/userSettingsRepo';

const DEBOUNCE_MS = 300;
const OZ_TO_GRAMS = 28.349523125;

const UNIT_OPTIONS: { label: string; value: ServingUnit }[] = [
  { label: 'g', value: 'g' },
  { label: 'oz', value: 'oz' },
];

function gramsToDisplay(grams: number, unit: ServingUnit): string {
  if (unit === 'oz') {
    return String(Math.round((grams / OZ_TO_GRAMS) * 10) / 10);
  }
  return String(Math.round(grams));
}

function displayToGrams(input: string, unit: ServingUnit): number {
  const value = parseFloat(input) || 0;
  return unit === 'oz' ? value * OZ_TO_GRAMS : value;
}

export default function AddFoodScreen() {
  const { addEntry } = useDailyLog();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NormalizedFood[]>([]);
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computedMacrosRef = useRef<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);

  const apiAvailable = useMemo(() => foodService.isApiAvailable(), []);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    foodService
      .getRecentFoodsList()
      .then(setRecentFoods)
      .catch((err) => console.log('[AddFood] Error loading recents:', err));
  }, []);

  useEffect(() => {
    getPreferredServingUnit()
      .then((unit) => {
        if (unit !== 'g') {
          setServingUnit(unit);
          setServingGrams((prev) => gramsToDisplay(parseFloat(prev) || 100, unit));
        }
      })
      .catch((err) => console.log('[AddFood] Error loading unit pref:', err));
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
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await foodService.searchSuggestions(text);
          setSuggestions(results);
        } catch (err) {
          console.log('[AddFood] Search error:', err);
          setSuggestions([]);
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

      const grams = 100;
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="save-food-button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Check size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
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

            {!apiAvailable && query.length === 0 && (
              <View style={styles.apiNotice}>
                <Text style={styles.apiNoticeText}>
                  Food lookup unavailable — enter macros manually
                </Text>
              </View>
            )}
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
                      {food.per100g.calories} cal · {food.per100g.protein_g}p ·{' '}
                      {food.per100g.carbs_g}c · {food.per100g.fat_g}f per 100g
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
                <Text style={styles.noResultsText}>No results found</Text>
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

              <View style={styles.servingRow}>
                <View style={styles.servingInput}>
                  <View style={styles.servingLabelRow}>
                    <Text style={[styles.inputLabel, styles.servingLabelText]}>
                      Serving
                    </Text>
                    <SegmentedToggle
                      options={UNIT_OPTIONS}
                      value={servingUnit}
                      onChange={handleUnitChange}
                      accessibilityLabel={`Serving units: ${servingUnit === 'g' ? 'grams' : 'ounces'}`}
                    />
                  </View>
                  <View style={styles.servingInputRow}>
                    <TextInput
                      style={styles.servingTextInput}
                      value={servingGrams}
                      onChangeText={handleServingChange}
                      keyboardType="decimal-pad"
                      placeholder={servingUnit === 'oz' ? '3.5' : '100'}
                      placeholderTextColor={Colors.textTertiary}
                      testID="serving-input"
                    />
                    <Text style={styles.servingUnit}>{servingUnit}</Text>
                  </View>
                </View>
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
                  {Math.round(computedCalories)}
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
            recentFoods.length > 0 && (
              <View style={styles.recentsSection}>
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
                        {Math.round(
                          (item.food.per100g.calories * item.lastServingGrams) /
                            100
                        )}{' '}
                        cal
                      </Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
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
  servingRow: {
    marginBottom: 16,
  },
  servingInput: {
    flex: 1,
  },
  servingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  servingLabelText: {
    marginBottom: 0,
  },
  servingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingTextInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
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
