import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useUser } from '../../providers/UserProvider';
import { usePro } from '../../providers/ProProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';
import HealthPermissionModal from './HealthPermissionModal';
import ProHealthEducationModal from './ProHealthEducationModal';

/**
 * After onboarding, prompt iOS users who have not connected Apple Health yet.
 */
export default function PostProHealthFlow() {
  const { profile } = useUser();
  const {
    enableHealthIntegration,
    updateSettings,
    settings: proSettings,
    healthConnectionStatus,
    healthKitAvailable,
    healthKitAvailabilityReady,
  } = usePro();

  const [educationVisible, setEducationVisible] = useState(false);
  const [healthPermissionVisible, setHealthPermissionVisible] = useState(false);
  const [healthConnectPending, setHealthConnectPending] = useState(false);

  useEffect(() => {
    if (!profile.onboardingComplete || Platform.OS !== 'ios') return;
    if (!healthKitAvailabilityReady) return;
    if (!healthKitAvailable) return;
    if (proSettings.healthEducationDismissed) return;
    if (proSettings.healthIntegrationEnabled && healthConnectionStatus === 'connected') return;
    setEducationVisible(true);
  }, [
    profile.onboardingComplete,
    healthKitAvailabilityReady,
    healthKitAvailable,
    proSettings.healthEducationDismissed,
    proSettings.healthIntegrationEnabled,
    healthConnectionStatus,
  ]);

  const dismissEducation = useCallback(() => {
    updateSettings({ healthEducationDismissed: true });
  }, [updateSettings]);

  const onNotNowEducation = useCallback(() => {
    setEducationVisible(false);
    dismissEducation();
    Alert.alert(PRO_COPY.postProHealthNotNowTitle, PRO_COPY.postProHealthNotNowBody, [
      { text: 'OK', style: 'default' },
    ]);
  }, [dismissEducation]);

  const onContinueEducation = useCallback(() => {
    setEducationVisible(false);
    dismissEducation();
    setHealthPermissionVisible(true);
  }, [dismissEducation]);

  const completeHealthConnect = useCallback(async () => {
    setHealthConnectPending(true);
    setHealthPermissionVisible(false);
    try {
      const ok = await enableHealthIntegration();
      if (!ok) {
        Alert.alert(
          'Apple Health access needed',
          'Physiq could not connect to Apple Health. Open the Health app → your profile → Apps → Physiq and enable the data types you want to share, or try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Apple Health error',
        error instanceof Error ? error.message : 'Unable to connect to Apple Health right now.'
      );
    } finally {
      setHealthConnectPending(false);
    }
  }, [enableHealthIntegration]);

  return (
    <>
      <ProHealthEducationModal
        visible={educationVisible}
        onContinue={onContinueEducation}
        onNotNow={onNotNowEducation}
      />
      <HealthPermissionModal
        visible={healthPermissionVisible}
        connecting={healthConnectPending}
        onContinue={() => void completeHealthConnect()}
        onNotNow={() => {
          if (healthConnectPending) return;
          setHealthPermissionVisible(false);
          dismissEducation();
        }}
      />
    </>
  );
}
