import { SANDBOX_LOCATIONS, canonicalSandboxLocationId } from './sandbox-world.js?v=20261028-field-garden-v1';

export const SCENE_CAST_STATUSES = Object.freeze([
  'here', 'moving', 'approaching', 'waiting', 'leaving', 'absent',
]);

export const SCENE_CAST_SOURCES = Object.freeze(['schedule', 'player', 'ai']);

export const SCENE_CAST_ANCHORS = Object.freeze([
  'door', 'desk', 'window', 'center', 'left', 'right', 'back', 'front',
  'bench', 'counter', 'stage', 'unknown',
]);

const KNOWN_LOCATION_IDS = new Set(SANDBOX_LOCATIONS.map((location) => location.id));
const KNOWN_IDOL_ALIASES = Object.freeze({
  '藤田琴音': '藤田琴音',
  '花海咲季': '花海咲季',
  '月村手毬': '月村手毬',
  '秦谷美铃': '秦谷美鈴',
  '秦谷美鈴': '秦谷美鈴',
  '花海佑芽': '花海佑芽',
  '有村麻央': '有村麻央',
  '葛城莉莉娅': '葛城リーリヤ',
  '葛城リーリヤ': '葛城リーリヤ',
  '仓本千奈': '倉本千奈',
  '倉本千奈': '倉本千奈',
  '紫云清夏': '紫雲清夏',
  '紫雲清夏': '紫雲清夏',
  '篠泽广': '篠澤広',
  '篠澤広': '篠澤広',
  '姬崎莉波': '姫崎莉波',
  '姫崎莉波': '姫崎莉波',
  '十王星南': '十王星南',
  '雨夜燕': '雨夜燕',
});

export const SCENE_CAST_IDOLS = Object.freeze([...new Set(Object.values(KNOWN_IDOL_ALIASES))]);
const KNOWN_IDOL_SET = new Set(SCENE_CAST_IDOLS);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function string(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

export function canonicalCastIdol(value) {
  const key = string(value);
  return KNOWN_IDOL_ALIASES[key] || '';
}

export function sameCastIdol(left, right) {
  const a = canonicalCastIdol(left) || string(left);
  const b = canonicalCastIdol(right) || string(right);
  return Boolean(a) && a === b;
}

export function isKnownSceneLocation(value) {
  return KNOWN_LOCATION_IDS.has(string(value));
}

export function normalizeSceneCastEntry(raw, { idolId = '', day = 1, minutes = 480, source = 'ai' } = {}) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const canonicalId = canonicalCastIdol(item.id || item.idolId || idolId);
  const locationId = canonicalSandboxLocationId(string(item.locationId || ''));
  if (!canonicalId || !KNOWN_IDOL_SET.has(canonicalId) || !isKnownSceneLocation(locationId)) return null;
  const status = SCENE_CAST_STATUSES.includes(item.status) ? item.status : 'here';
  const anchor = SCENE_CAST_ANCHORS.includes(item.anchor) ? item.anchor : 'center';
  const safeSource = SCENE_CAST_SOURCES.includes(item.source) ? item.source : source;
  return {
    source: SCENE_CAST_SOURCES.includes(safeSource) ? safeSource : 'ai',
    status,
    locationId,
    anchor,
    intent: string(item.intent).slice(0, 240),
    updatedAt: {
      day: Math.max(1, number(item.updatedAt?.day, day)),
      minutes: Math.max(0, number(item.updatedAt?.minutes, minutes)),
    },
  };
}

export function normalizeSceneCast(raw, { day = 1, minutes = 480 } = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([key, value]) => {
    const entry = normalizeSceneCastEntry(value, { idolId: key, day, minutes });
    if (entry) normalized[canonicalCastIdol(key) || key] = entry;
  });
  return normalized;
}

