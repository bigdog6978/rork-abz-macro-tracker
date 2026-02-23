import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Zap } from 'lucide-react-native';
import Colors from '../../constants/colors';

const GRADIENT_COLORS = ['#FFC44D', '#FF6A1A', '#D84315'] as const;

export default function DashboardBrandHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <MaskedView
          maskElement={
            <Text style={[styles.physiqText, { backgroundColor: 'transparent', color: 'black' }]}>
              Physiq
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
              Physiq
            </Text>
          </LinearGradient>
        </MaskedView>
        <View style={styles.zapWrapper}>
          <MaskedView
            maskElement={
              <View style={styles.zapMask}>
                <Zap size={18} color="black" fill="black" strokeWidth={0} />
              </View>
            }
          >
            <LinearGradient
              colors={[...GRADIENT_COLORS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.zapGradient}
            >
              <View style={styles.zapGradientInvisible} />
            </LinearGradient>
          </MaskedView>
        </View>
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
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  physiqTextInvisible: {
    opacity: 0,
  },
  gradientFill: {
    paddingVertical: 2,
  },
  zapWrapper: {
    marginTop: 2,
  },
  zapMask: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  zapGradient: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zapGradientInvisible: {
    width: 18,
    height: 18,
    opacity: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.textTertiary,
    opacity: 0.16,
    marginTop: 6,
  },
});
