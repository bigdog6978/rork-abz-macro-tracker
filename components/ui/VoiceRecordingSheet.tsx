import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import PhysiqPressable from './PhysiqPressable';
import Colors from '../../constants/colors';
import type { AppColors } from '../../providers/ThemeProvider';

interface VoiceRecordingSheetProps {
  visible: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  onCancel: () => void;
  colors: AppColors;
}

const NUM_BARS = 22;
const BAR_MIN_H = 6;
const BAR_MAX_H = 36;

function WaveformVisualiser({ colors }: { colors: AppColors }) {
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [barAnims]);

  return (
    <View style={waveStyles.container}>
      {barAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              backgroundColor: colors.primary,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [BAR_MIN_H, BAR_MAX_H],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 48,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});

function RipplePulse({ colors }: { colors: AppColors }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ripple1, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ripple1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(ripple2, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ripple2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale, ripple1, ripple2]);

  const rings = [ripple1, ripple2];

  return (
    <View style={pulseStyles.container}>
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            pulseStyles.ring,
            {
              borderColor: colors.primary,
              opacity: r.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 0],
              }),
              transform: [
                {
                  scale: r.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          pulseStyles.core,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  core: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});

export default function VoiceRecordingSheet({
  visible,
  isListening,
  isProcessing,
  transcript,
  onCancel,
  colors,
}: VoiceRecordingSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={sheetStyles.overlay}>
        <PhysiqPressable feedback="tap" style={sheetStyles.backdrop} onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </PhysiqPressable>
        <View
          style={[sheetStyles.sheet, { backgroundColor: Colors.card }]}
        >
          <View style={sheetStyles.handleRow}>
            <View style={sheetStyles.handle} />
          </View>

          <View style={sheetStyles.animArea}>
            {isListening && <WaveformVisualiser colors={colors} />}
            {isProcessing && <RipplePulse colors={colors} />}
          </View>

          <Text style={[sheetStyles.statusLabel, { color: colors.primary }]}>
            {isListening
              ? 'Listening for your meal...'
              : 'Analysing your meal...'}
          </Text>

          <Text
            style={sheetStyles.transcript}
            numberOfLines={4}
          >
            {transcript || 'Try "2 eggs, 1 avocado, 6 oz orange juice"'}
          </Text>

          <PhysiqPressable
            feedback="tap"
            style={[
              sheetStyles.cancelBtn,
              { borderColor: colors.primary },
            ]}
            onPress={onCancel}
          >
            <X size={16} color={colors.primary} />
            <Text style={[sheetStyles.cancelText, { color: colors.primary }]}>
              Cancel
            </Text>
          </PhysiqPressable>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
    alignItems: 'center',
  },
  handleRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cardBorder,
  },
  animArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  transcript: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
