import { useMemo } from 'react';
import type { MacroTargets } from '../types';
import { useUser } from '../providers/UserProvider';
import { usePro } from '../providers/ProProvider';

export type DashboardTargetSource = 'base' | 'dynamic';

/**
 * Single source of truth for calorie/macro targets shown on the home dashboard
 * and pushed to watchOS via PhysiqWatchSync.
 */
export function useDashboardTargets(): {
  targets: MacroTargets;
  source: DashboardTargetSource;
} {
  const { macros } = useUser();
  const { settings, dynamicTargets } = usePro();

  return useMemo(() => {
    if (settings.dynamicMacrosEnabled) {
      return { targets: dynamicTargets, source: 'dynamic' as const };
    }
    return { targets: macros, source: 'base' as const };
  }, [settings.dynamicMacrosEnabled, dynamicTargets, macros]);
}
