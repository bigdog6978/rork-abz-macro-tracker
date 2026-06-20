import { GoalScore, ProgressTrend } from '../../features/progress/types';
import { GoalTarget } from '../../features/progress/goalTargetTypes';
import { formatTargetSummary } from '../../features/progress/progressScoring';
import type { ShareTemplateId } from './shareConstants';
import type { PhotoStatChip } from './shareMetrics';

export const PHYSIQMACROS_FB_GROUP_URL = 'https://www.facebook.com/groups/physiqmacros';

export interface ShareCaptionInput {
  firstName?: string;
  goalScore: GoalScore;
  trends: ProgressTrend[];
  targetScore?: number | null;
  targetStatusText?: string | null;
  target?: GoalTarget | null;
  streak?: number;
  daysTracked?: number;
  template?: ShareTemplateId;
  dailyMacros?: {
    caloriesConsumed: number;
    caloriesTarget: number;
  };
  photoStatChips?: PhotoStatChip[];
}

export function buildShareHeadline(input: ShareCaptionInput): string {
  if (input.template === 'daily_macros' && input.dailyMacros) {
    const { caloriesConsumed, caloriesTarget } = input.dailyMacros;
    const hit = caloriesTarget > 0 && caloriesConsumed >= caloriesTarget * 0.95;
    const name = input.firstName?.trim();
    if (hit) return name ? `${name} hit today's macro targets` : "Hit today's macro targets";
    return name ? `${name}'s macros today` : 'My macros today';
  }

  if (input.template === 'progress_photo' && input.photoStatChips?.length) {
    const top = input.photoStatChips[0];
    const name = input.firstName?.trim();
    const prefix = name ? `${name}'s progress` : 'My progress';
    return `${prefix} — ${top.label} ${top.value}`;
  }

  const name = input.firstName?.trim();
  const prefix = name ? `${name}'s progress` : 'My progress';
  if (input.targetStatusText && input.targetStatusText !== 'On track') {
    return `${prefix} — ${input.targetStatusText}`;
  }
  const weightTrend = input.trends.find((t) => t.field === 'weight');
  if (weightTrend) {
    return `${prefix} — ${weightTrend.displayValue} since baseline`;
  }
  return `${prefix} — Physiq Score ${input.goalScore.overall}/100`;
}

export function buildShareCaption(input: ShareCaptionInput): string {
  const template = input.template ?? 'body_progress';
  const lines: string[] = [buildShareHeadline({ ...input, template }), ''];

  if (template === 'daily_macros' && input.dailyMacros) {
    const { caloriesConsumed, caloriesTarget } = input.dailyMacros;
    lines.push(`Calories: ${Math.round(caloriesConsumed)} / ${Math.round(caloriesTarget)}`);
    if (input.streak && input.streak > 1) {
      lines.push(`Logging streak: ${input.streak} days`);
    }
    lines.push('', '#PhysiqMacros #MacroTracking #FitnessJourney');
    return lines.join('\n');
  }

  if (template === 'progress_photo' && input.photoStatChips?.length) {
    lines.push('Progress since baseline:');
    input.photoStatChips.forEach((c) => lines.push(`• ${c.label}: ${c.value}`));
    lines.push('', '#PhysiqMacros #FitnessJourney #Progress');
    return lines.join('\n');
  }

  if (input.target) {
    lines.push(`Goal: ${formatTargetSummary(input.target)}`);
  }

  const metrics = input.trends.slice(0, 3);
  if (metrics.length > 0) {
    lines.push('Changes since baseline:');
    metrics.forEach((t) => lines.push(`• ${t.label}: ${t.displayValue}`));
  }

  lines.push('', `Physiq Score: ${input.goalScore.overall}/100`);

  if (input.streak && input.streak > 1) {
    lines.push(`Logging streak: ${input.streak} days`);
  }

  lines.push('', '#PhysiqMacros #MacroTracking #FitnessJourney');
  return lines.join('\n');
}
