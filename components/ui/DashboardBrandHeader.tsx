import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Colors from '../../constants/colors';

const GRADIENT_COLORS = ['#FFC44D', '#FF6A1A', '#D84315'] as const;

export default function DashboardBrandHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <MaskedView
          maskElement={
            <Text style={[styles.physiqText, { backgroundColor: 'transparent', color: 'black' }]}>
              <Text style={styles.physiqBold}>Physiq:</Text>
              <Text style={styles.macroTracker}> Macro Tracker</Text>
            </Text>
          }
        >
          <LinearGradient
            colors={[...GRADIENT_COLORS]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.gradientFill}
          >
            <Text style={[styles.physiqText, styles.physiqTextInvisible]}>
              <Text style={styles.physiqBold}>Physiq:</Text>
              <Text style={styles.macroTracker}> Macro Tracker</Text>
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -7,
    paddingBottom: 6,
    backgroundColor: Colors.background,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  physiqText: {
    fontSize: 22,
    letterSpacing: 0.6,
  },
  physiqBold: {
    fontWeight: '700' as const,
  },
  macroTracker: {
    fontWeight: '400' as const,
  },
  physiqTextInvisible: {
    opacity: 0,
  },
  gradientFill: {
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.textTertiary,
    opacity: 0.16,
    marginTop: 6,
  },
});
