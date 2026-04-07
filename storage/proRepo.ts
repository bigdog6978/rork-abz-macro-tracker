import { loadData, removeData, saveData, STORAGE_KEYS } from '../services/storage';
import {
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';

const DEFAULT_PRO_SETTINGS: ProSettings = {
  dynamicMacrosEnabled: true,
  hydrationEnabled: true,
  healthIntegrationEnabled: false,
  electrolyteNudgesEnabled: false,
  healthPermissionStatus: 'not_connected',
};

export async function getProEntitlement(): Promise<ProEntitlementState> {
  return (await loadData<ProEntitlementState>(STORAGE_KEYS.PRO_ENTITLEMENT)) ?? 'core_active';
}

export async function setProEntitlement(state: ProEntitlementState): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_ENTITLEMENT, state);
}

export async function getProSettings(): Promise<ProSettings> {
  return (await loadData<ProSettings>(STORAGE_KEYS.PRO_SETTINGS)) ?? DEFAULT_PRO_SETTINGS;
}

export async function saveProSettings(settings: ProSettings): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_SETTINGS, settings);
}

export async function getLatestProHealthSignals(): Promise<ProHealthSignals | null> {
  return loadData<ProHealthSignals>(STORAGE_KEYS.PRO_HEALTH_SIGNALS);
}

export async function saveLatestProHealthSignals(signals: ProHealthSignals): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_HEALTH_SIGNALS, signals);
}

export async function getProHydrationLog(): Promise<ProHydrationLog | null> {
  return loadData<ProHydrationLog>(STORAGE_KEYS.PRO_HYDRATION_LOG);
}

export async function saveProHydrationLog(log: ProHydrationLog): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_HYDRATION_LOG, log);
}

export async function getProDynamicTargets() {
  return loadData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS);
}

export async function saveProDynamicTargets(targets: unknown): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS, targets);
}

export async function clearProDynamicTargets(): Promise<void> {
  await removeData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS);
}

