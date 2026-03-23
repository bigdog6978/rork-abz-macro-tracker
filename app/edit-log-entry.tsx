import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import DismissKeyboard from '../components/ui/DismissKeyboard';
import * as Haptics from 'expo-haptics';
import { Check, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import SegmentedToggle from '../components/SegmentedToggle';
import {
  MeasureMode,
  getPreferredServingUnit,
  setPreferredServingUnit,
} from '../storage/userSettingsRepo';
import { pluralizeUnit, detectUnitFromName } from '../features/food/servingDefaults';
import * as foodService from '../features/food/foodService';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

const OZ_TO_GRAMS = 28.349523125;

const MEASURE_OPTIONS: { label: string; value: MeasureMode }[] = [
  { label: 'Qty', value: 'qty' },
  { label: 'gm', value: 'grams' },
  { label: 'oz', value: 'ounces' },
];

function gramsToDisplay(grams: number, measureMode: MeasureMode, servingWeightG?: number): string {
  if (measureMode === 'ounces') {
    return String(Math.round((grams / OZ_TO_GRAMS) * 10) / 10);
  }
  if (measureMode === 'qty' && servingWeightG && servingWeightG > 0) {
    const qty = grams / servingWeightG;
    return qty % 1 === 0 ? String(Math.round(qty)) : String(Math.round(qty * 10) / 10);
  }
  return String(Math.round(grams));
}

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
  const [measureMode, setMeasureMode] = useState<MeasureMode>('grams');
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

  const totalGramsForRecalc = displayToTotalGrams(quantityInput, measureMode, servingWeightG) || 100;
  const computedMacrosFromQty = entry?.nutrientsPer100g
    ? foodService.computeMacrosFromNutrients(entry.nutrientsPer100g, totalGramsForRecalc)
    : null;

  useEffect(() => {
    if (!entry) return;
    setName(entry.name);
    setProtein(String(entry.protein_g));
    setCarbs(String(entry.carbs_g));
    setFat(String(entry.fat_g));
    setCalories(String(entry.calories));
    setIsCustomMacros(!!entry.isCustomMacros);

    const grams = entry.servingGrams ?? 100;
    const mode = (entry.measureMode === 'units' ? 'qty' : entry.measureMode) ?? 'grams';
    const detected = detectUnitFromName(entry.name);

    if (mode === 'qty' || detected) {
      setMeasureMode('qty');
      setUnitLabel(detected?.unitLabel ?? 'serving');
      setServingWeightG(entry.servingWeightG ?? detected?.servingWeightG ?? 100);
      setQuantityInput(gramsToDisplay(grams, 'qty', entry.servingWeightG ?? detected?.servingWeightG ?? 100));
    } else if (mode === 'ounces') {
      setMeasureMode('ounces');
      setQuantityInput(gramsToDisplay(grams, 'ounces'));
    } else {
      setMeasureMode('grams');
      setQuantityInput(String(Math.round(grams)));
    }

    getPreferredServingUnit()
      .then((unit) => {
        if (unit === 'oz' && !detected && mode !== 'qty') {
          setMeasureMode('ounces');
          setQuantityInput(gramsToDisplay(grams, 'ounces'));
        }
      })
      .catch(() => {});
  }, [entry]);

  useEffect(() => {
    if (!isCustomMacros && computedMacrosFromQty) {
      setProtein(String(computedMacrosFromQty.protein_g));
      setCarbs(String(computedMacrosFromQty.carbs_g));
      setFat(String(computedMacrosFromQty.fat_g));
      setCalories(String(computedMacrosFromQty.calories));
    }
  }, [isCustomMacros, computedMacrosFromQty?.calories, computedMacrosFromQty?.protein_g, computedMacrosFromQty?.carbs_g, computedMacrosFromQty?.fat_g]);

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

  const handleServingWeightChange = useCallback((text: string) => {
    const val = parseFloat(text) || 0;
    setServingWeightG(val > 0 ? val : 100);
  }, []);

  const handleMeasureModeChange = useCallback(
    (newMode: MeasureMode) => {
      const currentGrams = displayToTotalGrams(quantityInput, measureMode, servingWeightG);
      let newServingWeightG = servingWeightG;
      if (newMode === 'qty') {
        const detected = detectUnitFromName(name);
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
      if (newMode === 'grams') setPreferredServingUnit('g').catch(() => {});
      else if (newMode === 'ounces') setPreferredServingUnit('oz').catch(() => {});
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [quantityInput, measureMode, servingWeightG, name]
  );

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
      const qtyVal = parseFloat(quantityInput) || 0;
      updateEntry(
        entryId,
        {
          name: foodName,
          ...macros,
          servingGrams: totalGrams,
          measureMode,
          quantity: measureMode === 'qty' ? qtyVal : measureMode === 'ounces' ? qtyVal : totalGrams,
          servingWeightG: measureMode === 'qty' ? servingWeightG : undefined,
          isCustomMacros: isCustomMacros || undefined,
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
    measureMode,
    servingWeightG,
    totalGrams,
    entryId,
    isCustomMacros,
    computedMacros,
    displayCalories,
    updateEntry,
    dateKey,
  ]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Entry not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

            <View style={styles.macroPreview}>
              <Text style={styles.macroPreviewLabel}>Macros</Text>
              <Text style={styles.macroPreviewValue}>
                {formatNumber(effectiveMacros.calories)} cal · {formatNumber(effectiveMacros.protein_g)}p ·{' '}
                {formatNumber(effectiveMacros.carbs_g)}c · {formatNumber(effectiveMacros.fat_g)}f
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editMacrosToggle}
              onPress={() => setShowMacroOverride((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.editMacrosToggleText}>
                {showMacroOverride ? 'Hide macro override' : 'Edit macros'}
              </Text>
              {showMacroOverride ? (
                <ChevronUp size={18} color={colors.primary} />
              ) : (
                <ChevronDown size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

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
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleResetToCalculated}
                    activeOpacity={0.7}
                  >
                    <RotateCcw size={14} color={colors.primary} />
                    <Text style={styles.resetBtnText}>Reset to calculated macros</Text>
                  </TouchableOpacity>
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
  macroPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.caloriesMuted,
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
    color: Colors.calories,
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
