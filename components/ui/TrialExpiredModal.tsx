import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { usePro } from '../../providers/ProProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';

/**
 * Shown once, the first time the app is opened after the 5-day trial expires (and the user
 * has not purchased the lifetime unlock). Offers the one-time lifetime purchase or a dismiss.
 */
export default function TrialExpiredModal() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    trialExpiryNeedsAck,
    markTrialExpiryAcknowledged,
    startPurchase,
    lifetimeProduct,
    iapPurchasePending,
  } = usePro();
  const [submitting, setSubmitting] = useState(false);

  const priceText = lifetimeProduct?.priceText ?? PRO_COPY.priceFallback;

  const handleUnlock = useCallback(() => {
    const run = async () => {
      setSubmitting(true);
      try {
        await startPurchase();
      } finally {
        setSubmitting(false);
        markTrialExpiryAcknowledged();
      }
    };
    void run();
  }, [markTrialExpiryAcknowledged, startPurchase]);

  return (
    <Modal
      visible={trialExpiryNeedsAck}
      transparent
      animationType="fade"
      onRequestClose={markTrialExpiryAcknowledged}
    >
      <Pressable style={styles.backdrop} onPress={markTrialExpiryAcknowledged}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{PRO_COPY.trialEndedTitle}</Text>
          <Text style={styles.body}>{PRO_COPY.trialEndedBody}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleUnlock}
            disabled={submitting || iapPurchasePending}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={PRO_COPY.ctaUnlock}
          >
            <Text style={styles.primaryBtnText}>
              {submitting || iapPurchasePending
                ? 'Processing…'
                : PRO_COPY.ctaUnlockLifetimePrice.replace('{price}', priceText)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={markTrialExpiryAcknowledged}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.dismissBtnText}>Not now</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: Colors.card,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      gap: 10,
    },
    title: {
      color: Colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    body: {
      color: Colors.textSecondary,
      fontSize: 15,
      lineHeight: 21,
      marginBottom: 6,
    },
    primaryBtn: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryBtnText: {
      color: colors.onPrimary ?? Colors.white,
      fontSize: 16,
      fontWeight: '800',
    },
    dismissBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    dismissBtnText: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
