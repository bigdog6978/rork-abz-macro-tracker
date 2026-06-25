import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import DismissKeyboard from '../../../components/ui/DismissKeyboard';
import PhysiqPressable from '../../../components/ui/PhysiqPressable';
import { X } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../constants/colors';
import { Radius, Spacing } from '../../../theme/tokens';
import { getAllergies, addAllergy, removeAllergy, normalizeAllergy } from '../../../storage/allergiesRepo';
import { UserAllergy } from '../../../types';
import { useThemeColors, type AppColors } from '../../../providers/ThemeProvider';

const QUICK_PICKS = [
  'Peanuts',
  'Tree nuts',
  'Milk/Dairy',
  'Eggs',
  'Wheat/Gluten',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
];

export default function AllergiesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { data: allergies = [] } = useQuery({
    queryKey: ['user_allergies'],
    queryFn: getAllergies,
  });
  const [input, setInput] = useState('');

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const norm = normalizeAllergy(trimmed);
    if (allergies.some((a) => a.normalized === norm)) return;
    await addAllergy(trimmed);
    setInput('');
    queryClient.invalidateQueries({ queryKey: ['user_allergies'] });
  }, [input, allergies, queryClient]);

  const handleRemove = useCallback(async (id: string) => {
    await removeAllergy(id);
    queryClient.invalidateQueries({ queryKey: ['user_allergies'] });
  }, [queryClient]);

  return (
    <DismissKeyboard>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Add allergy</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Search or type an allergy…"
            placeholderTextColor={Colors.textTertiary}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <PhysiqPressable
            feedback="confirm"
            style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!input.trim()}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </PhysiqPressable>
        </View>
        <View style={styles.quickPicks}>
          {QUICK_PICKS.map((label) => {
            const norm = label.toLowerCase().replace(/\s+/g, ' ');
            const added = allergies.some((a) => a.normalized === norm);
            return (
              <PhysiqPressable
                key={label}
                feedback="select"
                style={[styles.quickChip, added && styles.quickChipAdded]}
                onPress={async () => {
                  if (added) return;
                  await addAllergy(label);
                  queryClient.invalidateQueries({ queryKey: ['user_allergies'] });
                }}
                disabled={added}
              >
                <Text style={[styles.quickChipText, added && styles.quickChipTextAdded]}>{label}</Text>
              </PhysiqPressable>
            );
          })}
        </View>
      </View>

      {allergies.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>Your allergies</Text>
          <View style={styles.pillsWrap}>
            {allergies.map((a) => (
              <View key={a.id} style={styles.pill}>
                <Text style={styles.pillText}>{a.name}</Text>
                <PhysiqPressable
                  feedback="destructive"
                  onPress={() => handleRemove(a.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={Colors.textSecondary} />
                </PhysiqPressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.note}>
        For severe allergies, always verify labels and ingredients.
      </Text>
    </ScrollView>
    </DismissKeyboard>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickPicks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  quickChipAdded: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    opacity: 0.7,
  },
  quickChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  quickChipTextAdded: {
    color: colors.primary,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pillText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  note: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
  },
});
