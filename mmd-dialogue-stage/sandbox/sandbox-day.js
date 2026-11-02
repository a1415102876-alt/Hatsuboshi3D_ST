import { buildDailyJournal, buildDayMemoryPrompt, sanitizeDayMemory } from './sandbox-journal.js?v=20261027-midnight-v1';
import { normalizeSandboxState } from './sandbox-core.js?v=20261028-story-guide-v1';

export { buildDayMemoryPrompt, sanitizeDayMemory };

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

/**
 * Settle the current day into a compact journal and start the next day.
 * The current timeline is cleared only after it has been copied into history.
 */
export function settleSandboxDay(state, options = {}) {
  const normalized = normalizeSandboxState(state);
  const journal = buildDailyJournal(normalized, normalized.day);
  const history = Array.isArray(normalized.history) ? clone(normalized.history) : [];
  history.push(journal);
  const recovery = {
    stamina: clamp(options.staminaRecovery ?? 20, 0, 100),
    stress: -clamp(options.stressRecovery ?? 10, 0, 100),
  };
  const grid = normalized.time.gridMinutes || 15;
  const extra = Math.max(0, Math.round(clamp(options.extraMinutes, 0, 24 * 60) / grid) * grid);
  const morning = extra > 0
    ? Math.min(normalized.time.endMinutes - grid, extra)
    : normalized.time.startMinutes;
  const next = {
    ...normalized,
    day: normalized.day + 1,
    time: { ...normalized.time, clockMinutes: morning },
    dailyTimeline: [],
    history,
    stats: {
      ...normalized.stats,
      stamina: clamp(normalized.stats.stamina + recovery.stamina, 0, 100),
      stress: clamp(normalized.stats.stress + recovery.stress, 0, 100),
    },
    flags: { ...normalized.flags, lastSettledDay: normalized.day },
  };
  return { ok: true, state: next, journal, recovery };
}

export function getLatestJournal(state) {
  const history = Array.isArray(state?.history) ? state.history : [];
  return history.length ? history[history.length - 1] : null;
}

export function formatJournalSummary(journal) {
  if (!journal) return '还没有完成过一天。';
  if (journal.line) return journal.line;
  const actions = Array.isArray(journal.actions) ? journal.actions : [];
  if (!actions.length) return `第 ${journal.day} 日没有安排行动。`;
  return `第 ${journal.day} 日完成 ${actions.length} 段行动，共 ${journal.totalDuration || 0} 分钟。`;
}
