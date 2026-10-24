import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';
import { parseBeatScript } from '../mmd-dialogue-stage/beat-protocol.js?v=20261014-npc-portraits-v1';

const clean = (value, limit = 800) => String(value == null ? "" : value).trim().slice(0, limit);
const tvTagBodies = (source) => {
  const text = String(source || "").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
  const open = [...text.matchAll(/<NIA_TV_PROGRAM\b[^>]*>/gi)]; const close = [...text.matchAll(/<\/NIA_TV_PROGRAM\s*>/gi)]; const bodies = [];
  for (let i = close.length - 1, j = open.length - 1; i >= 0 && j >= 0; i -= 1) { while (j >= 0 && open[j].index > close[i].index) j -= 1; if (j < 0) break; bodies.push(text.slice(open[j].index + open[j][0].length, close[i].index)); j -= 1; }
  return bodies;
};

function tvSegmentCount(runtime = {}) {
  if (runtime.segmentCount === 4) return 4;
  if (runtime.segmentCount === 2 || runtime.schemaVersion === 2) return 2;
  if (runtime.schemaVersion === 1 || Number(runtime.pendingSegmentIndex) > 2) return 4;
  return runtime.businessId ? 4 : 2;
}

function tvSceneContext(context) {
  const plan = context.plan || {}, day = context.day || {};
  return {
    businessId:context.businessId,businessLevel:context.businessLevel,programId:context.programId,programName:context.programName,
    idol:context.idol,host:context.host,guest:context.guest,additionalGuest:context.additionalGuest,theme:context.theme,
    strategyId:context.strategyId,selectedTopics:context.selectedTopics,round:context.round,dayIndex:context.dayIndex,
    day:{day:day.day,title:day.title,purpose:day.purpose,problem:day.problem,output:day.output},
    direction:{publicImage:plan.publicImage,principle:plan.principle,storyQuestion:plan.storyQuestion,
      evidence:Array.isArray(plan.evidence)?plan.evidence.slice(0,8):[],risks:Array.isArray(plan.risks)?plan.risks.slice(0,6):[]}
  };
}

