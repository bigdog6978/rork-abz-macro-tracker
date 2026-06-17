import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, FileText, Mail, RefreshCw, Shield, Trash2, User, Utensils, Zap } from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { Radius, Shadows, Spacing } from '../../../theme/tokens';
import { useTheme, useThemeColors, type AppColors } from '../../../providers/ThemeProvider';
import { ACCENT_THEMES, type AccentThemeId } from '../../../theme/accentThemes';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import TabScreenTitle from '../../../components/ui/TabScreenTitle';
import ResponsiveContainer from '../../../components/ui/ResponsiveContainer';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { usePro } from '../../../providers/ProProvider';
import ProInfoModal from '../../../components/ui/ProInfoModal';
import HealthPermissionModal from '../../../components/ui/HealthPermissionModal';
import { PRO_COPY } from '../../../src/content/proMicrocopy';
import { getAllergies } from '../../../storage/allergiesRepo';
import { getDislikedFoods } from '../../../storage/dislikedFoodsRepo';
import {
  ACTIVITY_LABELS,
  ActivityLevel,
  cmToFtIn,
  DietaryModifier,
  DIETARY_MODIFIER_LABELS,
  EATING_STYLE_LABELS,
  EatingStyle,
  ftInToCm,
  Goal,
  GOAL_LABELS,
  kgToLb,
  lbToKg,
  MeasurementSystem,
} from '../../../types';

