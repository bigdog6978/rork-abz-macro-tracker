import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

export default function DashboardBrandHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.physiqText}>
          <Text style={styles.physiqBold}>Physiq:</Text>
          <Text style={styles.macroTracker}> Macro Tracker</Text>
        </Text>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -7,
    paddingBottom: 6,
    backgroundColor: 'transparent',
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
    color: Colors.primary,
  },
  physiqBold: {
    fontWeight: '700' as const,
  },
  macroTracker: {
    fontWeight: '400' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.textTertiary,
    opacity: 0.16,
    marginTop: 6,
  },
});