export function buildNiaTvSegmentPrompt(context = {}, runtime = {}) {
  const segmentCount = tvSegmentCount(runtime);
  const index = Math.max(1, Math.min(segmentCount, Math.floor(Number(runtime.pendingSegmentIndex) || 1)));
  const isIncident = index === segmentCount - 1, isClosing = index === segmentCount;
  const businessLevel = Math.max(1, Math.min(3, Math.floor(Number(context.businessLevel) || 1)));
  const baseDuties = {
    1: "完成节目开场、主持人介绍和本期主题建立。",
    2: "完成节目的核心环节，体现当前表现策略。",
    3: "制造并处理一个临时节目变化，必须停在等待制作人指示。",
    4: "严格执行制作人指示，完成节目高潮和收尾，不要追加新问题。"
  };
  const premiumDuties = {
    1: "完成大型正式电视节目的开场，由专业主持人与节目组建立本期定位、全国性受众和严格镜头要求。",
    2: "完成大型节目的核心挑战或深度访谈，让担当偶像在更严格的摄影调度与节目任务中执行当前表现策略。",
    3: "由节目组临时追加一项合理要求或改变流程，形成现场压力，并停在等待制作人指示；不得制造危险事故。",
    4: "严格执行制作人指示，把临时要求转化为适合大众传播的节目名场面，完成正式高潮与收尾，不要追加新问题。"
  };
  const flagshipDuties = {
    1: "完成旗舰时段重点特辑的开场，建立专业主持阵容、成熟制作团队、广泛大众受众和明确的节目议题。",
    2: "推进旗舰节目的核心挑战或深度访谈，让担当偶像在高密度镜头、严格流程和公众审视下证明本轮形成的代表性魅力。",
    3: "由节目组临时追加一个会考验既有公众形象的合理追问或流程调整，并停在等待制作人指示；不得制造危险事故。",
    4: "严格执行制作人指示，让偶像在更尖锐的节目框架中守住自身立场并形成可广泛传播的名场面，完成正式收尾。"
  };
  const duties = businessLevel >= 3 ? flagshipDuties : businessLevel >= 2 ? premiumDuties : baseDuties;
  const mergedOpening = businessLevel >= 3
    ? '旗舰特辑开场、核心挑战或深度访谈、自然转折和临时追问在本次回复内连贯写完，体现广泛大众审视、成熟节目团队与更尖锐的节目框架。'
    : businessLevel >= 2 ? '大型正式节目开场、核心挑战或深度访谈、自然转折和节目组临时要求在本次回复内连贯写完，体现专业主持、摄影调度与全国性受众。'
      : '节目开场、核心环节、自然转折和临时变化在本次回复内连贯写完，充分展示本期主题与偶像特质。';
  const duty = segmentCount === 4 ? duties[index] : isIncident
    ? mergedOpening + '只设置一个需要制作人判断的问题，给出恰好三个方案并停在等待选择处，不替制作人选择或提前解决；不得制造危险事故。'
    : duties[4] + '这是本场最后一次生成，在本次回复内完成方案执行、具体后果、节目高光、观众反馈与正式收播，不再追加问题或要求继续生成。';
  const idol = clean(context.idol, 80);
  const host = clean(context.host || '主持人', 80);
  const beat = (id, speaker, display, tts) => '<beat id="' + id + '" speaker="' + speaker + '" cue="talk" look="camera" position="center" shot="medium" wait="text"><display lang="zh">' + display + '</display><tts lang="ja">' + tts + '</tts></beat>';
  const shape = { schemaVersion: segmentCount === 2 ? 2 : 1, segmentCount, businessId: clean(context.businessId || runtime.businessId, 160), segmentIndex: index, status: isIncident ? "awaiting_producer" : isClosing ? "ended" : "continue", lines: [
    { id: 'tv-line-1', type: 'dialogue', speaker: host, text: beat('tv-line-1', host, '欢迎来到本期节目。', '番組へようこそ。') },
    { id: 'tv-line-2', type: 'dialogue', speaker: idol, text: beat('tv-line-2', beatActorId(idol) || idol, '今天请多关照。', '今日はよろしくお願いします。') }
  ], continuitySummary: "供下一段承接的事实摘要。" };
  if (isIncident) Object.assign(shape, { incident: "临时变化", problem: "需要制作人判断的节目状况", options: ["正面回应", "顺势制造节目效果", "保护偶像形象"] });
  if (isClosing) Object.assign(shape, { highlight: "本期节目高光", audienceResponse: "观众反应", impressionChange: "公众印象变化", followupHook: "后续节目钩子", resultSummary: "节目结果摘要", bonusTier: "medium" });
  const levelRule = businessLevel >= 3
    ? "本场是 Lv3 旗舰时段重点特辑：必须体现成熟制作团队、广泛大众审视、更尖锐的节目框架和担当偶像已经形成的公众形象，不得退化成一般访谈。"
    : businessLevel >= 2 ? "本场是 Lv2 大型正式电视节目：必须体现专业主持人、节目组、摄影调度、更广受众和更高规格，不得写成校园广播或简单聊天。" : "本场是 Lv1 基础电视节目。";
  return [
    '[HATSU_OUTPUT_MODE:NIA_TV_PROGRAM]',
    '你正在生成同一场电视节目营业的第 ' + index + ' / ' + segmentCount + ' 段。',
    levelRule, duty,
    segmentCount === 2 ? (isIncident ? '篇幅：中文display正文共1200～1800字，20～32句Beat，完整呈现开场、核心环节、自然转折与临时问题。日语tts、JSON与选项不计中文字数。' : '篇幅：中文display正文共800～1200字，14～24句Beat，完整呈现指示执行、节目高光、结果和正式收播。日语tts与JSON不计中文字数。') : '',
    '固定节目上下文：' + JSON.stringify(tvSceneContext(context)),
    '此前已发生事实：' + JSON.stringify((runtime.segments || []).map(segment => clean(segment?.continuitySummary, 800)).filter(Boolean)),
    isClosing ? '待处理的节目变化：' + JSON.stringify({incident:runtime.segments?.[segmentCount-2]?.incident,problem:runtime.segments?.[segmentCount-2]?.problem}) : '',
    '制作人指示：' + clean(runtime.producerInstruction, 1200),
    '【电视台3D Beat演出】lines[].speaker写纯角色名，不再添加括号里的立绘关键词；lines[].id为本段内唯一编号，lines[].text必须是一个完整Beat，内外id一致。',
    '每句包含中文display和对应的日语tts。动作、表情、视线、站位和景别按现有Beat规则写在属性中；担当偶像使用自己的Beat speaker。',
    '主持人和其他没有3D模型的角色使用原名；有NPC差分资源的角色按世界书face名触发表情。让担当偶像在主持人发言时也留在当前画面。',
    '电视演播室背景已由前端固定，默认不要填写background，不得编造不存在的场景。每条最多一个Beat，每段最多48条；禁止把stage或choice标签当成可见台词。',
    segmentCount === 2 ? '制作人选项只放在外层options数组，不得在Beat内写choice。本场只生成两次：第1段status为awaiting_producer并给出恰好3个方案；第2段status为ended，结果字段完整，不再输出problem或options。' : '制作人选项只放在外层options数组，不得在Beat内写choice。第1、2段status为continue，第3段为awaiting_producer并给出恰好3个方案，第4段为ended并完整收尾。',
    '所有数值与日程由前端结算，不修改粉丝或属性；bonusTier沿用既有none/small/medium/large。',
    '只输出最后一个完整 JSON 标签块，不要 Markdown、思考文本或解释。',
    '<NIA_TV_PROGRAM>', JSON.stringify(shape), '</NIA_TV_PROGRAM>'
  ].filter(Boolean).join('\n');
}

