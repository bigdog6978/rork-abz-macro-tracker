import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Colors from '../constants/colors';
import { Spacing, Radius } from '../theme/tokens';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import { useUser } from '../providers/UserProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { usePhotos } from '../providers/PhotosProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useGoalSettings } from '../providers/GoalSettingsProvider';
import { computeGoalProgressScoreFromTarget } from '../features/progress/progressScoring';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import DailyMacrosShareCard from '../components/share/DailyMacrosShareCard';
import ProgressPhotoShareCard from '../components/share/ProgressPhotoShareCard';
import BodyProgressShareCard from '../components/share/BodyProgressShareCard';
import ShareDestinationSheet from '../components/share/ShareDestinationSheet';
import { buildShareCaption } from '../utils/share/shareCaption';
import {
  buildPhotoStatChips,
  isDailyMacrosShareable,
  pickDefaultShareTemplate,
} from '../utils/share/shareMetrics';
import {
  type ShareDestination,
  type ShareTemplateId,
} from '../utils/share/shareConstants';
import {
  captureShareCard,
  copyCaptionToClipboard,
  saveImageToPhotos,
  shareImageToDestination,
  showShareHandoffToast,
} from '../utils/share/shareProgress';

const TEMPLATE_LABELS: Record<ShareTemplateId, string> = {
  daily_macros: 'Daily',
  progress_photo: 'Photo',
  body_progress: 'Body',
};

function parseTemplateParam(value: string | string[] | undefined): ShareTemplateId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'daily_macros' || raw === 'progress_photo' || raw === 'body_progress') return raw;
  return null;
}

