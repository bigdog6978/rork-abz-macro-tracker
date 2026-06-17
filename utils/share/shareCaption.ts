import { GoalScore, ProgressTrend } from '../../features/progress/types';
import { GoalTarget } from '../../features/progress/goalTargetTypes';
import { formatTargetSummary } from '../../features/progress/progressScoring';

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
}

export function buildShareHeadline(input: ShareCaptionInput): string {
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
  const lines: string[] = [buildShareHeadline(input), ''];

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