export function parseNiaTvSegmentPayload(source, expected = {}) {
  for (const body of tvTagBodies(typeof source === "string" ? source : source?.rawText || source?.text || "")) {
    try {
      const raw = JSON.parse(body.trim()); const businessId = clean(raw.businessId, 160); const segmentIndex = Number(raw.segmentIndex);
      const segmentCount = expected.segmentCount === 2 ? 2 : 4;
      if (!Number.isInteger(segmentIndex) || segmentIndex < 1 || segmentIndex > segmentCount) return { ok: false, reason: "segment_index_mismatch" };
      if (businessId !== clean(expected.businessId, 160)) return { ok: false, reason: "business_id_mismatch" };
      if (segmentIndex !== Math.floor(Number(expected.segmentIndex))) return { ok: false, reason: "segment_index_mismatch" };
      if (!Array.isArray(raw.lines) || !raw.lines.length || raw.lines.length > 48) return { ok: false, reason: "invalid_tv_segment_contract" };
      const lines = raw.lines.map((line, index) => ({
        id: clean(line?.id, 80) || 'tv-line-' + (index + 1),
        type: ['dialogue', 'narration', 'sfx'].includes(line?.type) ? line.type : 'dialogue',
        speaker: clean(line?.speaker, 80),
        text: clean(line?.text, /<beat\b/i.test(String(line?.text || '')) ? 4000 : 800)
      }));
      if (new Set(lines.map(line => line.id)).size !== lines.length || lines.some(line => {
        if (!line.text) return true;
        if (!/<\/?(?:beat|display|tts)\b/i.test(line.text)) return false;
        const script = parseBeatScript(line.text, {allowOtherSpeakers:true});
        return script.beats.length !== 1 || script.choices.length || /<choice\b/i.test(line.text) || script.errors.some(error => error.code === 'malformed-beat');
      })) return { ok: false, reason: "invalid_tv_segment_contract" };
      if (segmentIndex < segmentCount - 1 && raw.status !== 'continue') return { ok: false, reason: "invalid_tv_segment_contract" };
      if (segmentIndex === segmentCount - 1 && (raw.status !== "awaiting_producer" || !clean(raw.problem) || !Array.isArray(raw.options) || raw.options.length !== 3 || (segmentCount === 2 && (!clean(raw.incident) || raw.options.some(option => typeof option !== 'string' || !clean(option)) || !clean(raw.continuitySummary))))) return { ok: false, reason: "invalid_tv_incident_contract" };
      if (segmentIndex === segmentCount && (raw.status !== "ended" || !clean(raw.highlight) || !clean(raw.resultSummary) || (segmentCount === 2 && (!clean(raw.audienceResponse) || !clean(raw.impressionChange) || !clean(raw.followupHook) || !['none', 'small', 'medium', 'large'].includes(raw.bonusTier) || clean(raw.problem) || (raw.options != null && (!Array.isArray(raw.options) || raw.options.length)))))) return { ok: false, reason: "invalid_tv_closing_contract" };
      return { ok: true, data: { ...raw, schemaVersion: segmentCount === 2 ? 2 : 1, segmentCount, lines } };
    } catch { /* Try the next, older complete tag. */ }
  }
  return { ok: false, reason: "missing_nia_tv_program" };
}

if (typeof globalThis !== "undefined") globalThis.HatsuNiaTvApi = Object.freeze({ buildNiaTvSegmentPrompt, parseNiaTvSegmentPayload });
