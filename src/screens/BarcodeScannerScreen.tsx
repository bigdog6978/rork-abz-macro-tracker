/**
 * Barcode scanner screen: scan UPC/EAN, fetch from Open Food Facts, confirm & save.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Scan, AlertCircle } from 'lucide-react-native';
import { fetchProductByBarcode, type ParsedProduct } from '../services/openFoodFacts';
import * as foodsRepo from '../data/foodsRepo';
import Colors from '../../constants/colors';

const VALID_BARCODE_LENGTHS = [8, 12, 13, 14];

function isValidBarcode(data: string): boolean {
  if (!/^\d+$/.test(data)) return false;
  return VALID_BARCODE_LENGTHS.includes(data.length);
}

interface BarcodeScannerScreenProps {
  onCancel?: () => void;
  onSaved?: (foodId: string) => void;
}

export default function BarcodeScannerScreen({
  onCancel,
  onSaved,
}: BarcodeScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ParsedProduct | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCal, setEditCal] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [saving, setSaving] = useState(false);
  const lockedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (lockedRef.current) return;
      if (!isValidBarcode(data)) return;

      lockedRef.current = true;
      setLocked(true);
      setLoading(true);
      setError(null);
      setBarcode(data);

      try {
        const result = await fetchProductByBarcode(data);
        if (!result.found || !result.product) {
          setError('Product not found');
          setLoading(false);
          setLocked(false);
          lockedRef.current = false;
          return;
        }

        const p = result.product;
        setProduct(p);
        setEditName(p.name);
        setEditBrand(p.brand ?? '');
        setEditCal(String(p.calories));
        setEditProtein(String(p.protein));
        setEditCarbs(String(p.carbs));
        setEditFat(String(p.fat));
        setShowConfirm(true);
      } catch (err) {
        console.log('[BarcodeScanner] Fetch error:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
        setLocked(false);
        lockedRef.current = false;
      }
    },
    []
  );

  const handleCancel = useCallback(() => {
    if (onCancel) onCancel();
    else router.back();
  }, [onCancel]);

  const handleScanAgain = useCallback(() => {
    setError(null);
    setProduct(null);
    setBarcode(null);
    setShowConfirm(false);
    setLocked(false);
    lockedRef.current = false;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleManualEntry = useCallback(() => {
    setProduct({
      name: 'Unknown product',
      brand: null,
      servingSize: null,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      hasMissingMacros: true,
    });
    setEditName('');
    setEditBrand('');
    setEditCal('');
    setEditProtein('');
    setEditCarbs('');
    setEditFat('');
    setShowConfirm(true);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!barcode) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }
    const cal = parseFloat(editCal) || 0;
    const protein = parseFloat(editProtein) || 0;
    const carbs = parseFloat(editCarbs) || 0;
    const fat = parseFloat(editFat) || 0;
    if (cal === 0 && protein === 0 && carbs === 0 && fat === 0) {
      Alert.alert('Missing Macros', 'Please enter at least one macro value.');
      return;
    }

    setSaving(true);
    try {
      const saved = await foodsRepo.upsertFoodFromBarcode(barcode, {
        name,
        brand: editBrand.trim() || null,
        calories: cal,
        protein,
        carbs,
        fat,
        servingSize: product?.servingSize ?? null,
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowConfirm(false);
      if (onSaved) onSaved(saved.id);
      else router.replace({ pathname: '/add-food', params: { fromBarcode: saved.id } });
    } catch (err) {
      console.log('[BarcodeScanner] Save error:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    barcode,
    editName,
    editBrand,
    editCal,
    editProtein,
    editCarbs,
    editFat,
    product?.servingSize,
    onSaved,
  ]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera access is needed to scan barcodes.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>Looking up product...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorOverlay}>
          <AlertCircle size={32} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleManualEntry}>
              <Text style={styles.primaryBtnText}>Enter Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleScanAgain}>
              <Scan size={18} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={handleCancel}>
          <X size={22} color={Colors.text} />
          <Text style={styles.footerBtnText}>Cancel</Text>
        </TouchableOpacity>
        {locked && (
          <TouchableOpacity style={styles.footerBtn} onPress={handleScanAgain}>
            <Scan size={22} color={Colors.primary} />
            <Text style={[styles.footerBtnText, { color: Colors.primary }]}>
              Scan Again
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showConfirm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Product</Text>
            <TouchableOpacity onPress={() => setShowConfirm(false)} hitSlop={12}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Product name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Product name"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.fieldLabel}>Brand (optional)</Text>
            <TextInput
              style={styles.input}
              value={editBrand}
              onChangeText={setEditBrand}
              placeholder="Brand"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.fieldLabel}>Macros per 100g</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroField}>
                <Text style={styles.macroLabel}>Cal</Text>
                <TextInput
                  style={styles.macroInput}
                  value={editCal}
                  onChangeText={setEditCal}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroLabel}>P</Text>
                <TextInput
                  style={styles.macroInput}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroLabel}>C</Text>
                <TextInput
                  style={styles.macroInput}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.macroLabel}>F</Text>
                <TextInput
                  style={styles.macroInput}
                  value={editFat}
                  onChangeText={setEditFat}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            {product?.hasMissingMacros && (
              <Text style={styles.hint}>
                Some nutrition data was missing. Please fill in values before saving.
              </Text>
            )}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save to My Foods</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  message: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: { color: Colors.text, marginTop: 12, fontSize: 16 },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.text,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorActions: { alignItems: 'center', gap: 12 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    paddingBottom: 40,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  footerBtnText: { color: Colors.text, fontSize: 16 },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  macroField: { flex: 1 },
  macroLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  macroInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 10,
    color: Colors.text,
    fontSize: 14,
  },
  hint: {
    color: Colors.warning,
    fontSize: 13,
    marginTop: 12,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
