import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import * as Haptics from 'expo-haptics';
import { Check, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import QuantityPillsCompact from '../components/ui/QuantityPillsCompact';
import type { UnitId, UnitKind } from '../src/lib/units';
import { toGrams, toMilliliters, mlToGrams } from '../src/lib/units';
import { getVolumeWeightGrams, detectUnitFromName } from '../features/food/servingDefaults';
import { inferDensityFromName } from '../features/food/liquidDensity';
import * as foodService from '../features/food/foodService';
import { entryMealType } from '../features/food/mealType';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, MealType } from '../types';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

// ─── Unit conversion helpers ──────────────────────────────────────────────────

/**
 * Convert a display quantity to total grams, using density (for liquids) or
 * volume-weight lookup (for semi-solids like butter, peanut butter) as needed.
 */
function getTotalGrams(
  qty: number,
  kind: UnitKind,
  unit: UnitId,
  foodName: string,
  density?: number | null,
  swg?: number
): number {
  if (qty <= 0) return 0;
  if (kind === 'serving') return qty * (swg ?? 100);
  if (kind === 'mass') return toGrams(qty, unit);
  // volume
  if (typeof density === 'number' && density > 0) {
    return mlToGrams(toMilliliters(qty, unit), density);
  }
  const vg = getVolumeWeightGrams(foodName, '', unit);
  if (typeof vg === 'number' && vg > 0) return qty * vg;
  // last resort: treat quantity as grams
  return qty;
}

/**
 * Back-convert stored grams to a display quantity string for the given unit.
 * Used when loading an entry or switching units.
 */
