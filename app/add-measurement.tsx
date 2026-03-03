import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Info, ChevronDown } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useUser } from '../providers/UserProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { MeasurementRecord } from '../features/progress/types';
import { toDateKey, fromDateKey, getTodayDateKey } from '../utils/dateKey';

function formatDateLabel(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function AddMeasurementScreen() {
  const { profile } = useUser();
  const { latest, addMeasurement, deleteMeasurementAsync, isAdding, userId, getMeasurementByDateKey } = useMeasurements();
  const params = useLocalSearchParams<{ dateKey?: string }>();
  const initialDateKey = typeof params.dateKey === 'string' ? params.dateKey : getTodayDateKey();

  const [dateKey, setDateKey] = useState(initialDateKey);
  const [existingEntry, setExistingEntry] = useState<MeasurementRecord | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [bodyFat, setBodyFat] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [dressSize, setDressSize] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setDateKey(initialDateKey);
    let cancelled = false;
    getMeasurementByDateKey(initialDateKey).then((entry) => {
      if (!cancelled) {
        setExistingEntry(entry);
        if (entry) {
          setWeight(entry.weightLb != null ? String(entry.weightLb) : '');
          setBodyFat(entry.bodyFatPercent != null ? String(entry.bodyFatPercent) : '');
          setWaist(entry.waistIn != null ? String(entry.waistIn) : '');
          setChest(entry.chestIn != null ? String(entry.chestIn) : '');
          setDressSize(entry.dressSize ?? '');
          setNotes(entry.notes ?? '');
        } else {
          setWeight('');
          setBodyFat('');
          setWaist('');
          setChest('');
          setDressSize('');
          setNotes('');
        }
      }
    });
    return () => { cancelled = true; };
  }, [initialDateKey, getMeasurementByDateKey]);

  const dateOptions = React.useMemo(() => {
    const opts: { dateKey: string; label: string }[] = [];
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      const dk = toDateKey(d);
      opts.push({ dateKey: dk, label: formatDateLabel(dk) });
      d.setDate(d.getDate() - 1);
    }
    return opts;
  }, []);

  const handleDateSelect = useCallback((dk: string) => {
    setDateKey(dk);
    setShowDatePicker(false);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, []);

  const handleSave = useCallback(async () => {
    const bf = parseFloat(bodyFat);
    const w = parseFloat(weight);
    const wa = parseFloat(waist);
    const ch = parseFloat(chest);
    const hasAny = !isNaN(bf) || !isNaN(w) || !isNaN(wa) || !isNaN(ch) || dressSize.trim() !== '';

    if (!hasAny) {
      Alert.alert('No Data', 'Please enter at least one measurement.');
      return;
    }

    if (!isNaN(bf) && (bf < 3 || bf > 70)) {
      Alert.alert('Invalid Body Fat', 'Body fat should be between 3% and 70%.');
      return;
    }

    const originalDateKey = existingEntry?.dateKey ?? (existingEntry ? toDateKey(new Date(existingEntry.recordedAt)) : null);
    const isMoving = existingEntry && originalDateKey && dateKey !== originalDateKey;

    if (isMoving) {
      await deleteMeasurementAsync(existingEntry.id);
    }

    const record: MeasurementRecord = {
      id: isMoving ? `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : (existingEntry?.id ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      userId,
      recordedAt: new Date(dateKey + 'T12:00:00').toISOString(),
      dateKey,
    };

    if (!isNaN(bf)) record.bodyFatPercent = bf;
    if (!isNaN(w) && w > 0) record.weightLb = w;
    if (!isNaN(wa) && wa > 0) record.waistIn = wa;
    if (!isNaN(ch) && ch > 0) record.chestIn = ch;
    if (dressSize.trim()) record.dressSize = dressSize.trim();
    if (notes.trim()) record.notes = notes.trim();
    if (existingEntry?.isBaseline) record.isBaseline = true;

    addMeasurement(record);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert('Saved', 'Measurement recorded successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [bodyFat, weight, waist, chest, dressSize, notes, addMeasurement, deleteMeasurementAsync, userId, dateKey, existingEntry]);

  const isEditing = existingEntry !== null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Add Measurement', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateFieldText}>{formatDateLabel(dateKey)}</Text>
              <ChevronDown size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {existingEntry ? (
            <View style={styles.lastCard}>
              <View style={styles.lastCardHeader}>
                <Info size={14} color={Colors.textSecondary} />
                <Text style={styles.lastCardTitle}>Last Recorded</Text>
                <Text style={styles.lastCardDate}>{formatDateLabel(dateKey)}</Text>
              </View>
              <View style={styles.lastCardValues}>
                {existingEntry.weightLb != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Weight</Text>
                    <Text style={styles.lastValueNum}>{existingEntry.weightLb} lb</Text>
                  </View>
                )}
                {existingEntry.waistIn != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Waist</Text>
                    <Text style={styles.lastValueNum}>{existingEntry.waistIn} in</Text>
                  </View>
                )}
                {existingEntry.chestIn != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Chest</Text>
                    <Text style={styles.lastValueNum}>{existingEntry.chestIn} in</Text>
                  </View>
                )}
                {existingEntry.bodyFatPercent != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Body Fat</Text>
                    <Text style={styles.lastValueNum}>{existingEntry.bodyFatPercent}%</Text>
                  </View>
                )}
                {existingEntry.dressSize != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Dress</Text>
                    <Text style={styles.lastValueNum}>{existingEntry.dressSize}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : latest && dateKey === getTodayDateKey() ? (
            <View style={styles.lastCard}>
              <View style={styles.lastCardHeader}>
                <Info size={14} color={Colors.textSecondary} />
                <Text style={styles.lastCardTitle}>Last Recorded</Text>
                <Text style={styles.lastCardDate}>
                  {new Date(latest.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <View style={styles.lastCardValues}>
                {latest.weightLb != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Weight</Text>
                    <Text style={styles.lastValueNum}>{latest.weightLb} lb</Text>
                  </View>
                )}
                {latest.waistIn != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Waist</Text>
                    <Text style={styles.lastValueNum}>{latest.waistIn} in</Text>
                  </View>
                )}
                {latest.chestIn != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Chest</Text>
                    <Text style={styles.lastValueNum}>{latest.chestIn} in</Text>
                  </View>
                )}
                {latest.bodyFatPercent != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Body Fat</Text>
                    <Text style={styles.lastValueNum}>{latest.bodyFatPercent}%</Text>
                  </View>
                )}
                {latest.dressSize != null && (
                  <View style={styles.lastValueItem}>
                    <Text style={styles.lastValueLabel}>Dress</Text>
                    <Text style={styles.lastValueNum}>{latest.dressSize}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noEntryCard}>
              <Text style={styles.noEntryText}>No entry for this date</Text>
            </View>
          )}

          <View style={styles.fieldsSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Weight (lb)</Text>
              <TextInput
                style={styles.fieldInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder={latest?.weightLb ? `Last: ${latest.weightLb}` : 'Optional'}
                maxLength={6}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Body Fat %</Text>
              <TextInput
                style={styles.fieldInput}
                value={bodyFat}
                onChangeText={setBodyFat}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder={latest?.bodyFatPercent ? `Last: ${latest.bodyFatPercent}%` : 'Optional (3-70)'}
                maxLength={4}
              />
            </View>

            {profile.sex === 'male' ? (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldGroupHalf}>
                    <Text style={styles.fieldLabel}>Waist (in)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={waist}
                      onChangeText={setWaist}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                      placeholder={latest?.waistIn ? `Last: ${latest.waistIn}` : 'Optional'}
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.fieldGroupHalf}>
                    <Text style={styles.fieldLabel}>Chest (in)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={chest}
                      onChangeText={setChest}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                      placeholder={latest?.chestIn ? `Last: ${latest.chestIn}` : 'Optional'}
                      maxLength={5}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldGroupHalf}>
                    <Text style={styles.fieldLabel}>Waist (in)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={waist}
                      onChangeText={setWaist}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                      placeholder={latest?.waistIn ? `Last: ${latest.waistIn}` : 'Optional'}
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.fieldGroupHalf}>
                    <Text style={styles.fieldLabel}>Dress Size</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={dressSize}
                      onChangeText={setDressSize}
                      placeholderTextColor={Colors.textTertiary}
                      placeholder={latest?.dressSize ? `Last: ${latest.dressSize}` : 'Optional'}
                      maxLength={5}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor={Colors.textTertiary}
                placeholder="How are you feeling?"
                multiline
                maxLength={200}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isAdding && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isAdding}
            activeOpacity={0.8}
            testID="save-measurement-button"
          >
            <Check size={18} color={Colors.white} />
            <Text style={styles.saveButtonText}>
              {isAdding ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Measurement'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.savedToHint}>Saves to {formatDateLabel(dateKey)}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.datePickerOverlay} onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.datePickerTitle}>Select date</Text>
            <ScrollView style={styles.datePickerList} showsVerticalScrollIndicator={false}>
              {dateOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.dateKey}
                  style={[styles.datePickerOption, opt.dateKey === dateKey && styles.datePickerOptionActive]}
                  onPress={() => handleDateSelect(opt.dateKey)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.datePickerOptionText, opt.dateKey === dateKey && styles.datePickerOptionActiveText]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.datePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
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
  fieldGroup: {},
  fieldGroupHalf: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  dateFieldText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  noEntryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  noEntryText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  lastCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  lastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  lastCardTitle: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  lastCardDate: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  lastCardValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lastValueItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  lastValueLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  lastValueNum: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  fieldsSection: {
    gap: 16,
  },
  fieldInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
    paddingTop: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  savedToHint: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  datePickerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  datePickerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  datePickerList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  datePickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  datePickerOptionActive: {
    backgroundColor: Colors.primaryMuted,
  },
  datePickerOptionText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  datePickerOptionActiveText: {
    color: Colors.primary,
  },
  datePickerCancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  datePickerCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
