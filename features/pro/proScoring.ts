interface PhysiqScoreInput {
  nutritionAdherence: number;
  activityAlignment: number;
  hydrationAdherence: number;
  consistency: number;
}

export function computePhysiqScore(input: PhysiqScoreInput): number {
  const weighted =
    input.nutritionAdherence * 0.4 +
    input.activityAlignment * 0.25 +
    input.hydrationAdherence * 0.2 +
    input.consistency * 0.15;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

