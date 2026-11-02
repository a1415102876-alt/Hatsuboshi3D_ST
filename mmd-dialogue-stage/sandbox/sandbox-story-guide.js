import { SANDBOX_LOCATIONS, canonicalSandboxLocationId } from './sandbox-world.js?v=20261028-field-garden-v1';

export const STORY_IDOLS = Object.freeze([
  '藤田琴音', '月村手毬', '花海咲季', '紫云清夏', '葛城莉莉娅', '筱泽广',
  '花海佑芽', '秦谷美铃', '仓本千奈', '十王星南', '雨夜燕', '有村麻央', '姬崎莉波',
]);

const IDOL_ALIASES = Object.freeze({
  藤田琴音: '藤田琴音', 琴音: '藤田琴音',
  月村手毬: '月村手毬', 手毬: '月村手毬',
  花海咲季: '花海咲季', 咲季: '花海咲季',
  紫云清夏: '紫云清夏', 紫雲清夏: '紫云清夏', 清夏: '紫云清夏',
  葛城莉莉娅: '葛城莉莉娅', 葛城リーリヤ: '葛城莉莉娅', 莉莉娅: '葛城莉莉娅',
  筱泽广: '筱泽广', 篠泽广: '筱泽广', 篠澤広: '筱泽广', 广: '筱泽广',
  花海佑芽: '花海佑芽', 佑芽: '花海佑芽',
  秦谷美铃: '秦谷美铃', 秦谷美鈴: '秦谷美铃', 美铃: '秦谷美铃',
  仓本千奈: '仓本千奈', 倉本千奈: '仓本千奈', 千奈: '仓本千奈',
  十王星南: '十王星南', 星南: '十王星南',
  雨夜燕: '雨夜燕', 燕: '雨夜燕',
  有村麻央: '有村麻央', 麻央: '有村麻央',
  姬崎莉波: '姬崎莉波', 姫崎莉波: '姬崎莉波', 莉波: '姬崎莉波',
});

const LOCATION_IDS = new Set(SANDBOX_LOCATIONS.map((location) => location.id));
const DAY_START = 8 * 60;
const DAY_END = 24 * 60;
const GRID = 15;
const STORY_LIMIT = 10;

function text(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function snap(minutes) {
  return Math.round(minutes / GRID) * GRID;
}

export function canonicalStoryIdol(value) {
  return IDOL_ALIASES[text(value, 40)] || '';
}

export function canonicalStoryLocation(value) {
  const id = canonicalSandboxLocationId(text(value, 80));
  if (id === 'student_council') return 'club_building';
  return LOCATION_IDS.has(id) ? id : '';
}

function parseClock(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return snap(value);
  const match = text(value, 8).match(/^(\d{1,2})\s*[:：]\s*(\d{2})$/);
  if (!match) return null;
  return snap(Number(match[1]) * 60 + Number(match[2]));
}

function extractJson(raw) {
  const source = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(source); } catch { /* fall through to a bounded object */ }
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(source.slice(start, end + 1)); } catch { return null; }
}

export function emptyStoryGuide(day = 1) {
  return { day: Math.max(1, Math.round(Number(day) || 1)), stories: [] };
}

export function normalizeStoryGuide(raw, day = 1) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const guideDay = Math.max(1, Math.round(Number(source.day) || day || 1));
  const stories = [];
  for (const item of Array.isArray(source.stories) ? source.stories : []) {
    const story = normalizeStory(item);
    if (story) stories.push(story);
  }
  return { day: guideDay, stories: stories.slice(0, STORY_LIMIT) };
}

function normalizeStory(item) {
  if (!item || typeof item !== 'object') return null;
  const idols = [];
  const names = Array.isArray(item.idols) ? item.idols : (Array.isArray(item.names) ? item.names : []);
  for (const name of names) {
    const idol = canonicalStoryIdol(name);
    if (idol && !idols.includes(idol)) idols.push(idol);
  }
  const locationId = canonicalStoryLocation(item.locationId || item.place);
  const start = parseClock(item.start ?? item.startMinutes);
  const end = parseClock(item.end ?? item.endMinutes);
  const premise = text(item.premise || item.what, 80);
  const brief = text(item.brief || item.log, 120);
  if (idols.length < 2 || idols.length > 3 || !locationId || start == null || end == null || !premise || !brief) return null;
  if (start < DAY_START || end > DAY_END || end - start < 30 || end - start > 90) return null;
  return { idols, locationId, start, end, premise, brief };
}