function gramsToDisplayQty(
  grams: number,
  kind: UnitKind,
  unit: UnitId,
  foodName: string,
  density?: number | null,
  swg?: number
): string {
  if (grams <= 0) return '0';
  if (kind === 'serving' && swg && swg > 0) {
    const qty = grams / swg;
    return String(Math.round(qty * 10) / 10);
  }
  if (kind === 'mass') {
    if (unit === 'oz') return String(Math.round((grams / 28.349523125) * 10) / 10);
    if (unit === 'lb') return String(Math.round((grams / 453.59237) * 100) / 100);
    return String(Math.round(grams));
  }
  if (kind === 'volume') {
    if (typeof density === 'number' && density > 0) {
      const ml = grams / density;
      if (unit === 'ml') return String(Math.round(ml));
      if (unit === 'l') return String(Math.round((ml / 1000) * 100) / 100);
      if (unit === 'fl_oz') return String(Math.round((ml / 29.5735295625) * 10) / 10);
      if (unit === 'cup') return String(Math.round((ml / 236.5882365) * 10) / 10);
      if (unit === 'tbsp') return String(Math.round((ml / 14.78676478125) * 10) / 10);
      if (unit === 'tsp') return String(Math.round((ml / 4.92892159375) * 10) / 10);
    }
    const vg = getVolumeWeightGrams(foodName, '', unit);
    if (typeof vg === 'number' && vg > 0) {
      return String(Math.round((grams / vg) * 10) / 10);
    }
  }
  // Fallback: show in grams (user can adjust)
  return String(Math.round(grams));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditLogEntryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { todayEntries, getEntriesForDate, updateEntry } = useDailyLog();
  const params = useLocalSearchParams<{ entryId: string; dateKey?: string }>();
  const entryId = params.entryId;
  const dateKey = params.dateKey;

  const entries = dateKey ? getEntriesForDate(dateKey) : todayEntries;
  const entry = entries.find((e) => e.id === entryId);

  const [name, setName] = useState('');
  const [unitKind, setUnitKind] = useState<UnitKind>('mass');
  const [unitId, setUnitId] = useState<UnitId>('g');
  const [quantityInput, setQuantityInput] = useState('100');
  const [unitLabel, setUnitLabel] = useState('serving');
  const [servingWeightG, setServingWeightG] = useState(100);
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const [showMacroOverride, setShowMacroOverride] = useState(false);
  const [isCustomMacros, setIsCustomMacros] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mealType, setMealType] = useState<MealType>('snack');

  // Density inferred from food name — used for volume ↔ gram conversions
  const foodDensity = useMemo(() => inferDensityFromName(entry?.name), [entry?.name]);

  const qtyVal = parseFloat(quantityInput) || 0;
  const totalGramsForRecalc =
    getTotalGrams(qtyVal, unitKind, unitId, entry?.name ?? '', foodDensity, servingWeightG) || 100;

  const computedMacrosFromQty = entry?.nutrientsPer100g
    ? foodService.computeMacrosFromNutrients(entry.nutrientsPer100g, totalGramsForRecalc)
    : null;

  // Load entry state on mount
  useEffect(() => {
    if (!entry) return;
    setName(entry.name);
    setProtein(String(entry.protein_g));
    setCarbs(String(entry.carbs_g));
    setFat(String(entry.fat_g));
    setCalories(String(entry.calories));
    setIsCustomMacros(!!entry.isCustomMacros);
    setMealType(entryMealType(entry));

    const grams = entry.servingGrams ?? 100;
    const density = inferDensityFromName(entry.name);

    // New format: entry already has unitKind/unitId stored
    if (entry.unitKind && entry.unitId) {
      const kind = entry.unitKind as UnitKind;
      const unit = entry.unitId as UnitId;
      setUnitKind(kind);
      setUnitId(unit);
      const sw = entry.servingWeightG ?? 100;
      setServingWeightG(sw);
      setQuantityInput(gramsToDisplayQty(grams, kind, unit, entry.name, density, sw));
      return;
    }

    // Legacy: map measureMode → unitKind/unitId
    const mode = (entry.measureMode === 'units' ? 'qty' : entry.measureMode) ?? 'grams';
    const detected = detectUnitFromName(entry.name);

    // Ounces must win over detectUnitFromName (e.g. "chicken breast" in the name
    // would otherwise force serving mode and hide the logged oz quantity).
    if (mode === 'ounces') {
      setUnitKind('mass');
      setUnitId('oz');
      setQuantityInput(gramsToDisplayQty(grams, 'mass', 'oz', entry.name, density));
    } else if (mode === 'qty' || detected) {
      setUnitKind('serving');
      setUnitId('piece');
      setUnitLabel(detected?.unitLabel ?? 'serving');
      const sw = entry.servingWeightG ?? detected?.servingWeightG ?? 100;
      setServingWeightG(sw);
      setQuantityInput(gramsToDisplayQty(grams, 'serving', 'piece', entry.name, density, sw));
    } else {
      setUnitKind('mass');
      setUnitId('g');
      setQuantityInput(String(Math.round(grams)));
    }
  }, [entry]);

  // Auto-recalc macros when quantity/unit changes (unless user has overridden)
  useEffect(() => {
    if (!isCustomMacros && computedMacrosFromQty) {
      setProtein(String(computedMacrosFromQty.protein_g));
      setCarbs(String(computedMacrosFromQty.carbs_g));
      setFat(String(computedMacrosFromQty.fat_g));
      setCalories(String(computedMacrosFromQty.calories));
    }
  }, [
    isCustomMacros,
    computedMacrosFromQty?.calories,
    computedMacrosFromQty?.protein_g,
    computedMacrosFromQty?.carbs_g,
    computedMacrosFromQty?.fat_g,
  ]);

  const totalGrams = totalGramsForRecalc;
  const canRecalc = entry?.nutrientsPer100g && !isCustomMacros;
  const computedMacros = canRecalc
    ? foodService.computeMacrosFromNutrients(entry!.nutrientsPer100g!, totalGrams)
    : null;

  const displayCalories = isCustomMacros
    ? parseFloat(calories) || 0
    : (parseFloat(protein) || 0) * 4 + (parseFloat(carbs) || 0) * 4 + (parseFloat(fat) || 0) * 9;

  const effectiveMacros = isCustomMacros
    ? {
        calories: Math.round(parseFloat(calories) || 0),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      }
    : computedMacros ?? {
        calories: Math.round(displayCalories),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      };

  const handleQuantityChange = useCallback((text: string) => {
    setQuantityInput(text);
  }, []);

  // When unit changes, convert the displayed quantity to preserve the same gram amount
  const handleUnitChange = useCallback(
    (newUnit: UnitId) => {
      const currentQty = parseFloat(quantityInput) || 0;
      const currentGrams = getTotalGrams(
        currentQty, unitKind, unitId, entry?.name ?? '', foodDensity, servingWeightG
      );
      setUnitId(newUnit);
      setQuantityInput(
        gramsToDisplayQty(currentGrams, unitKind, newUnit, entry?.name ?? '', foodDensity, servingWeightG)
      );
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [quantityInput, unitKind, unitId, entry?.name, foodDensity, servingWeightG]
  );

  // When kind changes, switch to the default unit for that kind and convert
  const handleKindChange = useCallback(
    (newKind: UnitKind) => {
      const currentQty = parseFloat(quantityInput) || 0;
      const currentGrams = getTotalGrams(
        currentQty, unitKind, unitId, entry?.name ?? '', foodDensity, servingWeightG
      );

      let newUnit: UnitId;
      let newSwg = servingWeightG;

      if (newKind === 'mass') {
        newUnit = 'g';
      } else if (newKind === 'volume') {
        newUnit = 'ml';
      } else {
        newUnit = 'piece';
        const detected = detectUnitFromName(entry?.name ?? '');
        if (detected) {
          setUnitLabel(detected.unitLabel);
          setServingWeightG(detected.servingWeightG);
          newSwg = detected.servingWeightG;
        }
      }

      setUnitKind(newKind);
      setUnitId(newUnit);
      setQuantityInput(
        gramsToDisplayQty(currentGrams, newKind, newUnit, entry?.name ?? '', foodDensity, newSwg)
      );
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [quantityInput, unitKind, unitId, entry?.name, foodDensity, servingWeightG]
  );

  const handleServingWeightChange = useCallback((val: number) => {
    setServingWeightG(val > 0 ? val : 100);
  }, []);

  const handleResetToCalculated = useCallback(() => {
    if (!computedMacros) return;
    setProtein(String(computedMacros.protein_g));
    setCarbs(String(computedMacros.carbs_g));
    setFat(String(computedMacros.fat_g));
    setCalories(String(computedMacros.calories));
    setIsCustomMacros(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [computedMacros]);

  const handleSave = useCallback(async () => {
    const foodName = name.trim();
    if (!foodName) {
      Alert.alert('Missing Name', 'Please enter a food name.');
      return;
    }
    if (!entryId) return;

    const macros = isCustomMacros
      ? {
          calories: Math.round(parseFloat(calories) || 0),
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
        }
      : computedMacros ?? {
          calories: Math.round(displayCalories),
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
        };

    if (!macros.protein_g && !macros.carbs_g && !macros.fat_g) {
      Alert.alert('Missing Macros', 'Please enter at least one macro value.');
      return;
    }

    setIsSaving(true);
    try {
      const qty = parseFloat(quantityInput) || 0;

      // Map unitKind/unitId to legacy measureMode for backwards compat with ensureEntryMacros
      const legacyMeasureMode: 'qty' | 'grams' | 'ounces' =
        unitKind === 'serving' ? 'qty' :
        (unitKind === 'mass' && unitId === 'oz') ? 'ounces' : 'grams';

      // For non-serving/non-oz, store totalGrams as quantity so ensureEntryMacros computes correctly
      const storedQuantity =
        unitKind === 'serving' ? qty :
        (unitKind === 'mass' && unitId === 'oz') ? qty :
        totalGrams;

      updateEntry(
        entryId,
        {
          name: foodName,
          ...macros,
          servingGrams: totalGrams,
          measureMode: legacyMeasureMode,
          unitKind,
          unitId,
          quantity: storedQuantity,
          servingWeightG: unitKind === 'serving' ? servingWeightG : undefined,
          isCustomMacros: isCustomMacros || undefined,
          mealType,
        },
        dateKey ?? undefined
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (err) {
      console.log('[EditLogEntry] Save error:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    protein,
    carbs,
    fat,
    calories,
    quantityInput,
    unitKind,
    unitId,
    servingWeightG,
    totalGrams,
    entryId,
    isCustomMacros,
    computedMacros,
    displayCalories,
    mealType,
    updateEntry,
    dateKey,
  ]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Entry not found</Text>
        <PhysiqPressable feedback="tap" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </PhysiqPressable>
      </View>
    );
  }

  return (
    <DismissKeyboard>
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Entry',
          headerLeft: () => (
            <PhysiqPressable
              feedback="tap"
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.headerIconBtn}
            >
              <View style={styles.headerIconWrap}>
                <X size={22} color={Colors.textSecondary} />
              </View>
            </PhysiqPressable>
          ),
          headerRight: () => (
            <PhysiqPressable
              feedback="confirm"
              onPress={handleSave}
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          <View style={styles.entrySection}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Grilled Chicken"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.mealTypeSection}>
              <Text style={styles.inputLabel}>Meal</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPE_ORDER.map((meal) => {
                  const active = mealType === meal;
                  return (
                    <PhysiqPressable
                      key={meal}
                      feedback="select"
                      style={[styles.mealTypeChip, active && styles.mealTypeChipActive]}
                      onPress={() => setMealType(meal)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Assign to ${MEAL_TYPE_LABELS[meal]}`}
                    >
                      <Text style={[styles.mealTypeChipText, active && styles.mealTypeChipTextActive]}>
                        {MEAL_TYPE_LABELS[meal]}
                      </Text>
                    </PhysiqPressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.servingSection}>
              <Text style={styles.inputLabel}>Amount</Text>
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
            </View>

            <View style={styles.macroPreview}>
              <Text style={styles.macroPreviewLabel}>Macros</Text>
              <Text style={styles.macroPreviewValue}>
                {formatNumber(effectiveMacros.calories)} cal · {formatNumber(effectiveMacros.protein_g)}p ·{' '}
                {formatNumber(effectiveMacros.carbs_g)}c · {formatNumber(effectiveMacros.fat_g)}f
              </Text>
            </View>

            <PhysiqPressable
              feedback="select"
              style={styles.editMacrosToggle}
              onPress={() => setShowMacroOverride((v) => !v)}
            >
              <Text style={styles.editMacrosToggleText}>
                {showMacroOverride ? 'Hide macro override' : 'Edit macros'}
              </Text>
              {showMacroOverride ? (
                <ChevronUp size={18} color={colors.primary} />
              ) : (
                <ChevronDown size={18} color={colors.primary} />
              )}
            </PhysiqPressable>

            {showMacroOverride && (
              <View style={styles.macroOverrideSection}>
                <View style={styles.macroInputRow}>
                  <View style={styles.macroInput}>
                    <Text style={[styles.macroInputLabel, { color: Colors.protein }]}>Protein (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { borderColor: Colors.protein }]}
                      value={protein}
                      onChangeText={(v) => { setProtein(v); setIsCustomMacros(true); }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.macroInput}>
                    <Text style={[styles.macroInputLabel, { color: Colors.carbs }]}>Carbs (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { borderColor: Colors.carbs }]}
                      value={carbs}
                      onChangeText={(v) => { setCarbs(v); setIsCustomMacros(true); }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.macroInput}>
                    <Text style={[styles.macroInputLabel, { color: Colors.fat }]}>Fat (g)</Text>
                    <TextInput
                      style={[styles.macroTextInput, { borderColor: Colors.fat }]}
                      value={fat}
                      onChangeText={(v) => { setFat(v); setIsCustomMacros(true); }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.caloriesInputRow}>
                  <Text style={styles.macroInputLabel}>Calories</Text>
                  <TextInput
                    style={styles.caloriesInput}
                    value={calories}
                    onChangeText={(v) => { setCalories(v); setIsCustomMacros(true); }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
                {canRecalc && (
                  <PhysiqPressable
                    feedback="tap"
                    style={styles.resetBtn}
                    onPress={handleResetToCalculated}
                  >
                    <RotateCcw size={14} color={colors.primary} />
                    <Text style={styles.resetBtnText}>Reset to calculated macros</Text>
                  </PhysiqPressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </DismissKeyboard>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  backBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  backBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  entrySection: {
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  servingSection: {
    marginBottom: 16,
  },
  mealTypeSection: {
    marginBottom: 16,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
  },
  mealTypeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  mealTypeChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  mealTypeChipTextActive: {
    color: colors.primary,
  },
  macroPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  macroPreviewLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  macroPreviewValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  editMacrosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  editMacrosToggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  macroOverrideSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  macroInput: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  macroTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  caloriesInputRow: {
    marginBottom: 12,
  },
  caloriesInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  resetBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerIconWrap: {
    padding: 4,
  },
});
