import { UserProfile } from '../types';

/** McDonald RFLH — ~1.1–1.5 g/lb lean mass; we use 1.25 g/lb LBM. */
export const PSMF_PROTEIN_G_PER_LB_LEAN = 1.25;
export const PSMF_PROTEIN_G_PER_LB_BW_FLOOR = 1.0;
export const PSMF_FAT_G_FEMALE = 20;
export const PSMF_FAT_G_MALE = 25;
export const PSMF_CARBS_G = 25;
/** Calories will not drop below TDEE × this factor (~45% max deficit). */
export const PSMF_MAX_DEFICIT_FACTOR = 0.55;

export const PSMF_MAX_RECOMMENDED_DAYS = 14;

export function getBmi(weightLb: number, heightCm: number): number | undefined {
  if (!Number.isFinite(weightLb) || weightLb <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    return undefined;
  }
  const weightKg = weightLb * 0.45359237;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Lean individual — extra PSMF warning (male BF <12%, female BF <20%, or BMI <20). */
export function isLeanForPsmf(profile: Pick<UserProfile, 'sex' | 'bodyFatPercent' | 'weightLb' | 'heightCm'>): boolean {
  const bmi = getBmi(profile.weightLb, profile.heightCm);
  if (bmi != null && bmi < 20) return true;
  if (profile.bodyFatPercent == null) return false;
  const threshold = profile.sex === 'male' ? 12 : 20;
  return profile.bodyFatPercent < threshold;
}

export function getPsmfDaysElapsed(startDate?: string): number | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

export function isPsmfDurationExceeded(startDate?: string): boolean {
  const days = getPsmfDaysElapsed(startDate);
  return days != null && days > PSMF_MAX_RECOMMENDED_DAYS;
}

export function buildPsmfProfileUpdates(
  previous: UserProfile,
  nextEatingStyle: UserProfile['eatingStyle'],
  acknowledgedAt?: string
): Partial<UserProfile> {
  const updates: Partial<UserProfile> = {};

  if (nextEatingStyle === 'psmf') {
    if (acknowledgedAt) {
      updates.psmfAcknowledgedAt = acknowledgedAt;
    }
    if (previous.eatingStyle !== 'psmf' || !previous.psmfStartDate) {
      updates.psmfStartDate = new Date().toISOString().slice(0, 10);
    }
  } else if (previous.eatingStyle === 'psmf') {
    updates.psmfStartDate = undefined;
  }

  return updates;
}

export function hasValidPsmfAcknowledgment(
  profile: Pick<UserProfile, 'eatingStyle' | 'psmfAcknowledgedAt'>
): boolean {
  return profile.eatingStyle !== 'psmf' || Boolean(profile.psmfAcknowledgedAt);
}