export function parseStoryGuide(raw, { day = 1, producedIdolId = '藤田琴音' } = {}) {
  const parsed = extractJson(raw);
  const rows = Array.isArray(parsed?.stories) ? parsed.stories : (Array.isArray(parsed) ? parsed : []);
  const produced = canonicalStoryIdol(producedIdolId) || '藤田琴音';
  const booked = [];
  const stories = [];
  for (const row of rows) {
    const story = normalizeStory(row);
    if (!story) continue;
    story.idols = story.idols.filter((name) => name !== produced);
    if (story.idols.length < 2) continue;
    const overlaps = story.idols.some((name) => booked.some((item) => item.name === name && item.start < story.end && story.start < item.end));
    if (overlaps) continue;
    for (const name of story.idols) booked.push({ name, start: story.start, end: story.end });
    stories.push(story);
    if (stories.length >= STORY_LIMIT) break;
  }
  return { day: Math.max(1, Math.round(Number(day) || 1)), stories };
}

export function storyGuidePlacements(state = {}) {
  const guide = normalizeStoryGuide(state.storyGuide, state.day);
  const placed = new Map();
  if (guide.day !== Math.max(1, Math.round(Number(state.day) || 1))) return placed;
  const now = Math.max(0, Number(state.time?.clockMinutes) || 0);
  const produced = canonicalStoryIdol(state.idolId) || '藤田琴音';
  for (const story of guide.stories) {
    if (now < story.start || now >= story.end) continue;
    for (const name of story.idols) {
      if (name === produced || placed.has(name)) continue;
      placed.set(name, story);
    }
  }
  return placed;
}

export function finishedStoryBriefs(state = {}) {
  const guide = normalizeStoryGuide(state.storyGuide, state.day);
  if (guide.day !== Math.max(1, Math.round(Number(state.day) || 1))) return [];
  const now = Math.max(0, Number(state.time?.clockMinutes) || 0);
  return guide.stories.filter((story) => now >= story.end);
}

export function buildStoryWitnessPrompt(state = {}) {
  const finished = finishedStoryBriefs(state);
  if (!finished.length) return '';
  return [
    '【学园见闻】',
    '这些是今天已经发生的事。制作人未必在场。当作既成事实，不要写成选项，也不要提前讲述还没到点的故事。',
    ...finished.map((story) => `- ${story.idols.join('、')}：${story.brief}`),
  ].join('\n');
}

export function normalizeStoryLog(raw) {
  if (!Array.isArray(raw)) return [];
  const days = new Map();
  for (const item of raw) {
    const guide = normalizeStoryGuide(item, item?.day);
    if (!guide.stories.length) continue;
    days.set(guide.day, guide);
  }
  return [...days.values()].sort((left, right) => left.day - right.day).slice(-30);
}

export function appendStoryLog(log, guide) {
  const archived = normalizeStoryGuide(guide);
  if (!archived.stories.length) return normalizeStoryLog(log);
  const next = normalizeStoryLog(log).filter((item) => item.day !== archived.day);
  next.push(archived);
  return next.sort((left, right) => left.day - right.day).slice(-30);
}

export function buildStoryGuidePrompt(state = {}, memoryText = '') {
  const day = Math.max(1, Math.round(Number(state.day) || 1));
  const produced = canonicalStoryIdol(state.idolId) || '藤田琴音';
  const idols = STORY_IDOLS.filter((name) => name !== produced);
  const places = SANDBOX_LOCATIONS
    .filter((location) => location.id !== 'student_council')
    .map((location) => `${location.id} ${location.label}`)
    .join('\n');
  const memory = text(memoryText, 800);
  return [
    `为第 ${day} 日写一份故事指导。这一天发生大约 10 件偶像之间的小事。`,
    `担当是${produced}。不要把担当排进故事，她这一天跟着制作人。`,
    `可以出场的偶像：${idols.join('、')}`,
    '只能使用下面的地点 ID。',
    places,
    '每件故事 2 到 3 人。同一个人的时间不能重叠。时间写成 08:00 这种 15 分钟一档，范围从 08:00 到 23:00，每件持续 30 到 90 分钟。',
    'premise 写这件事会发生什么，40到80字。brief 写制作人没有到场时记进日志的一句话，40到80字。',
    '写成新的校园日常。不要复述某一张支援卡或活动剧情的原情节。',
    memory ? `昨天留下的记忆，避免马上和它矛盾：${memory}` : '',
    '只输出 JSON，不要解释。格式：{"stories":[{"idols":["花海咲季","仓本千奈"],"locationId":"dance_room","start":"10:00","end":"10:45","premise":"咲季拉着千奈加练基础步，千奈连连求饶。","brief":"舞蹈室里，咲季拉着千奈加练，千奈差点哭出来。"}]}',
  ].filter(Boolean).join('\n');
}
