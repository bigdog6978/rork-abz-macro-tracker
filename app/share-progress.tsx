import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import Colors from '../constants/colors';
import { Spacing, Radius } from '../theme/tokens';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import { useUser } from '../providers/UserProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { usePhotos } from '../providers/PhotosProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useGoalSettings } from '../providers/GoalSettingsProvider';
import { computeGoalProgressScoreFromTarget } from '../features/progress/progressScoring';
import ProgressShareCard from '../components/share/ProgressShareCard';
import { buildShareCaption } from '../utils/share/shareCaption';
import {
  captureShareCard,
  copyCaptionToClipboard,
  openPhysiqMacrosGroup,
  saveImageToPhotos,
  shareImageUri,
} from '../utils/share/shareProgress';

export default function ShareProgressScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardRef = useRef<View>(null);
  const { profile } = useUser();
  const { baseline, latest, goalScore, trends } = useMeasurements();
  const { baseline: baselinePhoto, latest: latestPhoto } = usePhotos();
  const { getStreak } = useDailyLog();
  const { target } = useGoalSettings();
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);

  const targetScoreResult =
    target && (baseline || latest)
      ? computeGoalProgressScoreFromTarget(baseline, latest, target)
      : null;

  const caption = buildShareCaption({
    firstName: profile.firstName,
    goalScore,
    trends,
    targetScore: targetScoreResult?.score,
    targetStatusText: targetScoreResult?.statusText,
    target,
    streak: getStreak(),
  });

  const runCapture = async (): Promise<string | null> => {
    setBusy(true);
    try {
      return await captureShareCard(cardRef);
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const uri = await runCapture();
    if (!uri) {
      Alert.alert('Could not create image', 'Please try again.');
      return;
    }
    const ok = await shareImageUri(uri);
    if (!ok) Alert.alert('Sharing unavailable', 'Copy the caption or save the image instead.');
  };

  const handleCopy = async () => {
    await copyCaptionToClipboard(caption);
    Alert.alert('Copied', 'Caption copied to clipboard.');
  };

  const handleSave = async () => {
    const uri = await runCapture();
    if (!uri) return;
    const ok = await saveImageToPhotos(uri);
    Alert.alert(ok ? 'Saved' : 'Permission needed', ok ? 'Image saved to Photos.' : 'Allow Photos access in Settings.');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Share Progress' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.previewWrap}>
          <ProgressShareCard
            primaryColor={colors.primary}
            firstName={profile.firstName}
            goalScore={goalScore}
            trends={trends}
            targetScore={targetScoreResult?.score}
            targetStatusText={targetScoreResult?.statusText}
            target={target}
            streak={getStreak()}
            includePhotos={includePhotos}
            baselinePhoto={baselinePhoto}
            latestPhoto={latestPhoto}
          />
          <View ref={cardRef} style={styles.offscreen} pointerEvents="none">
            <ProgressShareCard
              primaryColor={colors.primary}
              firstName={profile.firstName}
              goalScore={goalScore}
              trends={trends}
              targetScore={targetScoreResult?.score}
              targetStatusText={targetScoreResult?.statusText}
              target={target}
              streak={getStreak()}
              includePhotos={includePhotos}
              baselinePhoto={baselinePhoto}
              latestPhoto={latestPhoto}
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Include progress photos</Text>
          <Switch
            value={includePhotos}
            onValueChange={setIncludePhotos}
            trackColor={{ false: Colors.cardBorder, true: colors.primaryMuted }}
            thumbColor={includePhotos ? colors.primary : Colors.textTertiary}
          />
        </View>

        <Text style={styles.captionPreview}>{caption}</Text>

        {busy && <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />}

        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} disabled={busy} onPress={handleShare}>
          <Text style={styles.primaryBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} disabled={busy} onPress={handleCopy}>
          <Text style={styles.btnText}>Copy caption</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} disabled={busy} onPress={() => void openPhysiqMacrosGroup()}>
          <Text style={styles.btnText}>Open PhysiqMacros group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} disabled={busy} onPress={handleSave}>
          <Text style={styles.btnText}>Save to Photos</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
    previewWrap: { alignItems: 'center' },
    offscreen: { position: 'absolute', left: -9999, top: 0 },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.card,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
    },
    toggleLabel: { color: Colors.text, fontSize: 15, fontWeight: '600', flex: 1, paddingRight: 12 },
    captionPreview: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      backgroundColor: Colors.card,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
    },
    btn: {
      minHeight: 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    primaryBtn: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    btnText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
    primaryBtnText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  });
