export type Phase = "work" | "break";
export type TimerStatus = "ready" | "running" | "paused" | "awaitingWork";
export type Theme = "light" | "dark" | "system";

export interface Preferences {
  workMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  volume: number;
  reducedMotion: boolean;
  theme: Theme;
}

export interface TimerState {
  phase: Phase;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  workMinutes: 50,
  breakMinutes: 10,
  soundEnabled: true,
  volume: 60,
  reducedMotion: false,
  theme: "system",
};

export const initialTimer = (phase: Phase = "work"): TimerState => ({
  phase,
  status: phase === "work" ? "ready" : "paused",
  durationSeconds: phase === "work" ? 3000 : 600,
  remainingSeconds: phase === "work" ? 3000 : 600,
  endsAt: null,
});

export function durationFor(phase: Phase, preferences: Preferences) {
  return (phase === "work" ? preferences.workMinutes : preferences.breakMinutes) * 60;
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.status === "running") return timer;
  const duration = timer.status === "ready" ? timer.durationSeconds : timer.remainingSeconds;
  return { ...timer, status: "running", remainingSeconds: duration, endsAt: now + duration * 1000 };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "running") return timer;
  return {
    ...timer,
    status: "paused",
    remainingSeconds: Math.max(0, Math.ceil(((timer.endsAt ?? now) - now) / 1000)),
    endsAt: null,
  };
}

export function resetTimer(timer: TimerState, preferences: Preferences): TimerState {
  const duration = durationFor(timer.phase, preferences);
  return { ...timer, status: timer.phase === "work" ? "ready" : "paused", durationSeconds: duration, remainingSeconds: duration, endsAt: null };
}

export function tickTimer(timer: TimerState, now: number, configuredBreakMinutes?: number): TimerState {
  if (timer.status !== "running" || timer.endsAt === null) return timer;
  if (timer.phase === "break") {
    return now < timer.endsAt
      ? { ...timer, remainingSeconds: Math.ceil((timer.endsAt - now) / 1000) }
      : { ...timer, status: "awaitingWork", remainingSeconds: 0, endsAt: null };
  }
  if (now < timer.endsAt) {
    const remainingSeconds = Math.ceil((timer.endsAt - now) / 1000);
    return remainingSeconds === timer.remainingSeconds ? timer : { ...timer, remainingSeconds };
  }
  const breakDuration = (configuredBreakMinutes ?? readPreferences().breakMinutes) * 60;
  const breakEndsAt = timer.endsAt + breakDuration * 1000;
  if (now < breakEndsAt) return { phase: "break", status: "running", durationSeconds: breakDuration, remainingSeconds: Math.ceil((breakEndsAt - now) / 1000), endsAt: breakEndsAt };
  return { phase: "break", status: "awaitingWork", durationSeconds: breakDuration, remainingSeconds: 0, endsAt: null };
}

export function advanceCompletedPhase(timer: TimerState, preferences: Preferences, now: number): TimerState {
  if (timer.phase !== "break") return timer;
  const duration = durationFor("work", preferences);
  return { phase: "work", status: "running", durationSeconds: duration, remainingSeconds: duration, endsAt: now + duration * 1000 };
}

export function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, "0")}:${(safeSeconds % 60).toString().padStart(2, "0")}`;
}

export function validDuration(value: number, phase: Phase) {
  return Number.isInteger(value) && value >= 1 && value <= (phase === "work" ? 180 : 60);
}

export function readPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem("moyu.preferences.v1") ?? "null") as Partial<Preferences> | null;
    if (!stored) return DEFAULT_PREFERENCES;
    return {
      workMinutes: validDuration(stored.workMinutes ?? 0, "work") ? stored.workMinutes! : 50,
      breakMinutes: validDuration(stored.breakMinutes ?? 0, "break") ? stored.breakMinutes! : 10,
      soundEnabled: typeof stored.soundEnabled === "boolean" ? stored.soundEnabled : true,
      volume: typeof stored.volume === "number" && stored.volume >= 0 && stored.volume <= 100 ? stored.volume : 60,
      reducedMotion: typeof stored.reducedMotion === "boolean" ? stored.reducedMotion : false,
      theme: ["light", "dark", "system"].includes(stored.theme ?? "") ? stored.theme! : "system",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function readTimer(preferences: Preferences): TimerState {
  try {
    const timer = JSON.parse(localStorage.getItem("moyu.timer.v1") ?? "null") as TimerState | null;
    if (!timer || !["work", "break"].includes(timer.phase) || !["ready", "running", "paused", "awaitingWork"].includes(timer.status)) return initialTimer();
    if (!Number.isFinite(timer.remainingSeconds) || !Number.isFinite(timer.durationSeconds) || timer.durationSeconds <= 0 || timer.remainingSeconds < 0 || timer.remainingSeconds > timer.durationSeconds) return initialTimer();
    if (timer.status === "running") {
      if (timer.endsAt === null || !Number.isFinite(timer.endsAt)) return initialTimer();
      return tickTimer(timer, Date.now(), preferences.breakMinutes);
    }
    return { ...timer, endsAt: null, remainingSeconds: Math.min(Math.max(0, timer.remainingSeconds), timer.durationSeconds) };
  } catch {
    return initialTimer();
  }
}
