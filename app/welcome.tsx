import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useUser } from '../providers/UserProvider';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useUser();
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = useCallback(() => {
    const trimmed = firstName.trim();
    if (!trimmed) {
      setError('Please enter your first name');
      return;
    }
    setError('');
    Keyboard.dismiss();
    updateProfile({ firstName: trimmed });
    router.replace('/onboarding' as never);
  }, [firstName, updateProfile]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerArea}>
            <Text style={styles.title}>Welcome to Physiq</Text>
            <Text style={styles.subtitle}>Let's personalize your experience.</Text>
          </View>

          <View style={styles.inputArea}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter your first name"
              placeholderTextColor={Colors.textTertiary}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (error) setError('');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              testID="welcome-name-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
            testID="welcome-continue-btn"
          >
            <Text style={styles.continueText}>Continue</Text>
            <ChevronRight size={18} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  headerArea: {
    marginBottom: 40,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    marginTop: 8,
  },
  inputArea: {},
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  continueText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
