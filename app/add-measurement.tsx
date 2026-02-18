import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Info } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useUser } from '../providers/UserProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { MeasurementRecord } from '../features/progress/types';

export default function AddMeasurementScreen() {
  const { profile } = useUser();
  const { latest, addMeasurement, isAdding, userId } = useMeasurements();

  const [bodyFat, setBodyFat] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [dressSize, setDressSize] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = useCallback(() => {
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

    const record: MeasurementRecord = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      recordedAt: new Date().toISOString(),
    };

    if (!isNaN(bf)) record.bodyFatPercent = bf;
    if (!isNaN(w) && w > 0) record.weightLb = w;
    if (!isNaN(wa) && wa > 0) record.waistIn = wa;
    if (!isNaN(ch) && ch > 0) record.chestIn = ch;
    if (dressSize.trim()) record.dressSize = dressSize.trim();
    if (notes.trim()) record.notes = notes.trim();

    addMeasurement(record);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert('Saved', 'Measurement recorded successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [bodyFat, weight, waist, chest, dressSize, notes, addMeasurement, userId]);

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
          {latest && (
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
              {isAdding ? 'Saving...' : 'Save Measurement'}
            </Text>
          </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
});
