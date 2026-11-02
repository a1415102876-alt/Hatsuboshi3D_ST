import {
  getSandboxAction,
  SANDBOX_ACTIONS,
  SANDBOX_DAILY_GROWTH_LIMIT,
  SANDBOX_TIME,
} from './sandbox-actions.js';
import { normalizeIdolOrder } from './sandbox-orders.js';
import { normalizeContactRequests, normalizeSceneCast } from './sandbox-cast.js';
import { emptyStoryGuide, normalizeStoryGuide, normalizeStoryLog } from './sandbox-story-guide.js?v=20261028-story-guide-v1';
import { emptyDailyEvent, normalizeDailyEvent, normalizeEventArchive } from './sandbox-event.js?v=20261028-daily-event-v4';
import { emptyCommissionBoard, normalizeCommissionBoard } from './sandbox-commissions.js?v=20261029-commission-v1';

const DEFAULT_IDOL = '藤田琴音';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeDayMemories(raw) {
  if (!Array.isArray(raw)) return [];
  const memories = [];
  for (const item of raw) {
    const day = Math.max(1, Math.round(Number(item?.day) || 0));
    const text = String(item?.text || '').replace(/\s+/g, ' ').trim().slice(0, 800);
    if (!day || !text) continue;
    const index = memories.findIndex((memory) => memory.day === day);
    if (index >= 0) memories.splice(index, 1);
    memories.push({ day, text });
  }
  return memories;
}

function normalizeChatHistory(raw, day = 1) {
  if (!Array.isArray(raw)) return [];
  const currentDay = Math.max(1, Math.round(clampNumber(day, 1, 1, 9999)));
  const turns = raw
    .filter((turn) => turn && typeof turn === 'object')
    .map((turn) => ({
      day: Math.max(1, Math.round(clampNumber(turn.day, currentDay, 1, 9999))),
      idolId: String(turn.idolId || ''),
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      text: String(turn.text || '').slice(0, 240),
      content: String(turn.content || '').slice(0, 8000),
      label: String(turn.label || ''),
    }))
    .filter((turn) => turn.idolId && (turn.text || turn.content));
  const today = turns.filter((turn) => turn.day === currentDay);
  const earlier = turns.filter((turn) => turn.day !== currentDay).slice(-80);
  return [...earlier, ...today];
}

