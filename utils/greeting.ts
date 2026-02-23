export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type ProgressLevel = 'none' | 'started' | 'halfway' | 'almost' | 'done';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function getGreeting(firstName?: string | null): string {
  const name = firstName?.trim();
  const tod = getTimeOfDay();
  const prefix =
    tod === 'morning'
      ? 'Good morning'
      : tod === 'afternoon'
        ? 'Good afternoon'
        : 'Good evening';
  return name ? `${prefix}, ${name}!` : 'Welcome to Physiq!';
}

export function getProgressLevel(consumed: number, target: number): ProgressLevel {
  if (target <= 0 || consumed <= 0) return 'none';
  const pct = consumed / target;
  if (pct >= 1) return 'done';
  if (pct >= 0.75) return 'almost';
  if (pct >= 0.4) return 'halfway';
  return 'started';
}

const HOOKS: Record<ProgressLevel, string[]> = {
  none: [
    'Ready when you are.',
    'Start strong today.',
    'New day, new gains.',
    'Time to fuel up.',
    'Let\'s build today.',
    'Your move.',
    'First meal awaits.',
  ],
  started: [
    'Off to a good start.',
    'Momentum building.',
    'Keep it going.',
    'Solid start today.',
    'Building your day.',
    'Nice start — keep tracking.',
    'Good foundation today.',
  ],
  halfway: [
    'Halfway there — keep going.',
    'Stay on track.',
    'Strong progress today.',
    'Keep the momentum.',
    'Smart choices compound.',
    'Dialed in today.',
    'Consistency wins.',
  ],
  almost: [
    'Almost there.',
    'Finish strong.',
    'Home stretch.',
    'Lock in your numbers.',
    'Strong finishes start now.',
    'Nearly dialed in.',
    'Close it out.',
  ],
  done: [
    'Target hit — well done.',
    'Nailed it today.',
    'Goals met.',
    'Solid effort today.',
    'Recovery starts now.',
    'Great day for progress.',
    'Tomorrow is built tonight.',
  ],
};

export function getMotivationHook(progress?: ProgressLevel): string {
  const level = progress ?? 'none';
  const pool = HOOKS[level];
  const dayIndex = Math.floor(Date.now() / 86_400_000) % pool.length;
  return pool[dayIndex];
}
