import { UserProfile } from '../types';

/** McDonald RFLH default for category 2 when body fat is known. */
export const PSMF_PROTEIN_G_PER_LB_LEAN = 1.25;
/** Minimum protein when lean-mass estimate is unavailable (g/lb total body weight). */
export const PSMF_PROTEIN_G_PER_LB_BW_FLOOR = 1.0;
/** McDonald category 1 (lean) upper bound — g/lb lean mass. */
export const PSMF_PROTEIN_G_PER_LB_LEAN_MAX = 1.5;
export const PSMF_FAT_G_FEMALE = 20;
export const PSMF_FAT_G_MALE = 25;
export const PSMF_CARBS_G = 25;
/** Reference only: typical aggressive-deficit ceiling (~45% below TDEE). Used for warnings, not macro math. */
export const PSMF_MAX_DEFICIT_FACTOR = 0.55;

const MIN_PLAUSIBLE_BODY_FAT_PERCENT = 3;
const MAX_PLAUSIBLE_BODY_FAT_PERCENT = 70;

/** McDonald RFLH dieting categories from body-fat percentage. */
export type PsmfCategory = 1 | 2 | 3;

/** g protein per lb lean mass by McDonald RFL category. */
export const PSMF_PROTEIN_G_PER_LB_LEAN_BY_CATEGORY: Record<PsmfCategory, number> = {
  1: 1.5, // lean — men ≤15%, women ≤24%
  2: 1.25, // moderate — men 16–25%, women 25–34%
  3: 0.85, // higher body fat — men ≥26%, women ≥35%
};

function getValidBodyFatPercent(bodyFatPercent?: number): number | undefined {
  if (!Number.isFinite(bodyFatPercent)) return undefined;
  if (
    bodyFatPercent == null ||
    bodyFatPercent < MIN_PLAUSIBLE_BODY_FAT_PERCENT ||
    bodyFatPercent > MAX_PLAUSIBLE_BODY_FAT_PERCENT
  ) {
    return undefined;
  }
  return bodyFatPercent;
}

function getSafeWeightLb(weightLb: number): number {
  return Number.isFinite(weightLb) && weightLb > 0 ? weightLb : 1;
}

/** McDonald RFLH category from sex + body fat (%). Returns null when body fat is unknown. */
export function getPsmfCategory(
  profile: Pick<UserProfile, 'sex' | 'bodyFatPercent'>
): PsmfCategory | null {
  const bf = getValidBodyFatPercent(profile.bodyFatPercent);
  if (bf == null) return null;
  if (profile.sex === 'male') {
    if (bf <= 15) return 1;
    if (bf <= 25) return 2;
    return 3;
  }
  if (bf <= 24) return 1;
  if (bf <= 34) return 2;
  return 3;
}

/**
 * PSMF protein target (g/day). Calories are derived from this + fixed fat/carbs — never inflated
 * to hit a TDEE-based calorie floor (McDonald RFLH).
 */
export function calculatePsmfProteinGrams(
  profile: Pick<UserProfile, 'sex' | 'weightLb' | 'bodyFatPercent'>
): number {
  const weightLb = getSafeWeightLb(profile.weightLb);
  const validBf = getValidBodyFatPercent(profile.bodyFatPercent);

  if (validBf == null) {
    return Math.round(weightLb * PSMF_PROTEIN_G_PER_LB_BW_FLOOR);
  }

  const leanLb = weightLb * (1 - validBf / 100);
  const category = getPsmfCategory({ sex: profile.sex, bodyFatPercent: validBf });
  const rate = category != null ? PSMF_PROTEIN_G_PER_LB_LEAN_BY_CATEGORY[category] : PSMF_PROTEIN_G_PER_LB_LEAN;
  let protein = Math.round(leanLb * rate);
  protein = Math.max(protein, Math.round(weightLb * PSMF_PROTEIN_G_PER_LB_BW_FLOOR));
  protein = Math.min(protein, Math.round(leanLb * PSMF_PROTEIN_G_PER_LB_LEAN_MAX));
  return protein;
}

export function getPsmfProteinRuleLabel(
  profile: Pick<UserProfile, 'sex' | 'bodyFatPercent'>
): string {
  const category = getPsmfCategory(profile);
  if (category == null) {
    return `PSMF: ${PSMF_PROTEIN_G_PER_LB_BW_FLOOR} g/lb body weight (add body fat % for lean-mass estimate)`;
  }
  const rate = PSMF_PROTEIN_G_PER_LB_LEAN_BY_CATEGORY[category];
  return `PSMF category ${category}: ${rate} g/lb lean mass (min ${PSMF_PROTEIN_G_PER_LB_BW_FLOOR} g/lb body weight, max ${PSMF_PROTEIN_G_PER_LB_LEAN_MAX} g/lb lean)`;
}

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