type EditMode = 'none' | 'profile' | 'nutrition';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, macros, updateProfile, resetProfile } = useUser();
  const {
    hasPremium,
    trialActive,
    trialExpired,
    trialDaysRemaining,
    startTrial,
    settings: proSettings,
    healthConnectionStatus,
    dynamicReason,
    dynamicExplainability,
    fuelingStrategy,
    inferredDayType,
    hydration,
    athleteProfile,
    cycleProfile,
    cycleDerived,
    enableHealthIntegration,
    disableHealthIntegration,
    updateSettings: updateProSettings,
    refreshHealthSignals,
    addHydration,
    updateAthleteProfile,
    updateCycleProfile,
    addCycleLog,
    clearCycleData,
    startPurchase,
    restoreActivePurchases,
    lifetimeProduct,
    iapPurchasePending,
    iapRestorePending,
    iapError,
  } = usePro();
  const { clearAll } = useDailyLog();
  const colors = useThemeColors();
  const { accentTheme, setAccentTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [editMode, setEditMode] = useState<EditMode>('none');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>(profile.measurementSystem);
  const [weightLb, setWeightLb] = useState(profile.weightLb.toString());
  const [weightKg, setWeightKg] = useState(lbToKg(profile.weightLb).toString());
  const height = useMemo(() => cmToFtIn(profile.heightCm), [profile.heightCm]);
  const [heightFt, setHeightFt] = useState(String(height.ft));
  const [heightIn, setHeightIn] = useState(String(height.inches));
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [bodyFatPercent, setBodyFatPercent] = useState(profile.bodyFatPercent?.toString() ?? '');
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [eatingStyle, setEatingStyle] = useState<EatingStyle>(profile.eatingStyle);
  const [dietModifiers, setDietModifiers] = useState<DietaryModifier[]>(profile.dietModifiers);
  const [dietNotes, setDietNotes] = useState(profile.dietNotes ?? '');
  const [proInfoVisible, setProInfoVisible] = useState(false);
  const [healthPermissionVisible, setHealthPermissionVisible] = useState(false);
  const [proExpanded, setProExpanded] = useState(hasPremium);

  useEffect(() => {
    setProExpanded(hasPremium);
  }, [hasPremium]);

  useEffect(() => {
    setMeasurementSystem(profile.measurementSystem);
    setWeightLb(profile.weightLb.toString());
    setWeightKg(lbToKg(profile.weightLb).toString());
    const nextHeight = cmToFtIn(profile.heightCm);
    setHeightFt(String(nextHeight.ft));
    setHeightIn(String(nextHeight.inches));
    setHeightCm(String(profile.heightCm));
    setBodyFatPercent(profile.bodyFatPercent?.toString() ?? '');
    setGoal(profile.goal);
    setActivityLevel(profile.activityLevel);
    setEatingStyle(profile.eatingStyle);
    setDietModifiers(profile.dietModifiers);
    setDietNotes(profile.dietNotes ?? '');
  }, [profile]);

  const allergiesQuery = useQuery({
    queryKey: ['user_allergies'],
    queryFn: getAllergies,
  });
  const allergies = allergiesQuery.data ?? [];

  const dislikedFoodsQuery = useQuery({
    queryKey: ['disliked_foods'],
    queryFn: getDislikedFoods,
  });
  const dislikedFoods = dislikedFoodsQuery.data ?? [];

  const handleSaveProfile = useCallback(() => {
    const parsedHeightCm =
      measurementSystem === 'us'
        ? ftInToCm(parseInt(heightFt, 10) || 5, parseInt(heightIn, 10) || 9)
        : parseFloat(heightCm) || profile.heightCm;
    const parsedWeightLb =
      measurementSystem === 'us'
        ? parseFloat(weightLb) || profile.weightLb
        : kgToLb(parseFloat(weightKg) || lbToKg(profile.weightLb));
    const nextBodyFat = parseFloat(bodyFatPercent);
    const nextHeightCm = Number.isFinite(parsedHeightCm) && parsedHeightCm > 0 ? parsedHeightCm : profile.heightCm;
    const nextWeightLb = Number.isFinite(parsedWeightLb) && parsedWeightLb > 0 ? parsedWeightLb : profile.weightLb;
    const normalizedBodyFat =
      Number.isFinite(nextBodyFat) && nextBodyFat >= 3 && nextBodyFat <= 70
        ? nextBodyFat
        : undefined;

    updateProfile({
      heightCm: nextHeightCm,
      weightLb: nextWeightLb,
      bodyFatPercent: normalizedBodyFat,
      measurementSystem,
    });
    setEditMode('none');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [bodyFatPercent, heightCm, heightFt, heightIn, measurementSystem, profile.heightCm, profile.weightLb, updateProfile, weightKg, weightLb]);

  const handleSaveNutrition = useCallback(() => {
    updateProfile({
      goal,
      activityLevel,
      eatingStyle,
      dietModifiers,
      dietNotes: dietNotes.trim(),
    });
    setEditMode('none');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [activityLevel, dietModifiers, dietNotes, eatingStyle, goal, updateProfile]);

  const toggleModifier = useCallback((modifier: DietaryModifier) => {
    setDietModifiers((current) =>
      current.includes(modifier)
        ? current.filter((item) => item !== modifier)
        : [...current, modifier]
    );
  }, []);

  const handleResetData = useCallback(() => {
    Alert.alert('Clear Food Logs', 'This will delete your food logs but keep your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearAll(),
      },
    ]);
  }, [clearAll]);

  const handleResetProfile = useCallback(() => {
    Alert.alert('Reset Everything', 'This will clear your profile and send you back through onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          await resetProfile();
        },
      },
    ]);
  }, [clearAll, resetProfile]);

  const handleAccentThemePress = useCallback(async (themeId: AccentThemeId) => {
    await setAccentTheme(themeId);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [setAccentTheme]);

  const premiumPriceText = lifetimeProduct?.priceText ?? PRO_COPY.priceFallback;

  const unlockLifetime = useCallback(() => {
    Alert.alert(
      'Unlock Physiq Premium',
      `${premiumPriceText} — one-time purchase, yours forever. No subscription and no auto-renewal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            const ok = await startPurchase();
            if (!ok) {
              Alert.alert('Purchase not completed', 'Unable to complete the purchase right now. Please try again.');
            }
          },
        },
      ]
    );
  }, [premiumPriceText, startPurchase]);

  const startFreeTrial = useCallback(() => {
    void startTrial();
  }, [startTrial]);

  const completeHealthConnect = useCallback(async () => {
    setHealthPermissionVisible(false);
    const ok = await enableHealthIntegration();
    if (!ok) {
      Alert.alert(
        'Apple Health access needed',
        'To use adaptive Pro targets, enable Apple Health access in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [enableHealthIntegration]);

  const toggleHealthIntegration = useCallback(async () => {
    if (proSettings.healthIntegrationEnabled) {
      disableHealthIntegration();
      return;
    }
    setHealthPermissionVisible(true);
  }, [disableHealthIntegration, proSettings.healthIntegrationEnabled]);

  if (!profile.onboardingComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Complete onboarding first</Text>
        </View>
      </View>
    );
  }

  const allergySummary =
    allergies.length === 0
      ? 'None'
      : allergies.length <= 2
        ? allergies.map((item) => item.name).join(', ')
        : `${allergies[0].name}, ${allergies[1].name} +${allergies.length - 2}`;

  const dislikedFoodsSummary =
    dislikedFoods.length === 0
      ? 'None excluded'
      : `${dislikedFoods.length} food${dislikedFoods.length !== 1 ? 's' : ''} excluded`;

  const currentWeightLabel =
    profile.measurementSystem === 'us'
      ? `${profile.weightLb} lb`
      : `${lbToKg(profile.weightLb)} kg`;
  const healthStatusLabel =
    healthConnectionStatus === 'connected'
      ? 'Connected'
      : healthConnectionStatus === 'denied_or_restricted'
        ? 'Denied'
        : healthConnectionStatus === 'not_available'
          ? 'Not available'
          : 'Not connected';
  const healthActionLabel =
    healthConnectionStatus === 'connected'
      ? 'Refresh'
      : healthConnectionStatus === 'denied_or_restricted'
        ? 'Open Settings'
        : healthConnectionStatus === 'not_available'
          ? 'Unavailable'
          : 'Connect';
  const purchasedLifetime = hasPremium && !trialActive;
  const selectedProductTitle = 'Physiq Premium';
  const selectedProductSubtitle = purchasedLifetime
    ? 'Lifetime access unlocked'
    : trialActive
      ? PRO_COPY.trialDaysLeft.replace('{n}', String(trialDaysRemaining))
      : trialExpired
        ? PRO_COPY.trialEndedTitle
        : PRO_COPY.subheadline;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
        <DashboardBrandHeader />
        <TabScreenTitle title="Settings" />
        <View style={styles.macroSummary}>
          <Text style={styles.sectionTitle}>Current Targets</Text>
          <View style={styles.macroRow}>
            <MetricCard label="Calories" value={String(macros.calories)} color={Colors.calories} styles={styles} />
            <MetricCard label="Protein" value={`${macros.protein_g}g`} color={Colors.protein} styles={styles} />
            <MetricCard label="Carbs" value={`${macros.carbs_g}g`} color={Colors.carbs} styles={styles} />
            <MetricCard label="Fat" value={`${macros.fat_g}g`} color={Colors.fat} styles={styles} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} activeOpacity={1}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
              <Zap size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{selectedProductTitle}</Text>
              <Text style={styles.rowSubtitle}>{selectedProductSubtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.proInfoIconBtn}
              onPress={() => setProExpanded((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {proExpanded ? (
                <ChevronUp size={14} color={Colors.textSecondary} />
              ) : (
                <ChevronDown size={14} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.proInfoIconBtn}
              onPress={() => setProInfoVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FileText size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
          {!proExpanded ? (
            <View style={styles.collapsedProWrap}>
              <View style={styles.healthStatusRow}>
                <Text style={styles.healthStatusLabel} numberOfLines={1}>
                  Health connection
                </Text>
                <View style={styles.healthStatusRight}>
                  <View
                    style={[
                      styles.healthStatusBadge,
                      healthConnectionStatus === 'connected'
                        ? styles.healthStatusConnected
                        : healthConnectionStatus === 'denied_or_restricted'
                          ? styles.healthStatusDenied
                          : null,
                    ]}
                  >
                    <Text style={styles.healthStatusBadgeText} numberOfLines={1}>
                      {healthStatusLabel}
                    </Text>
                  </View>
                </View>
              </View>
              {hasPremium && Platform.OS === 'ios' && !proSettings.healthIntegrationEnabled ? (
                <View style={styles.healthBanner}>
                  <Text style={styles.healthBannerTitle}>{PRO_COPY.healthRequiredBannerTitle}</Text>
                  <Text style={styles.healthBannerBody}>{PRO_COPY.healthRequiredBannerBody}</Text>
                  <TouchableOpacity
                    style={styles.healthBannerCta}
                    onPress={() => setHealthPermissionVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.healthBannerCtaText}>{PRO_COPY.healthRequiredBannerCta}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={styles.watchRequiredNote}>{PRO_COPY.watchRequiredNote}</Text>
              <TouchableOpacity
                style={styles.proCollapsedCta}
                onPress={() => setProExpanded(true)}
              >
                <Text style={styles.proCollapsedCtaText}>
                  {hasPremium ? 'Expand' : 'View Premium options'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.editor}>
            {!hasPremium ? (
              <>
                {trialExpired ? (
                  <Text style={styles.proDisclosureText}>
                    {PRO_COPY.trialEndedTitle}. {PRO_COPY.trialEndedBody}
                  </Text>
                ) : (
                  <Text style={styles.proDisclosureText}>
                    Unlock everything with a single one-time purchase of {premiumPriceText} — yours forever. No subscription and no auto-renewal.
                  </Text>
                )}
                {iapError ? <Text style={styles.proDisclosureText}>{iapError}</Text> : null}
                {!trialExpired ? (
                  <>
                    <TouchableOpacity
                      style={[styles.proOutlineBtn, styles.proOutlineBtnSelected, { borderColor: colors.primary }]}
                      onPress={startFreeTrial}
                    >
                      <Text style={[styles.proOutlineBtnText, { color: colors.primary }]}>{PRO_COPY.trialCta}</Text>
                    </TouchableOpacity>
                    <Text style={styles.proDisclosureText}>{PRO_COPY.trialDisclosure}</Text>
                  </>
                ) : null}
                <View style={styles.proActionRow}>
                  <TouchableOpacity
                    style={[styles.proOutlineBtn, styles.proOutlineBtnSelected, { borderColor: colors.primary }]}
                    onPress={unlockLifetime}
                    disabled={iapPurchasePending}
                  >
                    <Text style={[styles.proOutlineBtnText, { color: colors.primary }]}>
                      {iapPurchasePending ? 'Processing…' : PRO_COPY.ctaUnlock}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.proLegalLinks}>
                  <TouchableOpacity onPress={() => void restoreActivePurchases()}>
                    <Text style={styles.proLegalLinkText}>{iapRestorePending ? 'Restoring…' : PRO_COPY.ctaRestore}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.proLegalLinks}>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'terms' } })}>
                    <Text style={styles.proLegalLinkText}>Terms of Use</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'privacy' } })}>
                    <Text style={styles.proLegalLinkText}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {trialActive ? (
                  <View style={styles.healthBanner}>
                    <Text style={styles.healthBannerTitle}>
                      {PRO_COPY.trialDaysLeft.replace('{n}', String(trialDaysRemaining))}
                    </Text>
                    <Text style={styles.healthBannerBody}>
                      You have full premium access during your trial. {PRO_COPY.trialEndedBody}
                    </Text>
                    <TouchableOpacity
                      style={styles.healthBannerCta}
                      onPress={unlockLifetime}
                      disabled={iapPurchasePending}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.healthBannerCtaText}>
                        {iapPurchasePending ? 'Processing…' : PRO_COPY.ctaUnlockLifetimePrice.replace('{price}', premiumPriceText)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {Platform.OS === 'ios' && !proSettings.healthIntegrationEnabled ? (
                  <View style={styles.healthBanner}>
                    <Text style={styles.healthBannerTitle}>{PRO_COPY.healthRequiredBannerTitle}</Text>
                    <Text style={styles.healthBannerBody}>{PRO_COPY.healthRequiredBannerBody}</Text>
                    <TouchableOpacity
                      style={styles.healthBannerCta}
                      onPress={() => setHealthPermissionVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.healthBannerCtaText}>{PRO_COPY.healthRequiredBannerCta}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Text style={styles.rowSubtitle}>Day Type: {inferredDayType.replace('_', ' ')}</Text>
                <Text style={styles.rowSubtitle}>{dynamicReason}</Text>
                {fuelingStrategy ? <Text style={styles.rowSubtitle}>{fuelingStrategy}</Text> : null}
                {dynamicExplainability?.length ? (
                  <View style={styles.chipWrap}>
                    {dynamicExplainability.map((line: string) => (
                      <View key={line} style={styles.chip}>
                        <Text style={styles.chipText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {athleteProfile.enabled ? (
                  <View style={styles.healthBanner}>
                    <Text style={styles.healthBannerTitle}>Athlete Configuration</Text>
                    <Text style={styles.healthBannerBody}>
                      {athleteProfile.sport} · {athleteProfile.userType.replace('_', ' ')} · {athleteProfile.season.phase.replace('_', '-')}
                    </Text>
                    <View style={styles.proActionRow}>
                      <TouchableOpacity
                        style={styles.proOutlineBtn}
                        onPress={() =>
                          void updateAthleteProfile({
                            enabled: true,
                            season: {
                              ...athleteProfile.season,
                              phase:
                                athleteProfile.season.phase === 'preseason'
                                  ? 'in_season'
                                  : athleteProfile.season.phase === 'in_season'
                                    ? 'off_season'
                                    : 'preseason',
                            },
                          })
                        }
                      >
                        <Text style={styles.proOutlineBtnText}>Cycle Season</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.proOutlineBtn}
                        onPress={() =>
                          void updateCycleProfile({
                            enabled: !cycleProfile.enabled,
                            cycleDataConsentGivenAt: !cycleProfile.enabled ? new Date().toISOString() : undefined,
                            cycleDataConsentVersion: !cycleProfile.enabled ? 'v1' : undefined,
                          })
                        }
                      >
                        <Text style={styles.proOutlineBtnText}>
                          {cycleProfile.enabled ? 'Disable Female Track' : 'Enable Female Track'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {cycleProfile.enabled ? (
                      <>
                        <Text style={styles.rowSubtitle}>
                          Cycle phase: {cycleDerived.currentPhase} ({cycleDerived.phaseConfidence})
                        </Text>
                        <View style={styles.proActionRow}>
                          <TouchableOpacity
                            style={styles.proOutlineBtn}
                            onPress={() =>
                              void addCycleLog({
                                date: new Date().toISOString().slice(0, 10),
                                phaseTag: 'menstrual',
                                symptoms: ['fatigue'],
                              })
                            }
                          >
                            <Text style={styles.proOutlineBtnText}>Log Fatigue Day</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.proOutlineBtn} onPress={() => void clearCycleData()}>
                            <Text style={styles.proOutlineBtnText}>Delete Cycle Data</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.chipWrap}>
                  <Chip
                    active={proSettings.healthIntegrationEnabled}
                    label="Health Integration"
                    onPress={() => void toggleHealthIntegration()}
                    colors={colors}
                    styles={styles}
                  />
                  <Chip
                    active={proSettings.dynamicMacrosEnabled}
                    label="Dynamic Macros"
                    onPress={() => updateProSettings({ dynamicMacrosEnabled: !proSettings.dynamicMacrosEnabled })}
                    colors={colors}
                    styles={styles}
                  />
                  <Chip
                    active={proSettings.hydrationEnabled}
                    label="Hydration"
                    onPress={() => updateProSettings({ hydrationEnabled: !proSettings.hydrationEnabled })}
                    colors={colors}
                    styles={styles}
                  />
                  <Chip
                    active={athleteProfile.enabled}
                    label="Athlete Mode"
                    onPress={() => void updateAthleteProfile({ enabled: !athleteProfile.enabled })}
                    colors={colors}
                    styles={styles}
                  />
                </View>
                <View style={styles.healthStatusRow}>
                  <Text style={styles.healthStatusLabel} numberOfLines={1}>
                    Health connection
                  </Text>
                  <View style={styles.healthStatusRight}>
                    <View
                      style={[
                        styles.healthStatusBadge,
                        healthConnectionStatus === 'connected'
                          ? styles.healthStatusConnected
                          : healthConnectionStatus === 'denied_or_restricted'
                            ? styles.healthStatusDenied
                            : null,
                      ]}
                    >
                      <Text style={styles.healthStatusBadgeText} numberOfLines={1}>
                        {healthStatusLabel}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.healthActionBtn}
                      onPress={() => {
                        if (healthConnectionStatus === 'connected') {
                          void refreshHealthSignals();
                        } else if (healthConnectionStatus === 'denied_or_restricted') {
                          Linking.openSettings();
                        } else if (healthConnectionStatus === 'not_connected') {
                          setHealthPermissionVisible(true);
                        }
                      }}
                      disabled={healthConnectionStatus === 'not_available'}
                    >
                      <Text style={styles.healthActionBtnText} numberOfLines={1}>
                        {healthActionLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.watchRequiredNote}>{PRO_COPY.watchRequiredNote}</Text>
                <Text style={styles.watchOptionalNote}>{PRO_COPY.watchOptionalNote}</Text>
                <View style={styles.proActionRow}>
                  <TouchableOpacity style={styles.proOutlineBtn} onPress={() => void refreshHealthSignals()}>
                    <Text style={styles.proOutlineBtnText}>Refresh Health</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proOutlineBtn} onPress={() => router.push('/pro-report' as never)}>
                    <Text style={styles.proOutlineBtnText}>Open Pro Report</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.rowSubtitle}>
                  Hydration: {hydration.consumedMl} / {hydration.targetMl} ml
                </Text>
                <View style={styles.proActionRow}>
                  <TouchableOpacity style={styles.proOutlineBtn} onPress={() => addHydration(250)}>
                    <Text style={styles.proOutlineBtnText}>+250ml</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proOutlineBtn} onPress={() => addHydration(500)}>
                    <Text style={styles.proOutlineBtnText}>+500ml</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proOutlineBtn} onPress={() => addHydration(750)}>
                    <Text style={styles.proOutlineBtnText}>+750ml</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.proLegalLinks}>
                  <TouchableOpacity onPress={() => void restoreActivePurchases()}>
                    <Text style={styles.proLegalLinkText}>{iapRestorePending ? 'Restoring…' : PRO_COPY.ctaRestore}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.proLegalLinks}>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'terms' } })}>
                    <Text style={styles.proLegalLinkText}>Terms of Use</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'privacy' } })}>
                    <Text style={styles.proLegalLinkText}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={() => setEditMode(editMode === 'profile' ? 'none' : 'profile')}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
              <User size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Body Stats</Text>
              <Text style={styles.rowSubtitle}>{profile.age}y · {profile.sex} · {currentWeightLabel}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          {editMode === 'profile' ? (
            <View style={styles.editor}>
              <Text style={styles.fieldLabel}>Units</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    measurementSystem === 'us' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => setMeasurementSystem('us')}
                >
                  <Text style={[styles.segmentText, measurementSystem === 'us' && { color: colors.primary }]}>US</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    measurementSystem === 'metric' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => setMeasurementSystem('metric')}
                >
                  <Text style={[styles.segmentText, measurementSystem === 'metric' && { color: colors.primary }]}>Metric</Text>
                </TouchableOpacity>
              </View>

              {measurementSystem === 'us' ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputHalf]}
                    value={heightFt}
                    onChangeText={setHeightFt}
                    keyboardType="number-pad"
                    placeholder="ft"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, styles.inputHalf]}
                    value={heightIn}
                    onChangeText={setHeightIn}
                    keyboardType="number-pad"
                    placeholder="in"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="Height (cm)"
                  placeholderTextColor={Colors.textTertiary}
                />
              )}

              <TextInput
                style={styles.input}
                value={measurementSystem === 'us' ? weightLb : weightKg}
                onChangeText={measurementSystem === 'us' ? setWeightLb : setWeightKg}
                keyboardType="decimal-pad"
                placeholder={measurementSystem === 'us' ? 'Weight (lb)' : 'Weight (kg)'}
                placeholderTextColor={Colors.textTertiary}
              />

              <TextInput
                style={styles.input}
                value={bodyFatPercent}
                onChangeText={setBodyFatPercent}
                keyboardType="decimal-pad"
                placeholder="Body fat % (optional)"
                placeholderTextColor={Colors.textTertiary}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile}>
                <Text style={styles.primaryButtonText}>Save Body Stats</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => setEditMode(editMode === 'nutrition' ? 'none' : 'nutrition')}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.fatMuted }]}>
              <RefreshCw size={16} color={Colors.fat} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Nutrition Setup</Text>
              <Text style={styles.rowSubtitle}>
                {GOAL_LABELS[profile.goal]} · {ACTIVITY_LABELS[profile.activityLevel]} · {EATING_STYLE_LABELS[profile.eatingStyle]}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          {editMode === 'nutrition' ? (
            <View style={styles.editor}>
              <Text style={styles.nutritionSectionLabel}>Goal</Text>
              <View style={styles.chipWrap}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map((value) => (
                  <Chip key={value} active={goal === value} label={GOAL_LABELS[value]} onPress={() => setGoal(value)} colors={colors} styles={styles} />
                ))}
              </View>

              <Text style={styles.nutritionSectionLabel}>Activity Level</Text>
              <View style={styles.chipWrap}>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((value) => (
                  <Chip
                    key={value}
                    active={activityLevel === value}
                    label={ACTIVITY_LABELS[value]}
                    onPress={() => setActivityLevel(value)}
                    colors={colors}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={styles.nutritionSectionLabel}>Eating Style</Text>
              <View style={styles.chipWrap}>
                {(Object.keys(EATING_STYLE_LABELS) as EatingStyle[]).map((value) => (
                  <Chip
                    key={value}
                    active={eatingStyle === value}
                    label={EATING_STYLE_LABELS[value]}
                    onPress={() => setEatingStyle(value)}
                    colors={colors}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={styles.nutritionSectionLabel}>Dietary Restrictions & Preferences</Text>
              <View style={styles.chipWrap}>
                {(Object.keys(DIETARY_MODIFIER_LABELS) as DietaryModifier[]).map((modifier) => (
                  <Chip
                    key={modifier}
                    active={dietModifiers.includes(modifier)}
                    label={DIETARY_MODIFIER_LABELS[modifier]}
                    onPress={() => toggleModifier(modifier)}
                    colors={colors}
                    styles={styles}
                  />
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.notesInput]}
                value={dietNotes}
                onChangeText={setDietNotes}
                multiline
                placeholder="Other dietary notes"
                placeholderTextColor={Colors.textTertiary}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveNutrition}>
                <Text style={styles.primaryButtonText}>Save Nutrition Setup</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/settings/allergies' as never)}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.warningMuted }]}>
              <AlertCircle size={16} color={Colors.warning} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Allergies</Text>
              <Text style={styles.rowSubtitle}>{allergySummary}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/settings/food-preferences' as never)}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
              <Utensils size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Food Preferences</Text>
              <Text style={styles.rowSubtitle}>{dislikedFoodsSummary}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.settingsRow}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
              <RefreshCw size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Accent Theme</Text>
              <Text style={styles.rowSubtitle}>Choose the highlight color used across the app.</Text>
            </View>
          </View>
          <View style={styles.themePickerWrap}>
            {Object.entries(ACCENT_THEMES).map(([themeId, theme]) => {
              const active = accentTheme === themeId;
              return (
                <TouchableOpacity
                  key={themeId}
                  style={[
                    styles.themeChip,
                    active && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryMuted,
                    },
                  ]}
                  onPress={() => void handleAccentThemePress(themeId as AccentThemeId)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.themeDot, { backgroundColor: theme.primary }]} />
                  <Text
                    style={[
                      styles.themeChipText,
                      active && { color: colors.primary },
                    ]}
                  >
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'privacy' } })}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.carbsMuted }]}>
              <Shield size={16} color={Colors.carbs} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'terms' } })}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.warningMuted }]}>
              <FileText size={16} color={Colors.warning} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Terms of Use</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'contact' } })}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.successMuted }]}>
              <Mail size={16} color={Colors.success} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Contact & Support</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/settings/nutrition-science' as never)}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
              <FileText size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Nutrition Science & References</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={handleResetData}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.dangerMuted }]}>
              <Trash2 size={16} color={Colors.danger} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: Colors.danger }]}>Clear Food Logs</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingsRow} onPress={handleResetProfile}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.dangerMuted }]}>
              <Trash2 size={16} color={Colors.danger} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: Colors.danger }]}>Reset Everything</Text>
            </View>
          </TouchableOpacity>
        </View>
        </ResponsiveContainer>
      </ScrollView>
      <ProInfoModal visible={proInfoVisible} onClose={() => setProInfoVisible(false)} />
      <HealthPermissionModal
        visible={healthPermissionVisible}
        onContinue={() => void completeHealthConnect()}
        onNotNow={() => setHealthPermissionVisible(false)}
      />
    </View>
  );
}

function Chip({
  active,
  label,
  onPress,
  colors,
  styles,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricCard({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  macroSummary: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...(Shadows.card as Record<string, unknown>),
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 62,
  },
  proInfoIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedProWrap: {
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  proCollapsedCta: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  proCollapsedCtaText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  editor: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  proDisclosureText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  watchRequiredNote: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  watchOptionalNote: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
  },
  healthBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    padding: 12,
    gap: 8,
  },
  healthBannerTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  healthBannerBody: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  healthBannerCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  healthBannerCtaText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  proActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  healthStatusLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  healthStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  healthStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
    maxWidth: 120,
    flexShrink: 1,
  },
  healthStatusConnected: {
    borderColor: Colors.success,
    backgroundColor: Colors.successMuted,
  },
  healthStatusDenied: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningMuted,
  },
  healthStatusBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  healthActionBtn: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 110,
    flexShrink: 1,
  },
  healthActionBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  proOutlineBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  proOutlineBtnSelected: {
    backgroundColor: colors.primaryMuted,
  },
  proOutlineBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  proLegalLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  proLegalLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionSectionLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputHalf: {
    flex: 1,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  themePickerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  themeChipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
