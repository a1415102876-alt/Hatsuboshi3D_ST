import { beatStageHint } from '../beat-chat.js?v=20261027-cast-speak-v1';
import { buildKotoneBondEpisodePrompt, kotoneBondContext } from './sandbox-kotone-bond.js?v=20261028-presence-phase-v1&presence=20261026-v1';
import { PRODUCE_IDOL_PRESETS } from './sandbox-produce-stats.js?v=20261026-produce-actions-v1';

/** 与 public/hatsu-produce-local/app.js 的 affinityRouteSeeds 各偶像 0 好感种子相同。 */
export const PRODUCE_OPENING_SEEDS = Object.freeze({
  藤田琴音: '最初的接触与被选择。状态：仍把自己视作成绩不起眼、实绩不足的底层偶像候补。她会用可爱营业、吐槽和夸张反应撑住场面，嘴上说得很有气势，心里却还不相信自己真的会被认真选择。锚点：打工后的初遇、对制作人身份的怀疑、“这不是搭讪吧”的确认、为什么偏偏选择自己的不安、被制作人看见潜力后的狂喜、将“也许我还有机会”转化成“我要出人头地，成为顶级偶像，让家里人安心”的第一声宣言。',
  月村手毬: '冷淡拒绝，但因为制作人知道她的失败与丑闻仍然选择她而动摇。',
  花海咲季: '入学考试第一的花海咲季带着傲慢与自信登场，却用胜利者的外壳掩盖内心焦虑，试图通过制作人寻找通往「世界第一」的捷径。她对妹妹佑芽感情复杂——既是亲人，也是最强对手。制作人点破「如果不改变现状就会输」，她第一次露出恐惧，随即追问「能帮我赢吗」并建立初步信赖。【钩子：世界第一野心、姐姐身份与对手恐惧、契约前的试探】',
  秦谷美铃: '初见即表现出超然物外的懒散态度，制作人通过调查理解其本质并提出培育。锚点是：茶道室的午睡、前优等生的伪装、选择“慢悠悠”的偶像道路、与制作人定下悠闲登顶的约定。',
  筱泽广: '制作人在走廊遇见摇摇晃晃的筱泽广——她当场倒下，被抬进保健室后醒来，直球要求「希望你能成为我的制作人」。制作人直言「你不适合做偶像」，她反而心情变好：冷冰冰的评价比学园长那句「以顶级偶像为目标」更对。她选偶像是因为「这可能是最不适合我的」；制作人暂且接下一个月试用。此刻她是HP1的天才少女，理论满、实操零，认真全力以赴，却随时可能再倒。【钩子：低评价=安心、试用合同的忐忑、最不适合反而开心】',
  十王星南: '制作人登门招揽这位『一等星·启明星』——学园顶点、学生会会长、前任 H.I.F 冠军。星南先以优雅从容的姿态拒绝：自认才能有限、毕业后要转做制作人、梦想是『培养出超越自己的偶像』，而非继续当偶像。制作人追问『对你而言顶级偶像是什么』，以『顶级偶像存在于每个人心中，应亲手实现』反驳，戳中她仍想再相信一次『偶像·十王星南』的心情。她最终同意签约一年，带着高位者的矜持与试探进入试用期——既观察制作人本事，又以『未来制作人候补』身份暗中学习。【钩子：顶点偶像与转制作人的拉锯、一年合约的赌约感、对制作人判断的好奇与距离感】',
  花海佑芽: '入学典礼迟到、混进人群的候补入学新生佑芽，凭直觉直球拜托制作人当担当——「如果是这个人，一定能成为我的力量」。她坦白唱歌、跳舞、学习、演讲可能都相当不行，却自称潜力股；说出以偶像为目标的唯一理由是「有想战胜的人」，从出生起在各种竞技里挑战对方无数次、一次也没赢过，那个人就在这所学校。制作人接下担当。【钩子：直觉信任、候补生的自卑与气势、想战胜「那个人」、请叫我佑芽】',
  仓本千奈: '仓本集团千金在宅邸接见制作人——对方坦白是校长受爷爷委托、报酬太多不好拒绝，并非发现才能。千奈崩溃于憧憬的「热情发掘」落空，却自曝入学考试倒数第一、仍要竭尽全力；制作人调查后否定走后门，指出她「讨人喜欢」才是偶像本质，并正式请求：即便没有仓本家委托与报酬，也请让我成为你的制作人。她含泪同意。【钩子：委托真相、倒数第一、讨人喜欢、抛开身份亲自选择】',
  葛城莉莉娅: '刚来日本的葛城莉莉娅在校园里迷路找不到礼拜室，拘谨地向制作人求助。她被好友清夏邀请「两个人一起做偶像」，最初没自信想拒绝，却在学园 Live 后萌生「我也想像那样闪耀」的愿望。她自认不灵巧也不可爱，却仍无法放下成为偶像的心。制作人点破偶像最重要的才能是踏向梦想的意志——说服双亲、赴日求学已是巨大勇气，随即请求成为她的制作人。【钩子：迷路初遇、清夏的约定、Live憧憬、前辈称呼、顶级偶像目标】',
  紫云清夏: '星探时清夏用「没干劲」「想偷懒」推开制作人，却把对方引向拼命跑步的莉莉娅；制作人却点名要她本人担当。她自称嘻嘻哈哈、随时会让制作人失望，仍答应先试试看，并给制作人起昵称「Pっち」。卡拉 OK 里她唱歌充满热情，游戏厅玩到尽兴——轻浮外壳下，其实很喜欢舞台与歌声。【钩子：Pっち称呼、推给莉莉娅却被选中、差不多该失望了吧、唱歌时的热情、试用期的玩笑】',
  有村麻央: '星探时麻央把制作人当成可疑人物扭住手臂，护着后辈却露出无需扮演的王子气场。她拒绝成为可爱偶像，坚持帅气王子型梦想；制作人调查过她的童星与歌剧憧憬后，她勉强答应听听条件。沙尘暴里她把伞借给后辈自己淋湿奔跑、公主抱扭伤后辈去医务室——初星学园的小王子，其实一直在保护别人。【钩子：格斗技误会、帅气王子条件、小王子借伞、公主抱后辈、调查过童星】',
  姬崎莉波: '制作人在走廊拦住三年级吊车尾的姬崎莉波——她惊喜于对方还记得童年夏天一起玩耍的自己，却立刻因年龄与地位改回敬语。她坦白一年级曾以「莉波噗哟」在组合里扮演妹妹偶像、因气质太成熟而零人气被除名，本打算毕业后放弃；制作人却保证要把她培养成 TOP IDOL，并抛出秘技：「请成为我的姐姐。」她害羞接受担当。【钩子：童年重逢、被除名的妹妹偶像、TOP IDOL 宣言、成为姐姐的训练】',
  雨夜燕: '制作人暗中调查这位『学园No.2』——她严管后辈、私下加练、嘴上永远挂着『超越星南』，却拒绝一切制作人邀约。正式登门时她一口回绝；制作人以『你不过是满足于第二名、从没真正赢过星南』激她，她暴怒之下反被勾起野心，撂下『半吊子方案就等着见血』签下担当。此刻她带着No.2的矜持与戒备进入试用期，既想验证制作人本事，又不肯承认自己需要谁。【钩子：签约当天的别扭、被耍还上钩的不甘、对制作人能力的暗中考察】',
});

