import { parseMealVoiceTranscript } from './mealVoiceParser';
import * as foodService from './foodService';
import {
  resolveVoiceItems,
  type ResolutionConfidence,
  type VoiceResolvedItem,
} from './voiceResolver';
import type { FoodEntry } from '../../types';

export interface ProcessVoiceMealResult {
  ok: boolean;
  addedCount: number;
  skippedCount: number;
  summary: string;
}

const WATCH_AUTO_CONFIDENCE = new Set<ResolutionConfidence>(['high', 'medium']);

/**
 * Resolve a spoken meal and build log entries for watch-initiated voice logging.
 * High/medium confidence matches are auto-added; low/unresolved items are skipped
 * so the user can review them on iPhone.
 */
export async function processVoiceMealTranscript(
  transcript: string
): Promise<{ result: ProcessVoiceMealResult; entries: FoodEntry[]; resolvedItems: VoiceResolvedItem[] }> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      result: {
        ok: false,
        addedCount: 0,
        skippedCount: 0,
        summary: 'Nothing heard. Try again.',
      },
      entries: [],
      resolvedItems: [],
    };
  }

  const parsedItems = parseMealVoiceTranscript(trimmed);
  if (parsedItems.length === 0) {
    return {
      result: {
        ok: false,
        addedCount: 0,
        skippedCount: 0,
        summary: 'No meal detected. Say items like "2 eggs and toast".',
      },
      entries: [],
      resolvedItems: [],
    };
  }

  const results = await resolveVoiceItems(parsedItems);
  const toAdd: VoiceResolvedItem[] = [];
  let skipped = 0;

  for (const result of results) {
    if (result.status === 'resolved' && WATCH_AUTO_CONFIDENCE.has(result.item.confidence)) {
      toAdd.push(result.item);
    } else {
      skipped += 1;
    }
  }

  if (toAdd.length === 0) {
    return {
      result: {
        ok: false,
        addedCount: 0,
        skippedCount: skipped,
        summary:
          skipped > 0
            ? 'No confident matches. Open iPhone to review or try again.'
            : 'No foods matched. Try speaking more clearly.',
      },
      entries: [],
      resolvedItems: [],
    };
  }

  const entries = toAdd.map((item) =>
    foodService.createFoodEntry(
      item.food,
      item.displayName,
      item.grams,
      item.macros,
      false,
      item.entryOpts
    )
  );

  const names = toAdd.map((item) => item.displayName).slice(0, 2);
  const namePart = names.join(', ');
  const extra = toAdd.length > 2 ? ` +${toAdd.length - 2} more` : '';
  const skipPart = skipped > 0 ? ` (${skipped} need iPhone review)` : '';

  return {
    result: {
      ok: true,
      addedCount: toAdd.length,
      skippedCount: skipped,
      summary: `Added ${toAdd.length}: ${namePart}${extra}${skipPart}`,
    },
    entries,
    resolvedItems: toAdd,
  };
}