export function normalizeContactRequests(raw, { day = 1, minutes = 480 } = {}) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object').map((item, index) => {
    const idolId = canonicalCastIdol(item.idolId || item.id);
    const destinationLocationId = isKnownSceneLocation(canonicalSandboxLocationId(item.destinationLocationId))
      ? canonicalSandboxLocationId(item.destinationLocationId)
      : 'home_classroom';
    const status = ['pending', 'accepted', 'delayed', 'rejected'].includes(item.status) ? item.status : 'pending';
    return {
      id: string(item.id) || `contact-${day}-${minutes}-${index + 1}`,
      idolId: idolId || '藤田琴音',
      fromLocationId: isKnownSceneLocation(item.fromLocationId) ? string(item.fromLocationId) : 'home_classroom',
      destinationLocationId,
      status,
      message: string(item.message).slice(0, 240),
      reason: string(item.reason).slice(0, 240),
      etaMinutes: Math.max(0, Math.min(1440, number(item.etaMinutes, status === 'delayed' ? 30 : 0))),
      createdAt: {
        day: Math.max(1, number(item.createdAt?.day, day)),
        minutes: Math.max(0, number(item.createdAt?.minutes, minutes)),
      },
      resolvedAt: item.resolvedAt && typeof item.resolvedAt === 'object'
        ? { day: Math.max(1, number(item.resolvedAt.day, day)), minutes: Math.max(0, number(item.resolvedAt.minutes, minutes)) }
        : null,
    };
  }).slice(-40);
}

function extractJsonObject(raw) {
  const source = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(source); } catch { /* try a bounded object below */ }
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(source.slice(start, end + 1)); } catch { return null; }
}

export function extractSceneCastPatch(source) {
  const match = String(source || '').match(/<scene_cast(?:_patch)?\b[^>]*>\s*([\s\S]*?)\s*<\/scene_cast(?:_patch)?>/i);
  if (!match) return { ok: false, patch: null, error: 'missing_scene_cast' };
  const parsed = extractJsonObject(match[1]);
  if (!parsed || typeof parsed !== 'object') return { ok: false, patch: null, error: 'invalid_scene_cast_json' };
  const cast = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.cast) ? parsed.cast : []);
  const requests = Array.isArray(parsed.requests) ? parsed.requests : (Array.isArray(parsed.contactRequests) ? parsed.contactRequests : []);
  if (!cast.length && !requests.length) return { ok: false, patch: null, error: 'empty_scene_cast' };
  return { ok: true, patch: { cast, requests } };
}

function sameLocation(left, right) {
  if (left === right) return true;
  return (left === 'student_council' && right === 'club_building') || (left === 'club_building' && right === 'student_council');
}

export function applySceneCastPatch(state, patch, { day, minutes } = {}) {
  const base = state && typeof state === 'object' ? clone(state) : {};
  const currentDay = Math.max(1, number(day, number(base.day, 1)));
  const currentMinutes = Math.max(0, number(minutes, number(base.time?.clockMinutes, 480)));
  base.sceneCast = normalizeSceneCast(base.sceneCast, { day: currentDay, minutes: currentMinutes });
  base.contactRequests = normalizeContactRequests(base.contactRequests, { day: currentDay, minutes: currentMinutes });
  const applied = [];
  const rejected = [];
  if (!patch || typeof patch !== 'object') return { state: base, applied, rejected };
  for (const raw of Array.isArray(patch.cast) ? patch.cast : []) {
    const entry = normalizeSceneCastEntry(raw, { day: currentDay, minutes: currentMinutes, source: 'ai' });
    if (!entry) {
      rejected.push({ type: 'cast', value: raw });
      continue;
    }
    const idolId = canonicalCastIdol(raw.id || raw.idolId);
    base.sceneCast[idolId] = entry;
    applied.push({ type: 'cast', idolId, entry });
  }
  for (const raw of Array.isArray(patch.requests) ? patch.requests : []) {
    const idolId = canonicalCastIdol(raw?.idolId || raw?.id);
    if (!idolId || !isKnownSceneLocation(raw?.destinationLocationId)) {
      rejected.push({ type: 'request', value: raw });
      continue;
    }
    const normalized = normalizeContactRequests([{ ...raw, idolId }], { day: currentDay, minutes: currentMinutes })[0];
    if (normalized.status !== 'pending' && !normalized.resolvedAt) {
      normalized.resolvedAt = { day: currentDay, minutes: currentMinutes };
    }
    const index = base.contactRequests.findIndex((item) => item.id === normalized.id);
    if (index >= 0) base.contactRequests[index] = normalized;
    else base.contactRequests.push(normalized);
    base.contactRequests = base.contactRequests.slice(-40);
    applied.push({ type: 'request', request: normalized });
  }
  return { state: base, applied, rejected };
}

