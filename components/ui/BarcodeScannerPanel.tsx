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
import { X, Scan, AlertCircle, Check } from 'lucide-react-native';
import { fetchProductByBarcode, type ParsedProduct } from '../../src/services/openFoodFacts';
import * as foodsRepo from '../../src/data/foodsRepo';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';

const VALID_BARCODE_LENGTHS = [8, 12, 13, 14];

function isValidBarcode(data: string): boolean {
  if (!/^\d+$/.test(data)) return false;
  return VALID_BARCODE_LENGTHS.includes(data.length);
}

export interface BarcodeScannerPanelProps {
  variant?: 'fullscreen' | 'inline';
  onCancel?: () => void;
  onSaved?: (foodId: string) => void;
}

function ProductEditor({
  editName,
  setEditName,
  editBrand,
  setEditBrand,
  editCal,
  setEditCal,
  editProtein,
  setEditProtein,
  editCarbs,
  setEditCarbs,
  editFat,
  setEditFat,
  hasMissingMacros,
  onClose,
  onSave,
  saving,
  compact,
}: {
  editName: string;
  setEditName: (value: string) => void;
  editBrand: string;
  setEditBrand: (value: string) => void;
  editCal: string;
  setEditCal: (value: string) => void;
  editProtein: string;
  setEditProtein: (value: string) => void;
  editCarbs: string;
  setEditCarbs: (value: string) => void;
  editFat: string;
  setEditFat: (value: string) => void;
  hasMissingMacros?: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  compact: boolean;
}) {
  const content = (
    <>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Confirm Product</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <X size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.modalScroll}
        contentContainerStyle={compact ? styles.modalScrollCompact : undefined}
        keyboardShouldPersistTaps="handled"
      >
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
        {hasMissingMacros ? (
          <Text style={styles.hint}>
            Some nutrition data was missing. Please fill in values before saving.
          </Text>
        ) : null}
      </ScrollView>
      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>Use in Add Food</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  if (compact) {
    return <View style={styles.inlineEditor}>{content}</View>;
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>{content}</View>
    </Modal>
  );
}

export default function BarcodeScannerPanel({
  variant = 'fullscreen',
  onCancel,
  onSaved,
}: BarcodeScannerPanelProps) {
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
  const compact = variant === 'inline';

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

        const nextProduct = result.product;
        setProduct(nextProduct);
        setEditName(nextProduct.name);
        setEditBrand(nextProduct.brand ?? '');
        setEditCal(String(nextProduct.calories));
        setEditProtein(String(nextProduct.protein));
        setEditCarbs(String(nextProduct.carbs));
        setEditFat(String(nextProduct.fat));
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
      <View style={[styles.center, compact && styles.centerCompact]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, compact && styles.centerCompact]}>
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

  const guideSize = compact ? 220 : 260;

  const cameraContent = (
    <View style={[styles.container, compact ? styles.inlineContainer : styles.fullscreenContainer]}>
      <View
        style={[styles.cameraFrame, compact ? styles.inlineCameraFrame : styles.fullscreenCameraFrame]}
      >
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />
        <View style={[styles.scanGuideBox, { width: guideSize, height: guideSize }]} pointerEvents="none" />
        <Text style={styles.scanGuideText} pointerEvents="none">
          Align barcode inside the frame
        </Text>
        {locked ? (
          <View style={[styles.inlineToolbar, compact && styles.inlineToolbarCompact]}>
            <TouchableOpacity style={styles.toolbarButton} onPress={handleScanAgain}>
              <Scan size={18} color={Colors.primary} />
              <Text style={[styles.toolbarButtonText, styles.toolbarButtonTextPrimary]}>
                Scan Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>Looking up product...</Text>
        </View>
      ) : null}

      {error ? (
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
      ) : null}
    </View>
  );

  if (compact && showConfirm) {
    return (
      <ProductEditor
        editName={editName}
        setEditName={setEditName}
        editBrand={editBrand}
        setEditBrand={setEditBrand}
        editCal={editCal}
        setEditCal={setEditCal}
        editProtein={editProtein}
        setEditProtein={setEditProtein}
        editCarbs={editCarbs}
        setEditCarbs={setEditCarbs}
        editFat={editFat}
        setEditFat={setEditFat}
        hasMissingMacros={product?.hasMissingMacros}
        onClose={() => setShowConfirm(false)}
        onSave={handleSave}
        saving={saving}
        compact
      />
    );
  }

  return (
    <>
      {cameraContent}
      {!compact && showConfirm ? (
        <ProductEditor
          editName={editName}
          setEditName={setEditName}
          editBrand={editBrand}
          setEditBrand={setEditBrand}
          editCal={editCal}
          setEditCal={setEditCal}
          editProtein={editProtein}
          setEditProtein={setEditProtein}
          editCarbs={editCarbs}
          setEditCarbs={setEditCarbs}
          editFat={editFat}
          setEditFat={setEditFat}
          hasMissingMacros={product?.hasMissingMacros}
          onClose={() => setShowConfirm(false)}
          onSave={handleSave}
          saving={saving}
          compact={false}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    flex: 1,
  },
  inlineContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cameraFrame: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  fullscreenCameraFrame: {
    flex: 1,
    minHeight: 0,
  },
  inlineCameraFrame: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 0,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
    borderRadius: Radius.lg,
  },
  centerCompact: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
  inlineToolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  inlineToolbarCompact: {
    paddingVertical: 10,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toolbarButtonTextPrimary: {
    color: Colors.primary,
  },
  scanGuideBox: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scanGuideText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 8,
    paddingHorizontal: 16,
  },
  inlineEditor: {
    height: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
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
  modalScrollCompact: {
    paddingBottom: 6,
  },
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
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