function normalizeTimeline(rawTimeline, day) {
  if (!Array.isArray(rawTimeline)) return [];
  return rawTimeline
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      day: Math.max(1, Math.round(clampNumber(entry.day, day, 1, 9999))),
      start: Math.round(clampNumber(entry.start, 0, 0, SANDBOX_TIME.endMinutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes,
      duration: Math.max(SANDBOX_TIME.gridMinutes, Math.round(clampNumber(entry.duration, SANDBOX_TIME.gridMinutes, SANDBOX_TIME.gridMinutes, SANDBOX_TIME.endMinutes - SANDBOX_TIME.startMinutes))),
      end: Math.round(clampNumber(entry.end, 0, 0, SANDBOX_TIME.endMinutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes,
      kind: String(entry.kind || ''),
      label: String(entry.label || ''),
      idolId: String(entry.idolId || ''),
      locationId: String(entry.locationId || ''),
      commissionId: String(entry.commissionId || ''),
      costs: { ...(entry.costs || {}) },
      rewards: { ...(entry.rewards || {}) },
    }));
}

export function createSandboxState(options = {}) {
  const day = Math.max(1, Math.round(clampNumber(options.day, 1, 1, 9999)));
  return {
    schemaVersion: 1,
    day,
    idolId: String(options.idolId || DEFAULT_IDOL),
    time: {
      ...SANDBOX_TIME,
      clockMinutes: SANDBOX_TIME.startMinutes,
    },
    dailyGrowthLimit: SANDBOX_DAILY_GROWTH_LIMIT,
    dailyTimeline: [],
    history: [],
    currentLocationId: 'home_classroom',
    currentBackground: '3d-adv-classroom-00-00-noon',
    wallet: { coins: 0, fame: 0 },
    stats: {
      stamina: 80,
      stress: 0,
      trust: 0,
      Vo: 0,
      Da: 0,
      Vi: 0,
    },
    questState: {},
    flags: {},
    chatHistory: [],
    dayMemories: [],
    storyGuide: emptyStoryGuide(day),
    storyLog: [],
    dailyEvent: emptyDailyEvent(day),
    eventArchive: [],
    idolOrder: { mode: 'follow', locationId: '' },
    sceneCast: {},
    contactRequests: [],
    suggestedActions: [],
    commissions: emptyCommissionBoard(day),
  };
}

export function normalizeSandboxState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fallback = createSandboxState({ idolId: source.idolId });
  const day = Math.max(1, Math.round(clampNumber(source.day, fallback.day, 1, 9999)));
  const sourceTime = source.time && typeof source.time === 'object' ? source.time : {};
  const startMinutes = SANDBOX_TIME.startMinutes;
  const endMinutes = SANDBOX_TIME.endMinutes;
  const clockMinutes = Math.round(clampNumber(sourceTime.clockMinutes, startMinutes, 0, endMinutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes;
  const stats = source.stats && typeof source.stats === 'object' ? source.stats : {};
  const wallet = source.wallet && typeof source.wallet === 'object' ? source.wallet : {};
  return {
    ...fallback,
    ...clone(source),
    schemaVersion: 1,
    day,
    idolId: String(source.idolId || fallback.idolId),
    time: {
      startMinutes,
      endMinutes,
      gridMinutes: SANDBOX_TIME.gridMinutes,
      clockMinutes,
    },
    dailyGrowthLimit: SANDBOX_DAILY_GROWTH_LIMIT,
    dailyTimeline: normalizeTimeline(source.dailyTimeline, day),
    history: Array.isArray(source.history) ? clone(source.history).slice(-30) : [],
    currentLocationId: String(source.currentLocationId || 'home_classroom'),
    currentBackground: String(source.currentBackground || '3d-adv-classroom-00-00-noon'),
    wallet: {
      coins: Math.max(0, Math.round(clampNumber(wallet.coins, 0, 0, 999999))),
      fame: Math.max(0, Math.round(clampNumber(wallet.fame, 0, 0, 999999))),
    },
    stats: {
      stamina: Math.round(clampNumber(stats.stamina, 80, 0, 100)),
      stress: Math.round(clampNumber(stats.stress, 0, 0, 100)),
      trust: Math.round(clampNumber(stats.trust, 0, 0, 100)),
      Vo: Math.max(0, Math.round(clampNumber(stats.Vo, 0, 0, 99999))),
      Da: Math.max(0, Math.round(clampNumber(stats.Da, 0, 0, 99999))),
      Vi: Math.max(0, Math.round(clampNumber(stats.Vi, 0, 0, 99999))),
    },
    questState: source.questState && typeof source.questState === 'object' ? clone(source.questState) : {},
    flags: source.flags && typeof source.flags === 'object' ? clone(source.flags) : {},
    chatHistory: normalizeChatHistory(source.chatHistory, day),
    dayMemories: normalizeDayMemories(source.dayMemories),
    storyGuide: normalizeStoryGuide(source.storyGuide, day),
    storyLog: normalizeStoryLog(source.storyLog),
    dailyEvent: normalizeDailyEvent(source.dailyEvent, day),
    eventArchive: normalizeEventArchive(source.eventArchive),
    idolOrder: normalizeIdolOrder(source.idolOrder),
    sceneCast: normalizeSceneCast(source.sceneCast, { day, minutes: clockMinutes }),
    contactRequests: normalizeContactRequests(source.contactRequests, { day, minutes: clockMinutes }),
    suggestedActions: normalizeSuggestedActions(source.suggestedActions),
    commissions: normalizeCommissionBoard(source.commissions, day, wallet.fame),
  };
}

export function getActionDefinition(kind) {
  return getSandboxAction(kind);
}

export function getDailyGrowthCount(state) {
  const normalized = normalizeSandboxState(state);
  return normalized.dailyTimeline.filter((entry) => {
    const definition = SANDBOX_ACTIONS[entry.kind];
    return entry.day === normalized.day && Boolean(definition?.growth);
  }).length;
}

function resolveDuration(definition, action) {
  if (action.duration === undefined) return definition.duration;
  const duration = Number(action.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (duration !== definition.duration) return null;
  return duration;
}

function normalizeSuggestedActions(raw) {
  if (!Array.isArray(raw)) return [];
  const options = raw.map((item) => String(item || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean);
  return options.length === 4 ? options : [];
}

function numericRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value).filter(([, item]) => Number.isFinite(Number(item)));
  if (!entries.length) return null;
  return Object.fromEntries(entries.map(([key, item]) => [key, Number(item)]));
}

export function validateAction(state, action = {}) {
  const normalized = normalizeSandboxState(state);
  const kind = String(action.kind || '').trim();
  const definition = getActionDefinition(kind);
  if (!definition) return { ok: false, reason: 'unknown_action', state: normalized };
  const duration = resolveDuration(definition, action);
  if (!duration || duration % SANDBOX_TIME.gridMinutes !== 0) {
    return { ok: false, reason: 'invalid_duration', state: normalized };
  }
  if (definition.growth && getDailyGrowthCount(normalized) >= normalized.dailyGrowthLimit) {
    return { ok: false, reason: 'daily_growth_limit', state: normalized };
  }
  if (normalized.time.clockMinutes + duration > normalized.time.endMinutes) {
    return { ok: false, reason: 'day_end_exceeded', state: normalized };
  }
  return {
    ok: true,
    state: normalized,
    action: {
      ...definition,
      ...clone(action),
      kind,
      duration,
      costs: numericRecord(action.costs) || { ...definition.costs },
      rewards: numericRecord(action.rewards) || { ...definition.rewards },
    },
  };
}

function applyDeltas(state, fieldGroup, deltas) {
  Object.entries(deltas || {}).forEach(([key, delta]) => {
    if (!Number.isFinite(Number(delta))) return;
    const current = Number(state[fieldGroup]?.[key]) || 0;
    const max = key === 'stamina' || key === 'stress' ? 100 : 999999;
    state[fieldGroup][key] = Math.max(0, Math.min(max, current + Number(delta)));
  });
}

export const STORY_TIME_STEPS = Object.freeze([0, 15, 30, 45, 60, 90, 120, 180]);

const TIME_MARK_RE = /【初星时间标记】\s*(\d{1,4})|<time_mark\s+minutes=["'](\d{1,4})["']\s*\/?>/i;

export function snapStoryMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (!value) return 0;
  const steps = STORY_TIME_STEPS.filter((step) => step > 0);
  let best = steps[0];
  let bestDistance = Infinity;
  for (const step of steps) {
    const distance = Math.abs(step - value);
    if (distance < bestDistance || (distance === bestDistance && step > best)) {
      best = step;
      bestDistance = distance;
    }
  }
  return best;
}

export function parseTimeMark(source) {
  const match = String(source || '').match(TIME_MARK_RE);
  if (!match) return null;
  return snapStoryMinutes(match[1] ?? match[2]);
}

export function storyTimeHint() {
  return '这段剧情写完后，在全部 beat 之后另起一行只写一次【初星时间标记】分钟数，表示这段戏里过去了多久。只能写 0、15、30、45、60、90、120、180 之一。一句应答写 0，短暂闲聊写 15 或 30，走动、吃饭或排练写 60 到 120。不要把标记写进台词、display 或 tts。';
}

export function splitClockAdvance(clockMinutes, minutes, dayMinutes = SANDBOX_TIME.endMinutes) {
  const clock = Math.max(0, Math.round(Number(clockMinutes) || 0));
  const amount = Math.max(0, Math.round(Number(minutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes);
  if (!amount) return { today: 0, overflow: 0, rolled: false };
  if (clock + amount < dayMinutes) return { today: amount, overflow: 0, rolled: false };
  return {
    today: Math.max(0, dayMinutes - clock),
    overflow: clock + amount - dayMinutes,
    rolled: true,
  };
}

export function parseSandboxAdvance(raw, clockMinutes, endMinutes = SANDBOX_TIME.endMinutes) {
  const now = Math.max(0, Math.round(Number(clockMinutes) || 0));
  const end = Math.max(now, Math.round(Number(endMinutes) || SANDBOX_TIME.endMinutes));
  const text = String(raw || '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  const hourText = text.match(/(\d{1,2})\s*小时(?:\s*(\d{1,2})\s*分(?:钟)?)?/);
  const clockText = text.match(/(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/);
  if (/第二天|下一天|明天/.test(text)) {
    let morning = SANDBOX_TIME.startMinutes;
    if (clockText) {
      const parsed = parseClockTarget(clockText, text);
      if (!parsed.ok) return parsed;
      if (parsed.target < SANDBOX_TIME.startMinutes || parsed.target >= end) return { ok: false, reason: 'invalid' };
      morning = parsed.target;
    }
    const today = Math.max(0, end - now);
    return { ok: true, minutes: today + (morning - SANDBOX_TIME.startMinutes), rolls: true };
  }
  if (hourText && !clockText) return snapAdvanceMinutes(Number(hourText[1]) * 60 + Number(hourText[2] || 0), now, end);
  if (clockText && /[:：点时]/.test(text)) {
    const parsed = parseClockTarget(clockText, text);
    if (!parsed.ok) return parsed;
    if (parsed.target > end) return { ok: false, reason: 'after_end', end };
    if (parsed.target <= now) return { ok: false, reason: 'past' };
    return { ok: true, minutes: parsed.target - now, rolls: parsed.target >= end };
  }
  const amount = Number.parseInt(text.replace(/分钟|分|min/gi, ''), 10);
  if (!Number.isFinite(amount)) return { ok: false, reason: 'invalid' };
  return snapAdvanceMinutes(amount, now, end);
}

function parseClockTarget(clockText, text) {
  let hour = Number(clockText[1]);
  const minute = Number(clockText[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) {
    return { ok: false, reason: 'invalid' };
  }
  if (/下午|晚上|傍晚|夜里/.test(text) && hour < 12) hour += 12;
  if (/上午|早上|清晨/.test(text) && hour === 12) hour = 0;
  return { ok: true, target: Math.round((hour * 60 + minute) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes };
}

function snapAdvanceMinutes(minutes, now, end) {
  const raw = Number(minutes);
  if (!Number.isFinite(raw) || raw <= 0) return { ok: false, reason: 'invalid' };
  const snapped = Math.max(SANDBOX_TIME.gridMinutes, Math.round(raw / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes);
  const room = Math.max(0, end - now);
  const nextDayRoom = Math.max(0, end - SANDBOX_TIME.startMinutes - SANDBOX_TIME.gridMinutes);
  const limit = room + nextDayRoom;
  const amount = Math.min(snapped, limit);
  if (!amount) return { ok: false, reason: 'day_end', end };
  return { ok: true, minutes: amount, capped: amount < snapped, rolls: amount > room || now + amount >= end };
}

export function parseSandboxClockSet(raw, state) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  const now = Math.max(0, Math.round(Number(state?.time?.clockMinutes) || 0));
  const day = Math.max(1, Math.round(Number(state?.day) || 1));
  const dayLength = 24 * 60;
  const dayMatch = text.match(/第\s*(\d+)\s*[日天]/);
  const clockText = text.match(/(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/);
  const hourText = text.match(/(\d{1,2})\s*小时(?:\s*(\d{1,2})\s*分(?:钟)?)?/);
  const minuteText = text.match(/(\d+)\s*分(?:钟)?/);
  const backward = /倒退|后退|往回|回拨/.test(text) || /^\s*-/.test(text);
  const forward = /前进|往后/.test(text) || /^\s*\+/.test(text);
  if ((backward || forward) && !dayMatch) {
    const minutes = hourText
      ? Number(hourText[1]) * 60 + Number(hourText[2] || 0)
      : Number(minuteText?.[1] || 0);
    const snapped = Math.round(Number(minutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes;
    if (!snapped) return { ok: false, reason: 'invalid' };
    return clockFromAbsolute((day - 1) * dayLength + now + (backward ? -snapped : snapped));
  }
  if (!clockText) return { ok: false, reason: 'invalid' };
  const parsed = parseClockTarget(clockText, text);
  if (!parsed.ok) return parsed;
  let nextDay = dayMatch ? Math.max(1, Number(dayMatch[1])) : day;
  if (!dayMatch && /昨天|前一天/.test(text)) nextDay = Math.max(1, day - 1);
  if (!dayMatch && /明天|第二天|下一天/.test(text)) nextDay = day + 1;
  let target = parsed.target;
  if (target >= dayLength) {
    target = 0;
    nextDay += 1;
  }
  return { ok: true, day: nextDay, clockMinutes: target };
}

function clockFromAbsolute(total) {
  const dayLength = 24 * 60;
  const safe = Math.max(0, total);
  return {
    ok: true,
    day: Math.floor(safe / dayLength) + 1,
    clockMinutes: safe % dayLength,
  };
}

export function setSandboxClock(state, { day, clockMinutes } = {}) {
  const normalized = normalizeSandboxState(state);
  const nextDay = Math.max(1, Math.round(Number(day) || normalized.day));
  const clock = Math.round(clampNumber(clockMinutes, 0, 0, 24 * 60 - SANDBOX_TIME.gridMinutes) / SANDBOX_TIME.gridMinutes) * SANDBOX_TIME.gridMinutes;
  normalized.day = nextDay;
  normalized.time.clockMinutes = clock;
  return { state: normalized, day: nextDay, clockMinutes: clock };
}

export function advanceSandboxMinutes(state, minutes) {
  const normalized = normalizeSandboxState(state);
  const split = splitClockAdvance(normalized.time.clockMinutes, minutes);
  if (!split.today && !split.rolled) {
    return { state: normalized, applied: 0, clockMinutes: normalized.time.clockMinutes, rolled: false, overflow: 0 };
  }
  if (split.today) {
    const start = normalized.time.clockMinutes;
    normalized.dailyTimeline.push({
      day: normalized.day,
      start,
      duration: split.today,
      end: start + split.today,
      kind: 'pass',
      label: '度过',
      idolId: normalized.idolId,
      locationId: String(normalized.currentLocationId || ''),
      commissionId: '',
      costs: {},
      rewards: {},
    });
    normalized.time.clockMinutes = start + split.today;
  }
  return {
    state: normalized,
    applied: split.today,
    clockMinutes: normalized.time.clockMinutes,
    rolled: split.rolled,
    overflow: split.overflow,
  };
}

export function applyStoryMinutes(state, minutes) {
  const normalized = normalizeSandboxState(state);
  const requested = snapStoryMinutes(minutes);
  const split = splitClockAdvance(normalized.time.clockMinutes, requested);
  if (!split.today) {
    return { state: normalized, applied: 0, clockMinutes: normalized.time.clockMinutes, rolled: split.rolled, overflow: split.overflow };
  }
  const start = normalized.time.clockMinutes;
  const end = start + split.today;
  normalized.dailyTimeline.push({
    day: normalized.day,
    start,
    duration: split.today,
    end,
    kind: 'story',
    label: '剧情',
    idolId: normalized.idolId,
    locationId: String(normalized.currentLocationId || ''),
    commissionId: '',
    costs: {},
    rewards: {},
  });
  normalized.time.clockMinutes = end;
  return { state: normalized, applied: split.today, clockMinutes: end, rolled: split.rolled, overflow: split.overflow };
}

export function applyAction(state, action = {}) {
  const validation = validateAction(state, action);
  if (!validation.ok) return validation;
  const next = validation.state;
  const planned = validation.action;
  const start = next.time.clockMinutes;
  const end = start + planned.duration;
  applyDeltas(next, 'stats', Object.fromEntries(Object.entries(planned.costs || {}).map(([key, value]) => [key, -Number(value)])));
  applyDeltas(next, 'stats', Object.fromEntries(Object.entries(planned.rewards || {}).filter(([key]) => key in next.stats)));
  applyDeltas(next, 'wallet', Object.fromEntries(Object.entries(planned.rewards || {}).filter(([key]) => key in next.wallet)));
  const entry = {
    day: next.day,
    start,
    duration: planned.duration,
    end,
    kind: planned.kind,
    label: planned.label,
    idolId: next.idolId,
    locationId: String(action.locationId || ''),
    commissionId: String(action.commissionId || ''),
    costs: { ...planned.costs },
    rewards: { ...planned.rewards },
  };
  next.dailyTimeline.push(entry);
  next.time.clockMinutes = end;
  return { ok: true, state: next, action: planned, entry };
}

export function buildSandboxSnapshot(state) {
  const normalized = normalizeSandboxState(state);
  return {
    schemaVersion: normalized.schemaVersion,
    day: normalized.day,
    idolId: normalized.idolId,
    clockMinutes: normalized.time.clockMinutes,
    endMinutes: normalized.time.endMinutes,
    dailyGrowthCount: getDailyGrowthCount(normalized),
    dailyGrowthLimit: normalized.dailyGrowthLimit,
    wallet: clone(normalized.wallet),
    stats: clone(normalized.stats),
    questState: clone(normalized.questState),
    flags: clone(normalized.flags),
  };
}