export function mergeSandboxCampusPresence(baseline = [], state = {}) {
  const currentLocationId = string(state.currentLocationId || 'home_classroom');
  const rows = new Map((Array.isArray(baseline) ? baseline : []).map((row) => [row.name, { ...row }]));
  const cast = normalizeSceneCast(state.sceneCast, { day: state.day, minutes: state.time?.clockMinutes });
  Object.entries(cast).forEach(([name, entry]) => {
    let display = name;
    for (const key of [...rows.keys()]) {
      if (!sameCastIdol(key, name)) continue;
      display = key;
      rows.delete(key);
    }
    if (!sameLocation(entry.locationId, currentLocationId)) return;
    if (entry.status === 'absent' || entry.status === 'leaving') return;
    rows.set(display, {
      name: display,
      locationId: entry.locationId,
      activity: entry.intent || (entry.status === 'approaching' ? '正在赶来' : entry.status === 'waiting' ? '在这里等候' : '在这里活动'),
      activityId: entry.status,
      anchor: entry.anchor,
      status: entry.status,
      source: entry.source,
      isProducedIdol: false,
    });
  });
  return [...rows.values()];
}

export function latestPendingContact(state, idolId, destinationLocationId) {
  const canonicalId = canonicalCastIdol(idolId);
  return normalizeContactRequests(state?.contactRequests, { day: state?.day, minutes: state?.time?.clockMinutes })
    .find((request) => request.idolId === canonicalId && request.destinationLocationId === destinationLocationId && request.status === 'pending') || null;
}

export function buildSandboxContactPrompt({ idolId, requestId, destinationLocationId, destinationLabel, context = '' } = {}) {
  const idol = canonicalCastIdol(idolId) || '藤田琴音';
  const request = string(requestId) || 'contact-request';
  const place = string(destinationLabel) || string(destinationLocationId) || '当前地点';
  return [
    '你是初星学园沙盒的剧情导演。制作人刚刚用手机邀请一名偶像前往指定地点。请结合她当前行踪、时间、关系和正在进行的剧情，决定她是否接受。',
    `被联系的偶像：${idol}`,
    `目标地点：${place}（locationId=${string(destinationLocationId) || 'home_classroom'}）`,
    `请求编号：${request}`,
    context,
    '你可以自由决定三种结果：accepted（接受并前往）、delayed（暂时不能到，给出 etaMinutes）、rejected（明确拒绝并说明原因）。如果接受，请让她以 approaching 或 here 状态出现在目标地点；anchor 使用 door、desk、window、center、left、right、back、front、bench、counter、stage、unknown 之一。',
    `只输出一个 scene_cast 标签，不要输出 Markdown 代码围栏：<scene_cast>{"requests":[{"id":"${request}","idolId":"${idol}","destinationLocationId":"${string(destinationLocationId) || 'home_classroom'}","status":"accepted|delayed|rejected","reason":"简短理由","etaMinutes":0}],"cast":[{"id":"${idol}","status":"approaching|here","locationId":"${string(destinationLocationId) || 'home_classroom'}","anchor":"door","intent":"她现在准备做什么"}]}</scene_cast>。如果 delayed 或 rejected，cast 可以为空。`,
  ].filter(Boolean).join('\n');
}
