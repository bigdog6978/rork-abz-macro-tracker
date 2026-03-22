import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Colors from '../../../constants/colors';
import { Radius, Shadows, Spacing } from '../../../theme/tokens';
import {
  NUTRITION_SCIENCE_INTRO,
  NUTRITION_SCIENCE_NOTE,
  NUTRITION_SCIENCE_SECTIONS,
} from '../../../src/content/nutritionScience';
import { useThemeColors, type AppColors } from '../../../providers/ThemeProvider';

export default function NutritionScienceScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Macro Calculation Methodology' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Macro Calculation Methodology</Text>
          <Text style={styles.heroBody}>{NUTRITION_SCIENCE_INTRO}</Text>
        </View>

        {NUTRITION_SCIENCE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.sectionBody}>
                {paragraph}
              </Text>
            ))}
            {section.reference ? (
              <View style={styles.referenceBlock}>
                <Text style={styles.referenceLabel}>Reference</Text>
                {section.reference.map((line) => (
                  <Text key={line} style={styles.referenceText}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Important Note</Text>
          <Text style={styles.noteText}>{NUTRITION_SCIENCE_NOTE}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroBody: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionBody: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  referenceBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  referenceLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  referenceText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  noteCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  noteLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noteText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
});
