import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import {
  EatingStyle,
  DietaryModifier,
  EATING_STYLE_LABELS,
  DIETARY_MODIFIER_LABELS,
} from '../../types';
import {
  MEAL_PLAN_SOURCE_BLURB,
  MEAL_PLAN_METHODOLOGY_SECTIONS,
} from '../../src/content/nutritionScience';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface MealPlanMethodologyCardProps {
  eatingStyle: EatingStyle;
  dietModifiers: DietaryModifier[];
  onViewMethodology: () => void;
}

export default function MealPlanMethodologyCard({
  eatingStyle,
  dietModifiers,
  onViewMethodology,
}: MealPlanMethodologyCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();
  const expandMaxHeight = Math.min(540, windowHeight * 0.55);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const contentStyle = useMemo(
    () => ({
      maxHeight: expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, expandMaxHeight],
      }),
      opacity: expandAnim,
      transform: [
        {
          translateY: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
          }),
        },
      ],
    }),
    [expandAnim, expandMaxHeight]
  );

  const iconStyle = useMemo(
    () => ({
      transform: [
        {
          rotate: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          }),
        },
      ],
    }),
    [expandAnim]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sourceText}>{MEAL_PLAN_SOURCE_BLURB}</Text>

      <TouchableOpacity
        style={styles.toggle}
        onPress={toggleExpanded}
        activeOpacity={0.85}
      >
        <Text style={styles.toggleTitle}>Nutrition Methodology</Text>
        <Animated.View style={iconStyle}>
          <ChevronDown size={18} color={Colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[styles.expandWrap, contentStyle]}>
        <ScrollView
          style={styles.expandScroll}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.expandInner}>
            {MEAL_PLAN_METHODOLOGY_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.body.map((line, i) => (
                  <Text key={i} style={styles.sectionBody}>
                    {line}
                  </Text>
                ))}

                {section.title === 'Eating Style Adaptation' && (
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { borderColor: colors.primary }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>
                        {EATING_STYLE_LABELS[eatingStyle]}
                      </Text>
                    </View>
                  </View>
                )}

                {section.title === 'Dietary Restrictions' && (
                  <View style={styles.tagRow}>
                    {dietModifiers.length > 0 ? (
                      dietModifiers.map((mod) => (
                        <View key={mod} style={styles.modifierTag}>
                          <Text style={styles.modifierTagText}>
                            {DIETARY_MODIFIER_LABELS[mod]}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.modifierTag}>
                        <Text style={styles.modifierTagText}>None</Text>
                      </View>
                    )}
                  </View>
                )}

                {section.reference && section.reference.length > 0 && (
                  <View style={styles.referenceBlock}>
                    {section.reference.map((ref, i) => (
                      <Text key={i} style={styles.referenceText}>
                        {ref}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.methodologyButton}
              onPress={onViewMethodology}
              activeOpacity={0.85}
            >
              <Text style={styles.methodologyButtonText}>View Full Methodology</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      marginTop: 4,
    },
    sourceText: {
      color: Colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    toggle: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    toggleTitle: {
      color: Colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    expandWrap: {
      overflow: 'hidden',
    },
    expandScroll: {
      flexGrow: 0,
    },
    expandInner: {
      borderTopWidth: 1,
      borderTopColor: Colors.cardBorder,
      paddingTop: 14,
      gap: 16,
      paddingBottom: 4,
    },
    section: {
      gap: 6,
    },
    sectionTitle: {
      color: Colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    sectionBody: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    tagText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    modifierTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      backgroundColor: Colors.cardElevated,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
    },
    modifierTagText: {
      color: Colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    referenceBlock: {
      marginTop: 4,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: Colors.cardBorder,
      gap: 2,
    },
    referenceText: {
      color: Colors.textTertiary,
      fontSize: 11,
      lineHeight: 16,
      fontStyle: 'italic',
    },
    methodologyButton: {
      marginTop: 4,
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    methodologyButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
