import { requireOptionalNativeModule } from 'expo';

type PhysiqWatchNative = {
  isWatchSupported: boolean;
  activationState: string;
  sendProSnapshot: (payload: Record<string, string>) => Promise<void>;
  addListener: (
    event: 'onWatchPayload' | 'onActivationChange',
    cb: (body: Record<string, unknown>) => void
  ) => { remove: () => void };
};

const Native = requireOptionalNativeModule<PhysiqWatchNative>('PhysiqWatch');

export function getPhysiqWatchNative(): PhysiqWatchNative | null {
  return Native;
}

export async function sendProSnapshotToWatch(payload: Record<string, string>): Promise<void> {
  if (!Native?.sendProSnapshot) return;
  await Native.sendProSnapshot(payload);
}

export function subscribePhysiqWatch(
  event: 'onWatchPayload' | 'onActivationChange',
  handler: (body: Record<string, unknown>) => void
): { remove: () => void } | undefined {
  if (!Native?.addListener) return undefined;
  return Native.addListener(event, handler);
}
