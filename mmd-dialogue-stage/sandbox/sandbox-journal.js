import { normalizeSandboxState } from './sandbox-core.js';

function addDelta(target, values) {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (!Number.isFinite(Number(value))) return;
    target[key] = (target[key] || 0) + Number(value);
  });
}

export function buildDailyJournal(state, day = state?.day || 1) {
  const normalized = normalizeSandboxState(state);
  const entries = normalized.dailyTimeline.filter((entry) => entry.day === Number(day));
  const journal = {
    day: Number(day),
    actions: entries.map((entry) => ({
      kind: entry.kind,
      label: entry.label,
      start: entry.start,
      duration: entry.duration,
      locationId: entry.locationId,
    })),
    totalDuration: entries.reduce((total, entry) => total + entry.duration, 0),
    costs: {},
    rewards: {},
    questProgress: normalized.questState && typeof normalized.questState === 'object'
      ? JSON.parse(JSON.stringify(normalized.questState))
      : {},
  };
  entries.forEach((entry) => {
    addDelta(journal.costs, entry.costs);
    addDelta(journal.rewards, entry.rewards);
  });
  const chats = (normalized.chatHistory || []).filter((turn) => turn.day === journal.day);
  journal.chats = chats.map((turn) => ({ role: turn.role, text: turn.text, label: turn.label }));
  journal.line = composeDayLogLine(normalized, journal);
  return journal;
}

/** One entry per day: settled journals, plus the day still in progress. */
export function buildDayActionLog(state) {
  const normalized = normalizeSandboxState(state);
  const byDay = new Map();
  for (const journal of normalized.history || []) {
    const day = Number(journal?.day);
    if (!day) continue;
    byDay.set(day, {
      day,
      summary: journal.line || `第 ${day} 日没有安排行动。`,
      actions: Array.isArray(journal.actions) ? journal.actions : [],
    });
  }
  const timelineDays = new Set(
    (normalized.dailyTimeline || []).map((entry) => Number(entry.day)).filter((day) => day > 0),
  );
  timelineDays.add(normalized.day);
  for (const day of timelineDays) {
    const live = buildDailyJournal(normalized, day);
    if (live.actions.length || !byDay.has(day)) byDay.set(day, live);
  }
  const memories = new Map(
    (normalized.dayMemories || [])
      .filter((item) => item?.text)
      .map((item) => [Number(item.day), String(item.text)]),
  );
  for (const [day, text] of memories) {
    if (!day || byDay.has(day)) continue;
    byDay.set(day, { day, summary: text, actions: [] });
  }
  return [...byDay.values()]
    .sort((left, right) => left.day - right.day)
    .map((journal) => ({
      day: journal.day,
      current: journal.day === normalized.day,
      summary: journal.line || journal.summary || `第 ${journal.day} 日没有安排行动。`,
      memory: memories.get(journal.day) || '',
      actions: Array.isArray(journal.actions) ? journal.actions : [],
    }));
}

/** One sentence for the settled day, stored on the journal inside the save. */
export function composeDayLogLine(state, journal) {
  const day = journal?.day || state?.day || 1;
  const idol = String(state?.idolId || '').includes('琴音') ? '琴音' : (state?.idolId || '偶像');
  const labels = [];
  for (const action of journal?.actions || []) {
    const label = String(action.label || '').trim();
    if (label && !labels.includes(label)) labels.push(label);
  }
  const spoken = (journal?.chats || []).filter((turn) => turn.role === 'user' && String(turn.text || '').trim()).length;
  if (!labels.length && !spoken) return `第 ${day} 日，${idol}没有特别的安排。`;
  const bits = [];
  if (labels.length) bits.push(`做了${labels.join('、')}`);
  if (spoken) bits.push(`和制作人聊了${spoken}句`);
  return `第 ${day} 日，${idol}${bits.join('，')}。`;
}

export function sanitizeDayMemory(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/【初星[^】]*】/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

/** Prompt for the memory that replaces the previous day's raw chat history. */
export function buildDayMemoryPrompt(state) {
  const normalized = normalizeSandboxState(state);
  const day = normalized.day;
  const actions = (normalized.dailyTimeline || [])
    .filter((entry) => entry.day === day)
    .map((entry) => `${entry.label || entry.kind} ${entry.duration}分钟`);
  const lines = (normalized.chatHistory || [])
    .filter((turn) => turn.day === day && turn.text)
    .slice(-40)
    .map((turn) => `${turn.label || (turn.role === 'user' ? '制作人' : '偶像')}：${turn.text}`);
  return [
    `把第 ${day} 日整理成一段以后会反复读取的记忆。`,
    '只写一段中文，120到220字。写下这一天去过哪里、做过什么、和谁说过的关键内容。',
    '不要写 Beat、标签、选项、时间标记，也不要向玩家提问。',
    actions.length ? `行动：${actions.join('、')}` : '行动：没有另外安排。',
    lines.length ? `对话：\n${lines.join('\n')}` : '对话：这一天没有留下对话。',
  ].join('\n');
}
