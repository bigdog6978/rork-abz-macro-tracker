import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import ShareCardFrame from './ShareCardFrame';
import type { PhotoStatChip } from '../../utils/share/shareMetrics';

interface ProgressPhotoShareCardProps {
  primaryColor: string;
  firstName?: string;
  photoUri: string;
  statChips: PhotoStatChip[];
}

export default function ProgressPhotoShareCard({
  primaryColor,
  firstName,
  photoUri,
  statChips,
}: ProgressPhotoShareCardProps) {
  const styles = useMemo(() => createStyles(primaryColor), [primaryColor]);
  const name = firstName?.trim();
  const headline = name ? `${name}'s progress` : 'My progress';

  return (
    <ShareCardFrame primaryColor={primaryColor}>
      <View style={styles.body}>
        <Text style={styles.headline}>{headline}</Text>
        <View style={styles.photoWrap}>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)']}
            style={styles.scrim}
          />
          <View style={styles.chipsWrap}>
            {statChips.map((chip) => (
              <View key={chip.label} style={styles.chip}>
                <Text style={styles.chipLabel}>{chip.label}</Text>
                <Text
                  style={[
                    styles.chipValue,
                    chip.isPositive ? styles.positive : styles.neutral,
                  ]}
                >
                  {chip.value}
                </Text>
              </View>
            ))}
            {statChips.length === 0 ? (
              <Text style={styles.noStats}>Track measurements to show progress stats</Text>
            ) : null}
          </View>
        </View>
      </View>
    </ShareCardFrame>
  );
}

const createStyles = (primary: string) =>
  StyleSheet.create({
    body: { flex: 1, gap: 24 },
    headline: {
      color: Colors.text,
      fontSize: 44,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 52,
    },
    photoWrap: {
      flex: 1,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      backgroundColor: Colors.cardElevated,
      minHeight: 1200,
    },
    photo: { ...StyleSheet.absoluteFillObject },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
    },
    chipsWrap: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 36,
      gap: 14,
    },
    chip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderRadius: Radius.md,
      backgroundColor: 'rgba(26,26,26,0.88)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    chipLabel: { color: Colors.textSecondary, fontSize: 24, fontWeight: '600' },
    chipValue: { fontSize: 28, fontWeight: '800' },
    positive: { color: Colors.success },
    neutral: { color: primary },
    noStats: {
      color: Colors.textSecondary,
      fontSize: 22,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });
