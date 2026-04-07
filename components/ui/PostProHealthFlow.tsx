import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { usePro } from '../../providers/ProProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';
import HealthPermissionModal from './HealthPermissionModal';
import ProHealthEducationModal from './ProHealthEducationModal';

/**
 * Option A: After activating Pro (trial/subscribe), prompt iOS users to connect Apple Health,
 * then chain to the existing Health permission modal + enableHealthIntegration().
 */
export default function PostProHealthFlow() {
  const {
    postProHealthEducationPending,
    clearPostProHealthEducation,
    enableHealthIntegration,
    settings: proSettings,
    healthConnectionStatus,
    healthKitAvailable,
    healthKitAvailabilityReady,
  } = usePro();

  const [educationVisible, setEducationVisible] = useState(false);
  const [healthPermissionVisible, setHealthPermissionVisible] = useState(false);

  useEffect(() => {
    if (!postProHealthEducationPending || Platform.OS !== 'ios') return;
    if (!healthKitAvailabilityReady) return;
    if (!healthKitAvailable) {
      clearPostProHealthEducation();
      return;
    }
    if (proSettings.healthIntegrationEnabled && healthConnectionStatus === 'connected') {
      clearPostProHealthEducation();
      return;
    }
    setEducationVisible(true);
  }, [
    postProHealthEducationPending,
    healthKitAvailabilityReady,
    healthKitAvailable,
    proSettings.healthIntegrationEnabled,
    healthConnectionStatus,
    clearPostProHealthEducation,
  ]);

  const onNotNowEducation = useCallback(() => {
    setEducationVisible(false);
    clearPostProHealthEducation();
    Alert.alert(PRO_COPY.postProHealthNotNowTitle, PRO_COPY.postProHealthNotNowBody, [
      { text: 'OK', style: 'default' },
    ]);
  }, [clearPostProHealthEducation]);

  const onContinueEducation = useCallback(() => {
    setEducationVisible(false);
    clearPostProHealthEducation();
    setHealthPermissionVisible(true);
  }, [clearPostProHealthEducation]);

  const completeHealthConnect = useCallback(async () => {
    setHealthPermissionVisible(false);
    const ok = await enableHealthIntegration();
    if (!ok) {
      Alert.alert('Apple Health access needed', 'To use adaptive Pro targets, enable Apple Health access in Settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
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
        onContinue={() => void completeHealthConnect()}
        onNotNow={() => setHealthPermissionVisible(false)}
      />
    </>
  );
}
