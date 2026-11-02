import { beatStageHint } from '../beat-chat.js?v=20261026-stage-v1';
import { normalizeSandboxState } from './sandbox-core.js?v=20261028-story-guide-v1';
import { buildSandboxAiContext } from './sandbox-affinity.js?v=20261028-presence-phase-v1';

/** 与 public/hatsu-produce-local/app.js 的 affinityRouteSeeds「藤田琴音」[0] 相同。 */
export const KOTONE_BOND_EPISODE_1 = Object.freeze({
  id: 1,
  threshold: 0,
  title: '担当开场',
  backgrounds: Object.freeze(['校外街道-午', '制作人课室-午']),
  guidance: '打工结束后的初遇与劝诱在校外街道。制作人课室仅用于确实回校后的收束或制作人记录，不把初遇改到教室。',
  seed: '最初的接触与被选择。状态：仍把自己视作成绩不起眼、实绩不足的底层偶像候补。她会用可爱营业、吐槽和夸张反应撑住场面，嘴上说得很有气势，心里却还不相信自己真的会被认真选择。锚点：打工后的初遇、对制作人身份的怀疑、“这不是搭讪吧”的确认、为什么偏偏选择自己的不安、被制作人看见潜力后的狂喜、将“也许我还有机会”转化成“我要出人头地，成为顶级偶像，让家里人安心”的第一声宣言。',
});

export function kotoneBondSeen(state) {
  const seen = state?.flags?.bondSeen;
  return Array.isArray(seen) ? seen.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : [];
}

export function markKotoneBondSeen(state, episodeId = 1) {
  const next = normalizeSandboxState(state);
  const seen = new Set(kotoneBondSeen(next));
  seen.add(Number(episodeId) || 1);
  next.flags = { ...next.flags, bondSeen: [...seen] };
  return next;
}

export function kotoneBondContext(state) {
  if (!kotoneBondSeen(state).includes(1)) return '';
  const episode = KOTONE_BOND_EPISODE_1;
  return [
    '【已发生的好感度剧情】',
    `第1话《${episode.title}》已经发生。后续对话要承接这次初遇，不要再演一遍。`,
    `剧情种子：${episode.seed}`,
  ].join('\n');
}

export function buildKotoneBondEpisodePrompt(state, { locationLabel = '' } = {}) {
  const episode = KOTONE_BOND_EPISODE_1;
  return [
    '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
    '你正在写藤田琴音好感度剧情第1话，不是日常闲聊。',
    buildSandboxAiContext(state, { locationLabel }),
    `剧情节点：好感度 ${episode.threshold} / ${episode.title}`,
    '剧情种子：',
    episode.seed,
    `场景：${episode.guidance}`,
    `background 只能使用：${episode.backgrounds.join('、')}。开场必须是校外街道-午。`,
    '参考种子只提供矛盾结构，不要复述原句。一次写完，输出 20 个左右的 <beat> 标签，不少于 10 个，一般落在 16 到 24 个。不要输出 JSON、Markdown 或解释。',
    beatStageHint(),
    '样例：<beat speaker="藤田琴音" cue="说话" face="高兴" look="camera" position="center" background="校外街道-午" shot="medium" camera="medium"><display lang="zh">中文</display><tts lang="ja">日语</tts></beat>',
    'cue 只用这些中文：说话、吃惊、询问、疑问、思考、害羞、得意、干劲、点头、摇头、鞠躬。吃惊、害羞、得意、干劲、询问自带表情，不要再写 face。',
    'face 只在 cue="说话" 时使用：高兴、惊讶、害羞、困扰、自然、难过、生气。',
    '中文放在 <display lang="zh">，日语放在 <tts lang="ja">。',
    '不要写选项，不要在台词里改时间、Vo、Da、Vi、体力或压力。经过的时间只写在段落后的时间标记里。',
  ].filter(Boolean).join('\n');
}
