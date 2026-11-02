import { beatStageHint } from '../beat-chat.js?v=20261026-stage-v1';
import { parseLongPlan } from './sandbox-planner.js';
import { buildSandboxSnapshot, storyTimeHint } from './sandbox-core.js?v=20261026-story-time-v1';

function extractJson(text) {
  const source = String(text || '').replace(/```(?:json|text)?/gi, '').replace(/```/g, '').trim();
  const tagged = source.match(/<SANDBOX_PLAN>\s*([\s\S]*?)\s*<\/SANDBOX_PLAN>/i)?.[1];
  const candidate = tagged || source.match(/\{[\s\S]*\}/)?.[0] || '';
  if (!candidate) return null;
  try { return JSON.parse(candidate); } catch { return null; }
}

export function buildSandboxPlanPrompt(state, userText) {
  const snapshot = buildSandboxSnapshot(state);
  return [
    '[HATSU_OUTPUT_MODE:SANDBOX_PLAN]',
    '为初星日常沙盒生成一段可校验的长时行动计划。',
    '只输出 JSON，不要 Markdown、解释、Beat、VN 或 NIA 标签。也可以用 <SANDBOX_PLAN>{...}</SANDBOX_PLAN> 包裹 JSON。',
    '格式：{"segments":[{"kind":"lesson|training|commission|explore|chat|rest","count":1,"locationId":"可选","commissionId":"可选"}]}。',
    '只允许使用给出的行动 kind，不要填写 duration、cost、reward；前端会决定时长和结算。',
    `当前状态：${JSON.stringify(snapshot)}`,
    `玩家计划：${String(userText || '').trim()}`,
  ].join('\n');
}

export function normalizeSandboxPlanReply(source) {
  const object = extractJson(source);
  if (!object) return { ok: false, errors: [{ reason: 'invalid_json', message: 'AI 没有返回可解析的沙盒计划。' }] };
  const plan = parseLongPlan(object);
  if (!plan.ok) return plan;
  return { ok: true, plan, raw: object };
}

export function buildSandboxFirstLivePrompt(state) {
  const snapshot = buildSandboxSnapshot(state);
  return [
    '[HATSU_OUTPUT_MODE:SANDBOX_FIRST_LIVE]',
    '为琴音 Step1 的第一次 First Live 生成一段极短的 Beat 演出。',
    '只输出 2 个完整 <beat>，不要 Markdown、VN、选项或 NIA 标签。两个 beat 之后另起一行写时间标记。',
    '场景固定为制作人科教室。第一段是演出前确认，第二段是成功后报喜。',
    beatStageHint(),
    `当前状态：${JSON.stringify(snapshot)}`,
    storyTimeHint(),
  ].join('\n');
}

export function normalizeSandboxFirstLiveReply(source) {
  const matches = String(source || '').match(/<beat\b[^>]*>[\s\S]*?<\/beat>/gi) || [];
  return matches.length >= 2 ? { ok: true, script: matches.slice(0, 2).join('\n') } : { ok: false, error: 'First Live 回复缺少两段完整 Beat。' };
}
