/**
 * Quantity/macros form state for the Add Food screen: selected food, unit
 * kind/id, quantity, per-item serving weight, macro fields, and the scaling
 * recompute that keeps them consistent. Logic moved verbatim from
 * app/add-food.tsx; `applyScalingResult` consolidates the identical
 * "result.ok → set macros / else set callout reason" blocks that were
 * repeated at every call site.
 */

import { useCallback, useRef, useState } from 'react';
import type { UnitId, UnitKind } from '../../../src/lib/units';
import type { CalloutReason } from '../../../components/ui/QuantityCallout';
import type { NormalizedFood } from '../types';
import * as foodService from '../foodService';
import { detectUnitFromName } from '../servingDefaults';

export type ComputedMacros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function useQuantityForm() {
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
  const [selectedFood, setSelectedFood] = useState<NormalizedFood | null>(null);

  const computedMacrosRef = useRef<ComputedMacros | null>(null);

  const computedCalories =
    (parseFloat(protein) || 0) * 4 +
    (parseFloat(carbs) || 0) * 4 +
    (parseFloat(fat) || 0) * 9;

  /** Apply a scaling result to the macro fields (or surface the callout reason). */
  const applyScalingResult = useCallback(
    (
      result: ReturnType<typeof foodService.scaleMacrosFromQuantity>,
      opts?: { clearCustomized?: boolean }
    ): boolean => {
      if (result.ok) {
        computedMacrosRef.current = result.macros;
        setProtein(String(result.macros.protein_g));
        setCarbs(String(result.macros.carbs_g));
        setFat(String(result.macros.fat_g));
        if (opts?.clearCustomized) setIsCustomized(false);
        setScalingReason(null);
        return true;
      }
      setScalingReason(result.reason);
      return false;
    },
    []
  );

  /** Set macro fields directly (fallback paths that bypass scaling). */
  const applyMacros = useCallback((macros: ComputedMacros) => {
    computedMacrosRef.current = macros;
    setProtein(String(macros.protein_g));
    setCarbs(String(macros.carbs_g));
    setFat(String(macros.fat_g));
    setScalingReason(null);
  }, []);

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
      applyScalingResult(result, { clearCustomized: true });
    },
    [selectedFood, unitKind, unitId, servingWeightG, applyScalingResult]
  );

  const handleServingWeightChange = useCallback(
    (val: number) => {
      const g = val > 0 ? val : 50;
      setServingWeightG(g);
      const value = parseFloat(quantityInput) || 0;
      if (!selectedFood || value <= 0) return;
      const foodWithServing = { ...selectedFood, servingWeightGrams: g };
      const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, unitId, 'serving');
      applyScalingResult(result, { clearCustomized: true });
    },
    [selectedFood, quantityInput, unitId, applyScalingResult]
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

  /** `nameQuery` is the current food name or search query (for unit detection). */
  const handleKindChange = useCallback(
    (k: UnitKind, nameQuery: string) => {
      setUnitKind(k);
      if (k === 'mass') {
        setUnitId('g');
      } else if (k === 'volume') {
        setUnitId('ml');
      } else {
        setUnitId('serving');
        // Update serving label/weight from the current food name (Bug B fix)
        const detected = detectUnitFromName(nameQuery);
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
          ? (detectUnitFromName(nameQuery)?.servingWeightG ?? servingWeightG)
          : servingWeightG;
      const foodWithServing: NormalizedFood | null =
        k === 'serving' && selectedFood
          ? { ...selectedFood, servingWeightGrams: selectedFood.servingWeightGrams ?? effectiveSwg }
          : selectedFood;
      if (foodWithServing && value > 0) {
        const result = foodService.scaleMacrosFromQuantity(foodWithServing, value, newUnit, k);
        applyScalingResult(result);
      }
    },
    [quantityInput, selectedFood, servingWeightG, isCustomized, applyScalingResult]
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
        applyScalingResult(result);
      }
    },
    [quantityInput, unitKind, selectedFood, servingWeightG, isCustomized, applyScalingResult]
  );

  /** Reset the form to its initial state (clear selection). */
  const resetForm = useCallback(() => {
    setSelectedFood(null);
    setName('');
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
  }, []);

  return {
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
    setProtein,
    carbs,
    setCarbs,
    fat,
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
    handleKindChange,
    handleUnitChange,
    resetForm,
  };
}
