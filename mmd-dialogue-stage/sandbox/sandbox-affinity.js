import { normalizeSandboxState, storyTimeHint } from './sandbox-core.js?v=20261029-commission-v1';
import { buildEventWriterContext } from './sandbox-event.js?v=20261028-daily-event-v4';
import { describeIdolOrder } from './sandbox-orders.js';
import { buildSandboxCastOverridePrompt, buildSandboxPresencePrompt } from './sandbox-presence.js?v=20261028-field-garden-v1';
import { buildStoryWitnessPrompt } from './sandbox-story-guide.js?v=20261028-story-guide-v1';
import { getQuestStatusSummary, isFirstLiveReady, praiseQuestHint } from './sandbox-quests.js?v=20261026-praise-flag-v1';

const AFFINITY_CODES = Object.freeze({
  藤田琴音: 'KOTONE',
});

const STAGE_LABELS = Object.freeze({
  0: '初识',
  20: '相互试探',
  40: '核心问题暴露',
  60: '关系转折',
  80: '路线后半',
  100: 'First Live 之后',
});

export function affinityValue(state) {
  return Math.max(0, Math.min(100, Math.round(Number(state?.stats?.trust) || 0)));
}

export function affinityStageThreshold(value) {
  const score = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  if (score >= 100) return 100;
  if (score >= 80) return 80;
  if (score >= 60) return 60;
  if (score >= 40) return 40;
  if (score >= 20) return 20;
  return 0;
}

export function affinityStageLabel(value) {
  return STAGE_LABELS[affinityStageThreshold(value)] || STAGE_LABELS[0];
}

export function affinityStageTag(idolId, value) {
  const code = AFFINITY_CODES[String(idolId || '藤田琴音')] || '';
  return code ? `AFF_${code}_${affinityStageThreshold(value)}` : '';
}

export function parseAffinityDelta(source, idolName = '藤田琴音') {
  const match = String(source || '').match(/<relationship_update>\s*([\s\S]*?)\s*<\/relationship_update>/i);
  if (!match) return 0;
  try {
    const data = JSON.parse(match[1]);
    const raw = data?.[idolName];
    const number = Number(raw);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-5, Math.min(5, Math.round(number)));
  } catch {
    return 0;
  }
}

export function applyAffinityDelta(state, delta) {
  const next = normalizeSandboxState(state);
  const before = affinityValue(next);
  const applied = Math.max(-5, Math.min(5, Math.round(Number(delta) || 0)));
  const after = Math.max(0, Math.min(100, before + applied));
  next.stats.trust = after;
  return {
    state: next,
    before,
    after,
    delta: after - before,
    tag: affinityStageTag(next.idolId, after),
    label: affinityStageLabel(after),
  };
}

function dayMemoryContext(state) {
  const memories = Array.isArray(state?.dayMemories) ? state.dayMemories : [];
  if (!memories.some((item) => item.day < state.day)) return '';
  return [
    '【往日记忆】',
    '这些是已经结束的日子留下的记忆。只根据这段记忆了解过去，不要把上一天的原始对话当作仍在进行的上下文。',
    ...memories.filter((item) => item.day < state.day).map((item) => `第 ${item.day} 日：${item.text}`),
  ].join('\n');
}

function formatClockLabel(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  const hour = Math.floor(value / 60);
  const minute = String(value % 60).padStart(2, '0');
  const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  return `${period} ${String(hour).padStart(2, '0')}:${minute}`;
}

export function buildSandboxAiContext(state, { locationLabel = '', soloAction = false } = {}) {
  const normalized = normalizeSandboxState(state);
  const presencePrompt = buildSandboxPresencePrompt(normalized);
  const score = affinityValue(normalized);
  const tag = affinityStageTag(normalized.idolId, score);
  const stage = isFirstLiveReady(normalized)
    ? 'Step1 · 课题已完成，可以开始第一次公开演出'
    : 'Step1 · 第一次公开演出准备中';
  const quests = getQuestStatusSummary(normalized)
    .map((quest) => `${quest.title} ${quest.progress}/${quest.target}${quest.status === 'completed' ? '，已完成' : ''}`)
    .join('；');
  return [
    '【前端状态】',
    `担当：${normalized.idolId}`,
    `育成阶段：${stage}`,
    `当前课题：${quests || '无'}`,
    `日程：第 ${normalized.day} 日 ${formatClockLabel(normalized.time.clockMinutes)}${locationLabel ? ` · ${locationLabel}` : ''}`,
    `偶像行踪：${describeIdolOrder(normalized)}`,
    presencePrompt,
    presencePrompt.includes('<scene_cast>') ? '' : buildSandboxCastOverridePrompt(normalized),
    `好感度：${score}/100`,
    `好感度阶段：${affinityStageLabel(score)}`,
    tag ? `好感度阶段标签：${tag}` : '',
    `活动力：${normalized.stats.stamina}/100，压力：${normalized.stats.stress}`,
    soloAction
      ? '琴音不在当前地点。这是制作人自己的行动，不要让她出场或说话。没有与她的互动，relationship_update 写 0。不要输出夸奖任务标记。'
      : '好感度由前端统计。请只根据玩家这一句判断本轮增减，输出 -5 到 +5 的整数；没有实际情感互动时输出 0。',
    soloAction
      ? ''
      : `在全部 beat 之后另起一行写 <relationship_update>{"${normalized.idolId}":1}</relationship_update>。不要把这个标签写进台词、display 或 tts。`,
    soloAction ? '' : praiseQuestHint(normalized),
    storyTimeHint(),
    dayMemoryContext(normalized),
    buildStoryWitnessPrompt(normalized),
    buildEventWriterContext(normalized),
  ].filter(Boolean).join('\n');
}