export default function ShareProgressScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ template?: string }>();
  const cardRef = useRef<View>(null);
  const capturedUriRef = useRef<string | null>(null);

  const { profile, macros } = useUser();
  const { baseline, latest, goalScore, trends } = useMeasurements();
  const { baseline: baselinePhoto, latest: latestPhoto } = usePhotos();
  const { todayTotals, getStreak } = useDailyLog();
  const { target } = useGoalSettings();

  const [template, setTemplate] = useState<ShareTemplateId>('body_progress');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const targetScoreResult =
    target && (baseline || latest)
      ? computeGoalProgressScoreFromTarget(baseline, latest, target)
      : null;

  const hasDailyData = isDailyMacrosShareable(todayTotals);
  const hasLatestPhoto = Boolean(latestPhoto?.fileUri);
  const hasBodyProgress = Boolean(baseline && latest && baseline.id !== latest.id);
  const caloriesProgress =
    macros.calories > 0 ? todayTotals.calories / macros.calories : 0;

  const photoStatChips = useMemo(
    () => buildPhotoStatChips(trends, baseline, latest),
    [trends, baseline, latest]
  );

  const templateEnabled: Record<ShareTemplateId, boolean> = {
    daily_macros: hasDailyData,
    progress_photo: hasLatestPhoto,
    body_progress: hasBodyProgress || trends.length > 0,
  };

  useEffect(() => {
    const fromParam = parseTemplateParam(params.template);
    if (fromParam && templateEnabled[fromParam]) {
      setTemplate(fromParam);
      return;
    }
    setTemplate(
      pickDefaultShareTemplate({
        hasDailyData,
        caloriesProgress,
        hasLatestPhoto,
        hasBodyProgress,
      })
    );
  }, [params.template, hasDailyData, caloriesProgress, hasLatestPhoto, hasBodyProgress]);

  const caption = buildShareCaption({
    firstName: profile.firstName,
    goalScore,
    trends,
    targetScore: targetScoreResult?.score,
    targetStatusText: targetScoreResult?.statusText,
    target,
    streak: getStreak(),
    template,
    dailyMacros: {
      caloriesConsumed: todayTotals.calories,
      caloriesTarget: macros.calories,
    },
    photoStatChips,
  });

  const previewWidth = Math.min(windowWidth - Spacing.lg * 2, 320);
  const previewScale = previewWidth / 1080;
  const previewHeightScaled = 1920 * previewScale;

  const renderCard = useCallback(
    () => {
      if (template === 'daily_macros') {
        return (
          <DailyMacrosShareCard
            primaryColor={colors.primary}
            firstName={profile.firstName}
            caloriesConsumed={todayTotals.calories}
            caloriesTarget={macros.calories}
            proteinConsumed={todayTotals.protein_g}
            proteinTarget={macros.protein_g}
            carbsConsumed={todayTotals.carbs_g}
            carbsTarget={macros.carbs_g}
            fatConsumed={todayTotals.fat_g}
            fatTarget={macros.fat_g}
            streak={getStreak()}
          />
        );
      }
      if (template === 'progress_photo' && latestPhoto) {
        return (
          <ProgressPhotoShareCard
            primaryColor={colors.primary}
            firstName={profile.firstName}
            photoUri={latestPhoto.fileUri}
            statChips={photoStatChips}
          />
        );
      }
      return (
        <BodyProgressShareCard
          primaryColor={colors.primary}
          firstName={profile.firstName}
          goalScore={goalScore}
          trends={trends}
          targetScore={targetScoreResult?.score}
          targetStatusText={targetScoreResult?.statusText}
          target={target}
          streak={getStreak()}
        />
      );
    },
    [
      template,
      colors.primary,
      profile.firstName,
      todayTotals,
      macros,
      getStreak,
      latestPhoto,
      photoStatChips,
      goalScore,
      trends,
      targetScoreResult,
      target,
    ]
  );

  const runCapture = async (): Promise<string | null> => {
    if (capturedUriRef.current) return capturedUriRef.current;
    setBusy(true);
    try {
      const uri = await captureShareCard(cardRef);
      capturedUriRef.current = uri;
      return uri;
    } finally {
      setBusy(false);
    }
  };

  const handleOpenShare = async () => {
    const uri = await runCapture();
    if (!uri) {
      Alert.alert('Could not create image', 'Please try again.');
      return;
    }
    setSheetVisible(true);
  };

  const handleDestination = async (destination: ShareDestination) => {
    setSheetVisible(false);
    const uri = capturedUriRef.current ?? (await runCapture());
    if (!uri) {
      Alert.alert('Could not create image', 'Please try again.');
      return;
    }
    setBusy(true);
    try {
      const ok = await shareImageToDestination(uri, destination);
      if (destination === 'save_photos') {
        Alert.alert(ok ? 'Saved' : 'Permission needed', ok ? 'Image saved to Photos.' : 'Allow Photos access in Settings.');
      } else if (!ok && destination !== 'facebook_group') {
        Alert.alert('Sharing unavailable', 'Try Save to Photos or copy the caption.');
      } else if (ok && (destination === 'instagram' || destination === 'tiktok')) {
        showShareHandoffToast(destination);
      }
    } finally {
      setBusy(false);
    }
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
        <View style={styles.chipRow}>
          {(Object.keys(TEMPLATE_LABELS) as ShareTemplateId[]).map((id) => {
            const active = template === id;
            const enabled = templateEnabled[id];
            return (
              <PhysiqPressable
                key={id}
                feedback="select"
                disabled={!enabled}
                style={[styles.chip, active && styles.chipActive, !enabled && styles.chipDisabled]}
                onPress={() => {
                  capturedUriRef.current = null;
                  setTemplate(id);
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{TEMPLATE_LABELS[id]}</Text>
              </PhysiqPressable>
            );
          })}
        </View>

        {!templateEnabled[template] ? (
          <Text style={styles.emptyHint}>
            {template === 'daily_macros'
              ? 'Log food today to share your daily macros.'
              : template === 'progress_photo'
                ? 'Add a progress photo first.'
                : 'Add baseline measurements to share body progress.'}
          </Text>
        ) : null}

        <View style={[styles.previewFrame, { width: previewWidth, height: previewHeightScaled }]}>
          <View
            style={[
              styles.previewScale,
              {
                width: 1080,
                height: 1920,
                transform: [{ scale: previewScale }],
              },
            ]}
          >
            {renderCard()}
          </View>
        </View>

        <View ref={cardRef} style={styles.offscreen} pointerEvents="none">
          {renderCard()}
        </View>

        <Text style={styles.captionPreview}>{caption}</Text>

        {busy ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} /> : null}

        <PhysiqPressable feedback="confirm" style={styles.primaryBtn} disabled={busy} onPress={handleOpenShare}>
          <Text style={styles.primaryBtnText}>Share to…</Text>
        </PhysiqPressable>
        <PhysiqPressable feedback="tap" style={styles.btn} disabled={busy} onPress={handleCopy}>
          <Text style={styles.btnText}>Copy caption</Text>
        </PhysiqPressable>
        <PhysiqPressable feedback="tap" style={styles.btn} disabled={busy} onPress={handleSave}>
          <Text style={styles.btnText}>Save to Photos</Text>
        </PhysiqPressable>
      </ScrollView>

      <ShareDestinationSheet
        visible={sheetVisible}
        busy={busy}
        onClose={() => setSheetVisible(false)}
        onSelect={(d) => void handleDestination(d)}
      />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      minHeight: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    chipDisabled: { opacity: 0.45 },
    chipText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
    chipTextActive: { color: colors.primary },
    emptyHint: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
    previewFrame: {
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: Radius.lg,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewScale: {
      transformOrigin: 'top left',
    },
    offscreen: { position: 'absolute', left: -9999, top: 0 },
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
    primaryBtn: {
      minHeight: 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    btnText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
    primaryBtnText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  });
