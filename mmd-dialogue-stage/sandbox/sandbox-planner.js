import {
  applyAction,
  normalizeSandboxState,
  validateAction,
} from './sandbox-core.js';
import { canLocationHostAction } from './sandbox-world.js?v=20261028-field-garden-v1';

const NUMBERS = Object.freeze({
  '一': 1,
  '两': 2,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9,
  '十': 10,
});

function countValue(value) {
  if (value === undefined || value === null || value === '') return 1;
  const text = String(value).trim();
  return Math.max(1, Math.min(9, Number(text) || NUMBERS[text] || 1));
}

function error(reason, message, index = -1) {
  return { reason, message, index };
}

function expandSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.flatMap((segment) => {
    if (!segment || typeof segment !== 'object') return [];
    const count = countValue(segment.count);
    return Array.from({ length: count }, () => ({
      kind: String(segment.kind || '').trim(),
      locationId: String(segment.locationId || ''),
      commissionId: String(segment.commissionId || ''),
    }));
  });
}

function parseTextPlan(text) {
  const source = String(text || '').trim();
  if (!source) return { ok: false, errors: [error('empty_plan', '没有可执行的日程安排。')], segments: [] };
  const segments = [];
  const add = (kind, count = 1) => {
    for (let index = 0; index < count; index += 1) segments.push({ kind });
  };
  const lessonMatch = source.match(/上(?:了|两|二|三|四|[1-4])?节?课|上课/);
  if (lessonMatch) {
    const number = source.match(/上(?:了)?([一二两三四1-4])节?课/);
    add('lesson', countValue(number?.[1]));
  }
  const trainingMatch = source.match(/训练|练习/);
  if (trainingMatch) add('training');
  if (/委托|工作|商演/.test(source)) add('commission');
  if (/探索|外出|商店街|校园/.test(source)) add('explore');
  if (/闲聊|聊天|谈话/.test(source)) add('chat');
  if (/休息|睡觉|恢复/.test(source)) add('rest');
  if (!segments.length) return { ok: false, errors: [error('no_supported_action', '没有识别到可执行行动。')], segments: [] };
  return { ok: true, segments };
}

export function parseLongPlan(input) {
  if (typeof input === 'string') return parseTextPlan(input);
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: [error('invalid_plan', '长时计划必须是文本或 segments 数组。')], segments: [] };
  }
  const segments = expandSegments(input.segments);
  if (!segments.length) return { ok: false, errors: [error('empty_plan', '长时计划没有行动段落。')], segments: [] };
  return { ok: true, segments };
}

function normalizePlan(plan) {
  if (plan?.ok === false) return plan;
  if (plan?.ok === true && Array.isArray(plan.segments)) return plan;
  return parseLongPlan(plan);
}

function addDelta(target, values) {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (!Number.isFinite(Number(value))) return;
    target[key] = (target[key] || 0) + Number(value);
  });
}

export function validateLongPlan(plan, state) {
  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan.ok) return { ok: false, errors: normalizedPlan.errors, preview: null };
  let cursor = normalizeSandboxState(state);
  const errors = [];
  const preview = {
    startMinutes: cursor.time.clockMinutes,
    endMinutes: cursor.time.clockMinutes,
    duration: 0,
    segments: [],
    costs: {},
    rewards: {},
  };
  for (const [index, segment] of normalizedPlan.segments.entries()) {
    if (segment.locationId && !canLocationHostAction(segment.locationId, segment.kind)) {
      errors.push(error('invalid_location', `第 ${index + 1} 段行动地点不支持该行动。`, index));
      break;
    }
    const validation = validateAction(cursor, segment);
    if (!validation.ok) {
      errors.push(error(validation.reason, `第 ${index + 1} 段行动无法执行：${validation.reason}`, index));
      break;
    }
    const applied = applyAction(cursor, segment);
    cursor = applied.state;
    preview.duration += applied.entry.duration;
    preview.endMinutes = applied.entry.end;
    preview.segments.push({ ...applied.entry });
    addDelta(preview.costs, applied.entry.costs);
    addDelta(preview.rewards, applied.entry.rewards);
  }
  return { ok: errors.length === 0, errors, preview: errors.length ? null : preview, plan: normalizedPlan };
}

export function commitLongPlan(plan, state) {
  const validation = validateLongPlan(plan, state);
  if (!validation.ok) return { ...validation, state: normalizeSandboxState(state), interruption: false };
  let cursor = normalizeSandboxState(state);
  const entries = [];
  for (const segment of validation.plan.segments) {
    const result = applyAction(cursor, segment);
    if (!result.ok) return { ok: false, errors: [error(result.reason, result.reason)], state: cursor, interruption: false };
    cursor = result.state;
    entries.push(result.entry);
  }
  return {
    ok: true,
    state: cursor,
    entries,
    preview: validation.preview,
    interruption: false,
  };
}
