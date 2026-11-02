import { normalizeSandboxState } from './sandbox-core.js?v=20261028-story-guide-v1';

const KOTONE_STEP1 = Object.freeze([
  Object.freeze({ id: 'kotone-rest', title: '停止透支体力', target: 3, counter: 'recoveryDays', consequence: '疲劳表现逐渐减轻。' }),
  Object.freeze({ id: 'kotone-confidence', title: '建立自信', target: 10, counter: 'praiseCount', consequence: '日常对话中的自我否定减少。' }),
  Object.freeze({ id: 'kotone-work', title: '找到偶像活动相关的打工', target: 2, counter: 'commissionCount', consequence: '琴音获得更实际的舞台机会。' }),
  Object.freeze({ id: 'kotone-scholarship', title: '申请奖学金', target: 1, counter: 'scholarshipMeeting', consequence: '奖学金相关的 First Live 支援条件开放。' }),
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function questPackFor(idolId) {
  return String(idolId || '藤田琴音') === '藤田琴音' ? KOTONE_STEP1 : [];
}

export function getStep1QuestPack(idolId) {
  return questPackFor(idolId).map((quest) => ({ ...quest }));
}

function ensureQuestState(state) {
  const pack = questPackFor(state.idolId);
  pack.forEach((quest) => {
    const current = state.questState[quest.id];
    if (!current || typeof current !== 'object') {
      state.questState[quest.id] = { status: 'active', progress: 0, target: quest.target, counter: quest.counter };
    } else {
      current.status = current.status === 'completed' ? 'completed' : 'active';
      current.progress = Math.max(0, Math.min(quest.target, Number(current.progress) || 0));
      current.target = quest.target;
      current.counter = quest.counter;
    }
  });
}

function setProgress(state, questId, progress) {
  const quest = state.questState[questId];
  if (!quest) return;
  quest.progress = Math.max(0, Math.min(quest.target, Math.round(Number(progress) || 0)));
  if (quest.progress >= quest.target) quest.status = 'completed';
}

export function applyQuestEffects(state, event = {}) {
  const next = normalizeSandboxState(state);
  ensureQuestState(next);
  const type = String(event.type || '');
  if (type === 'praise') {
    const current = next.questState['kotone-confidence']?.progress || 0;
    setProgress(next, 'kotone-confidence', current + Math.max(1, Number(event.count) || 1));
  }
  if (type === 'scholarship_meeting') setProgress(next, 'kotone-scholarship', 1);
  if (type === 'sync_from_timeline') {
    const commissionCount = next.dailyTimeline.filter((entry) => entry.kind === 'commission').length;
    setProgress(next, 'kotone-work', commissionCount);
  }
  if (type === 'day_settled') {
    const growthActions = Math.max(0, Number(event.growthActions) || 0);
    const commissionCount = Math.max(0, Number(event.commissionCount) || 0);
    const current = next.questState['kotone-rest']?.progress || 0;
    setProgress(next, 'kotone-rest', growthActions === 0 && commissionCount === 0 ? current + 1 : 0);
  }
  return next;
}

export function isFirstLiveReady(state) {
  const normalized = normalizeSandboxState(state);
  ensureQuestState(normalized);
  return questPackFor(normalized.idolId).length > 0
    && questPackFor(normalized.idolId).every((quest) => normalized.questState[quest.id]?.status === 'completed');
}

const PRAISE_FLAG_RE = /【初星任务标记】\s*praise_kotone|<quest_flag\s+id=["']praise_kotone["']\s*\/?>/i;

export function parsePraiseFlag(source) {
  return PRAISE_FLAG_RE.test(String(source || ''));
}

export function praiseQuestHint(state) {
  const quest = getQuestStatusSummary(state).find((item) => item.id === 'kotone-confidence');
  if (!quest || quest.status === 'completed' || quest.progress >= quest.target) return '';
  return `建立自信 ${quest.progress}/${quest.target}。若玩家这一轮明确夸奖了琴音的努力、进步、可爱或舞台，在全部 beat 之后另起一行只写一次【初星任务标记】praise_kotone。没有夸奖不要写。不要把标记写进台词、display 或 tts。`;
}

export function getQuestStatusSummary(state) {
  const normalized = normalizeSandboxState(state);
  ensureQuestState(normalized);
  return getStep1QuestPack(normalized.idolId).map((quest) => ({
    ...quest,
    ...(clone(normalized.questState[quest.id] || {})),
  }));
}
