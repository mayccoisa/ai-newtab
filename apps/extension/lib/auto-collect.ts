/**
 * Auto-collect policy, evaluated by the worker's alarm heartbeat: once the last
 * collection is older than the chosen interval, collect again so Claude has
 * fresh material the next time you ask for an update.
 *
 * Collecting is free (no API), but it briefly opens a background window, so the
 * policy stays conservative.
 */

/** Interval choices offered in Settings, in hours. */
export const COLLECT_INTERVAL_CHOICES = [6, 12, 24, 48] as const;

export const DEFAULT_COLLECT_INTERVAL_HOURS = 12;

/** A stored/user value as ms, falling back to the default when unset or invalid. */
export function collectIntervalMs(hours?: number | null): number {
  const h = typeof hours === "number" && hours > 0 ? hours : DEFAULT_COLLECT_INTERVAL_HOURS;
  return h * 60 * 60 * 1000;
}

export interface AutoCollectInput {
  enabled: boolean;
  isRunning: boolean;
  /** ISO timestamp of the last collection the bridge received, if any. */
  lastCollectAt?: string | null;
  /** ISO timestamp of the last auto-collect attempt, if any. */
  lastAutoAttemptAt?: string | null;
  intervalMs: number;
  now: Date;
}

/**
 * - Never fires before the first manual collection, so no window opens before
 *   the user has engaged.
 * - Does not retry a failed auto-collect until another full interval has passed.
 */
export function shouldAutoCollect(input: AutoCollectInput): boolean {
  const { enabled, isRunning, lastCollectAt, lastAutoAttemptAt, intervalMs, now } = input;
  if (!enabled || isRunning || !lastCollectAt) return false;
  const age = (iso: string) => now.getTime() - new Date(iso).getTime();
  if (age(lastCollectAt) < intervalMs) return false;
  if (lastAutoAttemptAt && age(lastAutoAttemptAt) < intervalMs) return false;
  return true;
}
