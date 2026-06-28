import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import { Radius, Spacing } from '../theme/tokens';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import { usePro } from '../providers/ProProvider';
import {
  ACTIVITY_TYPES,
  ActivityType,
  ATHLETE_SPORTS,
  AthleteCompetitionLevel,
  AthleteIntensity,
  AthleteScheduleEntry,
  AthleteSeasonPhase,
  AthleteSessionType,
  COMPETITION_LEVEL_LABELS,
  deriveAthleteUserType,
  ProDayTypeOverride,
  TrainingPersona,
} from '../features/pro/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_TYPES: AthleteSessionType[] = ['practice', 'training', 'game', 'rest'];
const INTENSITIES: AthleteIntensity[] = ['low', 'moderate', 'high'];

export default function TrainingModeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { athleteProfile, updateAthleteProfile, settings, updateSettings } = usePro();

  const persona = athleteProfile.persona;
  const derivedUserType = deriveAthleteUserType(athleteProfile.competitionLevel);

  const setPersona = (next: TrainingPersona) => {
    void updateAthleteProfile({ persona: next, enabled: next !== 'general' ? true : athleteProfile.enabled });
  };

  const toggleSport = (sport: string) => {
    const exists = athleteProfile.sports.includes(sport);
    const sports = exists
      ? athleteProfile.sports.filter((s) => s !== sport)
      : [...athleteProfile.sports, sport];
    void updateAthleteProfile({ sports, sport: sports[0] ?? '' });
  };

  const toggleActivity = (activity: ActivityType) => {
    const exists = athleteProfile.activities.includes(activity);
    const activities = exists
      ? athleteProfile.activities.filter((a) => a !== activity)
      : [...athleteProfile.activities, activity];
    void updateAthleteProfile({ activities });
  };

  const setCompetitionLevel = (level: AthleteCompetitionLevel) => {
    void updateAthleteProfile({
      competitionLevel: level,
      userType: athleteProfile.userTypeManualOverride ? athleteProfile.userType : deriveAthleteUserType(level),
    });
  };

  const setSeason = (phase: AthleteSeasonPhase) => {
    void updateAthleteProfile({ season: { ...athleteProfile.season, phase } });
  };

  const setDayTypeOverride = (override: ProDayTypeOverride) => {
    updateSettings({ dayTypeOverride: override });
  };

  const addSession = (dayOfWeek: number) => {
    const entry: AthleteScheduleEntry = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dayOfWeek,
      sessionType: 'training',
      durationMin: 60,
      intensity: 'moderate',
    };
    void updateAthleteProfile({ schedule: [...athleteProfile.schedule, entry] });
  };

  const updateSession = (id: string, patch: Partial<AthleteScheduleEntry>) => {
    void updateAthleteProfile({
      schedule: athleteProfile.schedule.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const removeSession = (id: string) => {
    void updateAthleteProfile({ schedule: athleteProfile.schedule.filter((e) => e.id !== id) });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl }}
    >
      <ResponsiveContainer>
        <Text style={styles.intro}>
          Training Mode tailors your fueling to what you do, when you do it, and where you are in your
          season. Set it up here — your macros and hydration adapt automatically.
        </Text>

        <Section title="Who you are" styles={styles}>
          {(
            [
              ['athlete', 'Sport / competitive athlete'],
              ['fitness', 'Fitness / general training'],
              ['general', 'Just tracking (off)'],
            ] as [TrainingPersona, string][]
          ).map(([id, label]) => (
            <Row
              key={id}
              label={label}
              active={persona === id}
              onPress={() => setPersona(id)}
              styles={styles}
            />
          ))}
        </Section>

        {persona === 'athlete' ? (
          <>
            <Section title="Your sport(s)" styles={styles}>
              <View style={styles.chipWrap}>
                {ATHLETE_SPORTS.map((sport) => (
                  <Chip
                    key={sport}
                    label={sport}
                    active={athleteProfile.sports.includes(sport)}
                    onPress={() => toggleSport(sport)}
                    styles={styles}
                  />
                ))}
              </View>
            </Section>

            <Section title="Competition level" styles={styles}>
              <View style={styles.chipWrap}>
                {(Object.keys(COMPETITION_LEVEL_LABELS) as AthleteCompetitionLevel[]).map((level) => (
                  <Chip
                    key={level}
                    label={COMPETITION_LEVEL_LABELS[level]}
                    active={athleteProfile.competitionLevel === level}
                    onPress={() => setCompetitionLevel(level)}
                    styles={styles}
                  />
                ))}
              </View>
              <Text style={styles.help}>
                Experience level is set automatically to{' '}
                <Text style={styles.helpStrong}>{labelForUserType(derivedUserType)}</Text> based on your
                competition level.
              </Text>
            </Section>

            <Section title="Season" styles={styles}>
              <View style={styles.segmentRow}>
                {(['preseason', 'in_season', 'off_season'] as AthleteSeasonPhase[]).map((phase) => (
                  <Segment
                    key={phase}
                    label={phase === 'in_season' ? 'In-season' : phase === 'off_season' ? 'Off-season' : 'Preseason'}
                    active={athleteProfile.season.phase === phase}
                    onPress={() => setSeason(phase)}
                    styles={styles}
                  />
                ))}
              </View>
            </Section>
          </>
        ) : null}

        {persona === 'fitness' ? (
          <Section title="Your activities" styles={styles}>
            <View style={styles.chipWrap}>
              {ACTIVITY_TYPES.map((activity) => (
                <Chip
                  key={activity.id}
                  label={activity.label}
                  active={athleteProfile.activities.includes(activity.id)}
                  onPress={() => toggleActivity(activity.id)}
                  styles={styles}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {persona !== 'general' ? (
          <Section title="Today's day type" styles={styles}>
            <Text style={styles.help}>Override the day type when your plans differ from your activity.</Text>
            <View style={styles.segmentRow}>
              {(
                [
                  ['auto', 'Auto'],
                  ['training', 'Training'],
                  ['competition', 'Competition'],
                  ['rest', 'Rest'],
                ] as [ProDayTypeOverride, string][]
              ).map(([id, label]) => (
                <Segment
                  key={id}
                  label={label}
                  active={(settings.dayTypeOverride ?? 'auto') === id}
                  onPress={() => setDayTypeOverride(id)}
                  styles={styles}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {persona !== 'general' ? (
          <Section title="Weekly schedule" styles={styles}>
            <Text style={styles.help}>
              Add your typical sessions so fueling scales with your training load.
            </Text>
            {DAY_LABELS.map((dayLabel, dayIndex) => {
              const sessions = athleteProfile.schedule.filter((e) => e.dayOfWeek === dayIndex);
              return (
                <View key={dayLabel} style={styles.dayBlock}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{dayLabel}</Text>
                    <PhysiqPressable feedback="tap" onPress={() => addSession(dayIndex)} style={styles.addBtn}>
                      <Text style={styles.addBtnText}>+ Session</Text>
                    </PhysiqPressable>
                  </View>
                  {sessions.length === 0 ? (
                    <Text style={styles.restText}>Rest</Text>
                  ) : (
                    sessions.map((session) => (
                      <View key={session.id} style={styles.sessionCard}>
                        <View style={styles.chipWrap}>
                          {SESSION_TYPES.map((type) => (
                            <Chip
                              key={type}
                              label={capitalize(type)}
                              active={session.sessionType === type}
                              onPress={() => updateSession(session.id, { sessionType: type })}
                              styles={styles}
                              small
                            />
                          ))}
                        </View>
                        <View style={styles.sessionControls}>
                          <View style={styles.stepper}>
                            <PhysiqPressable
                              feedback="select"
                              style={styles.stepBtn}
                              onPress={() =>
                                updateSession(session.id, {
                                  durationMin: Math.max(15, session.durationMin - 15),
                                })
                              }
                            >
                              <Text style={styles.stepBtnText}>−</Text>
                            </PhysiqPressable>
                            <Text style={styles.stepValue}>{session.durationMin}m</Text>
                            <PhysiqPressable
                              feedback="select"
                              style={styles.stepBtn}
                              onPress={() =>
                                updateSession(session.id, {
                                  durationMin: Math.min(240, session.durationMin + 15),
                                })
                              }
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </PhysiqPressable>
                          </View>
                          <PhysiqPressable feedback="destructive" onPress={() => removeSession(session.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                          </PhysiqPressable>
                        </View>
                        <View style={styles.chipWrap}>
                          {INTENSITIES.map((intensity) => (
                            <Chip
                              key={intensity}
                              label={capitalize(intensity)}
                              active={session.intensity === intensity}
                              onPress={() => updateSession(session.id, { intensity })}
                              styles={styles}
                              small
                            />
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </Section>
        ) : null}
      </ResponsiveContainer>
    </ScrollView>
  );
}

function labelForUserType(t: ReturnType<typeof deriveAthleteUserType>): string {
  if (t === 'casual_data_driven') return 'Casual';
  if (t === 'advanced_athlete') return 'Advanced';
  return 'Performance';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Section({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <PhysiqPressable feedback="select" style={[styles.row, active && styles.rowActive]} onPress={onPress}>
      <Text style={[styles.rowText, active && styles.rowTextActive]}>{label}</Text>
    </PhysiqPressable>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  small?: boolean;
}) {
  return (
    <PhysiqPressable
      feedback="select"
      style={[styles.chip, small && styles.chipSmall, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </PhysiqPressable>
  );
}

function Segment({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <PhysiqPressable feedback="select" style={[styles.segment, active && styles.segmentActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </PhysiqPressable>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    intro: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: Spacing.lg },
    section: { marginBottom: Spacing.xl, gap: Spacing.sm },
    sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
    help: { color: Colors.textTertiary, fontSize: 13, lineHeight: 18 },
    helpStrong: { color: colors.primary, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    rowActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    rowText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
    rowTextActive: { color: colors.primary, fontWeight: '700' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    chipSmall: { paddingHorizontal: 10, paddingVertical: 6 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: colors.primary },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segment: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
      borderRadius: Radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    segmentActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    segmentText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: colors.primary },
    dayBlock: {
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: Spacing.sm,
      backgroundColor: Colors.card,
    },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayName: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    addBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primaryMuted },
    addBtnText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    restText: { color: Colors.textTertiary, fontSize: 13 },
    sessionCard: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.cardBorder,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
    },
    sessionControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    stepValue: { color: Colors.text, fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'center' },
    removeText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  });