export function listProduceIdols() {
  return Object.keys(PRODUCE_IDOL_PRESETS).filter((name) => PRODUCE_OPENING_SEEDS[name]);
}

export function produceOpeningSeen(state) {
  return Array.isArray(state?.flags?.bondSeen) && state.flags.bondSeen.some((id) => Number(id) === 1);
}

export function produceRunStarted(state) {
  if (state?.flags?.produceStarted === true) return true;
  if (state?.flags?.produceStarted === false) return false;
  if (produceOpeningSeen(state)) return true;
  if (Number(state?.day) > 1) return true;
  if (state?.dailyTimeline?.length || state?.history?.length || state?.chatHistory?.length || state?.dayMemories?.length || state?.eventArchive?.length) return true;
  return false;
}

export function markProduceOpeningSeen(state) {
  const seen = new Set((Array.isArray(state?.flags?.bondSeen) ? state.flags.bondSeen : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0));
  seen.add(1);
  return {
    ...state,
    flags: {
      ...(state?.flags || {}),
      produceStarted: true,
      bondSeen: [...seen],
    },
  };
}

export function produceOpeningContext(state) {
  if (!produceOpeningSeen(state)) return '';
  if ((state?.idolId || '藤田琴音') === '藤田琴音') return kotoneBondContext(state);
  const seed = PRODUCE_OPENING_SEEDS[state?.idolId];
  if (!seed) return '';
  return [
    '【已发生的担当开场】',
    '第1话《担当开场》已经发生。后续对话要承接这次初遇，不要再演一遍。',
    `剧情种子：${seed}`,
  ].join('\n');
}

export function buildProduceOpeningPrompt(state, { locationLabel = '' } = {}) {
  const idol = String(state?.idolId || '藤田琴音');
  if (idol === '藤田琴音') return buildKotoneBondEpisodePrompt(state, { locationLabel });
  const seed = PRODUCE_OPENING_SEEDS[idol] || '制作人选择她成为担当，她确认自己愿意开始育成。';
  return [
    '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
    `你正在写${idol}的担当开场第1话，不是日常闲聊。`,
    `担当偶像：${idol}。`,
    '本节点：制作人与担当偶像正式建立育成关系。选择担当后立即发生，停在育成正式开始，不推进日程，不改数值。',
    '剧情种子：',
    seed,
    '参考种子只提供矛盾结构，不要复述原句。一次写完，输出 20 个左右的 <beat> 标签，不少于 10 个，一般落在 16 到 24 个。不要输出 JSON、Markdown 或解释。',
    '开场地点按种子里的场合。background 写成那个地方的中文名加时段，例如校外街道-午。不要把初遇改成已经在上课。',
    beatStageHint(),
    `样例：<beat speaker="${idol}" cue="说话" face="高兴" look="camera" position="center" background="校外街道-午" shot="medium" camera="medium"><display lang="zh">中文</display><tts lang="ja">日语</tts></beat>`,
    'cue 只用这些中文：说话、吃惊、询问、疑问、思考、害羞、得意、干劲、点头、摇头、鞠躬。吃惊、害羞、得意、干劲、询问自带表情，不要再写 face。',
    'face 只在 cue="说话" 时使用：高兴、惊讶、害羞、困扰、自然、难过、生气。',
    '中文放在 <display lang="zh">，日语放在 <tts lang="ja">。',
    '不要写选项，不要在台词里改时间、Vo、Da、Vi、体力或压力。',
  ].join('\n');
}
