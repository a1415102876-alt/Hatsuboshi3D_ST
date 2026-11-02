const TAGS = Object.freeze(['stamina', 'syngup', 'diet', 'stage', 'general']);
const CHOICE_TIERS = Object.freeze(['pass_low', 'pass', 'perfect', 'fail']);
const DURATION = 120;

const TIER_META = Object.freeze({
  fail: Object.freeze({ label: '失败', hint: '场面失控，仍有最低安慰奖' }),
  pass_low: Object.freeze({ label: '勉强', hint: '勉强过关，表现平平' }),
  pass: Object.freeze({ label: '完成', hint: '标准完成委托' }),
  perfect: Object.freeze({ label: '完美', hint: '超常发挥' }),
});

const TIER_REWARDS = Object.freeze({
  fail: Object.freeze({ money: 80, fame: 1, Vo: 0, Da: 0, Vi: 0, stamina: 2, stress: 1, trust: 1 }),
  pass_low: Object.freeze({ money: 150, fame: 3, Vo: 1, Da: 1, Vi: 1, stamina: 4, stress: 0, trust: 3 }),
  pass: Object.freeze({ money: 280, fame: 6, Vo: 2, Da: 2, Vi: 2, stamina: 6, stress: -2, trust: 5 }),
  perfect: Object.freeze({ money: 450, fame: 10, Vo: 4, Da: 4, Vi: 4, stamina: 10, stress: -3, trust: 8 }),
});

const TAG_LABELS = Object.freeze({
  stamina: '体能',
  syngup: '歌唱',
  diet: '饮食',
  stage: '舞台',
  general: '商演',
});

const LOCATIONS = Object.freeze({
  shopping_street: Object.freeze({ locationId: 'outing_shopping_street', locationName: '商店街' }),
  shopping_mall: Object.freeze({ locationId: 'outing_mall', locationName: '购物中心' }),
  local_radio: Object.freeze({ locationId: 'outing_radio', locationName: '地方电台' }),
  tv_station: Object.freeze({ locationId: 'outing_tv', locationName: '电视台' }),
  event_hall: Object.freeze({ locationId: 'outing_event_hall', locationName: '活动会场' }),
  music_festival: Object.freeze({ locationId: 'outing_festival', locationName: '音乐节会场' }),
  photo_studio: Object.freeze({ locationId: 'outing_studio', locationName: '摄影棚' }),
  brand_store: Object.freeze({ locationId: 'outing_flagship', locationName: '服装店' }),
});

const LOCATION_BY_ID = Object.freeze(Object.fromEntries(
  Object.values(LOCATIONS).map((place) => [place.locationId, place]),
));

const FORBIDDEN_RULES = `禁止写成以下类型（这不是委托系统内容）：
- 制作人私自安排的训练课表、加练、体能作业、发声作业、日程表整理
- 校园内自习、教室练习、陪跑、食堂配餐、休息监督、广播复盘作业
- 主线任务、物色、签约、日常培育流水账
每条委托必须有明确外部主办方（商场、电台、品牌、节目组、活动执行方等）与对外演出/宣传目标。`;

const POOL = Object.freeze([
  Object.freeze({ id: 'shopping_street_warmup', title: '商业街舞台暖场', desc: '接受街区商会邀约，在周末客流前完成两首暖场曲与简短问候。', tag: 'stage', minFame: 0, maxFame: 24 }),
  Object.freeze({ id: 'station_plaza_greeting', title: '车站广场快闪问候', desc: '配合交通广场活动方完成十五分钟快闪演出，并派发学园公演传单。', tag: 'general', minFame: 0, maxFame: 24 }),
  Object.freeze({ id: 'mall_mini_live', title: '商场中庭迷你舞台', desc: '接受近邻商场邀请，在周末客流前完成两首短曲和合影问候。', tag: 'stage', minFame: 0, maxFame: 39 }),
  Object.freeze({ id: 'shopping_street_opening', title: '商店街开幕站台', desc: '为新开甜品店做简短站台，负责开场问候和拍照宣传。', tag: 'general', minFame: 0, maxFame: 39 }),
  Object.freeze({ id: 'local_radio_guest', title: '地方电台短访谈', desc: '到社区电台录制十分钟访谈，介绍近期舞台并清唱一句副歌。', tag: 'syngup', minFame: 0, maxFame: 39 }),
  Object.freeze({ id: 'festival_booth_call', title: '街区节庆摊位招呼', desc: '为临时节庆摊位吸引客流，完成简短口播、拍立得和舞台预告。', tag: 'general', minFame: 0, maxFame: 39 }),
  Object.freeze({ id: 'karaoke_trial', title: '卡拉 OK 店试唱企划', desc: '为合作门店录制试唱片段，检验麦克适配并留下宣传素材。', tag: 'syngup', minFame: 0, maxFame: 39 }),
  Object.freeze({ id: 'street_food_tasting', title: '商店街食祭试吃站台', desc: '为街区食祭合作摊位站台，完成试吃推荐、口播与路人合影环节。', tag: 'diet', minFame: 0, maxFame: 24 }),
  Object.freeze({ id: 'bookstore_talk', title: '书店小型谈话会', desc: '配合杂志角活动进行十五分钟谈话，分享最近舞台与下一场公演预告。', tag: 'stage', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'boutique_window', title: '精品店橱窗拍摄', desc: '为小型服装店拍摄橱窗宣传照，完成品牌方要求的站姿与表情展示。', tag: 'stage', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'sports_shop_demo', title: '运动品牌体验站台', desc: '在运动用品店完成节奏展示企划，把舞台动作包装成可观看商业演示。', tag: 'stamina', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'cafe_menu_promo', title: '咖啡店品牌代言日', desc: '为合作咖啡店拍摄轻食宣传照，在店内完成试饮推荐与粉丝合影环节。', tag: 'diet', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'deli_lunch_report', title: '便当品牌试吃站台', desc: '试吃合作便当店的新菜单，录制面向路人的健康轻食推荐短评。', tag: 'diet', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'mall_weekend_stage', title: '购物中心周末主舞台', desc: '在区域商场周末活动担任主舞台嘉宾，完成固定曲目与主持人互动。', tag: 'stage', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'culture_festival_guest', title: '社区文化节嘉宾席', desc: '受邀出席街区文化节，完成开幕问候、舞台演出与赞助商鸣谢。', tag: 'general', minFame: 15, maxFame: 69 }),
  Object.freeze({ id: 'tv_music_corner', title: '地方电视台音乐角', desc: '录制地方电视台音乐栏目短出演，完成一首曲目与主持人快问快答。', tag: 'syngup', minFame: 40, maxFame: 999 }),
  Object.freeze({ id: 'livestream_brand_slot', title: '品牌直播站台专场', desc: '出席合作品牌直播专场，完成产品站台、舞台展示与线上互动环节。', tag: 'general', minFame: 40, maxFame: 999 }),
  Object.freeze({ id: 'magazine_shoot_event', title: '时尚杂志拍摄活动', desc: '参加杂志方线下拍摄活动，完成造型展示、快访与签名合影流程。', tag: 'stage', minFame: 40, maxFame: 999 }),
  Object.freeze({ id: 'brand_launch_warmup', title: '品牌发布会暖场', desc: '在品牌新品发布会担任暖场嘉宾，完成舞台演出与发布会主持衔接。', tag: 'general', minFame: 40, maxFame: 999 }),
  Object.freeze({ id: 'variety_guest_slot', title: '综艺节目嘉宾出演', desc: '受邀录制人气综艺的偶像嘉宾环节，完成游戏挑战与舞台展示。', tag: 'stage', minFame: 70, maxFame: 999 }),
  Object.freeze({ id: 'national_chain_stage', title: '全国连锁冠名站台', desc: '在全国连锁品牌巡演站台担任表演嘉宾，完成品牌曲目与观众互动。', tag: 'general', minFame: 70, maxFame: 999 }),
  Object.freeze({ id: 'music_festival_guest', title: '大型音乐节嘉宾席', desc: '登上城市音乐节副舞台，在主办方安排下完成正式商演时段。', tag: 'syngup', minFame: 70, maxFame: 999 }),
  Object.freeze({ id: 'tv_variety_music_show', title: '电视音乐综艺录制', desc: '参与电视音乐综艺录制，完成正式舞台表演与节目流程彩排。', tag: 'stage', minFame: 70, maxFame: 999 }),
]);

const SCENE_FALLBACK_OPTIONS = Object.freeze([
  '先按主办方原来的流程，把这一段稳稳做完。',
  '照约定的环节做完，再补上该有的问候。',
  '在原计划上多留一段和现场观众的互动。',
  '临时把表现再推高一档，赌这一次能被记住。',
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function clean(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function hashString(str) {
  let hash = 2166136261;
  const source = String(str || '');
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededSortKey(seed, index) {
  const value = Math.sin(seed + index * 9301 + 49297) * 233280;
  return value - Math.floor(value);
}

function normalizeTag(raw) {
  const tag = String(raw || '').trim().toLowerCase();
  return TAGS.includes(tag) ? tag : 'general';
}

export function commissionTagLabel(tag) {
  return TAG_LABELS[tag] || '商演';
}

export function commissionTierLabel(tier) {
  return TIER_META[tier]?.label || '完成';
}

export function commissionFameTier(fame) {
  const value = Math.max(0, Number(fame) || 0);
  if (value >= 70) {
    return { id: 'prime', label: '头部商业档期', fame: value, scale: '地上波综艺节目、全国连锁品牌站台、大型音乐节嘉宾席等专业商业档期', examples: '综艺录制出演、冠名商演、电视台音乐节目嘉宾、品牌全国巡演站台' };
  }
  if (value >= 40) {
    return { id: 'media', label: '媒体露出档期', fame: value, scale: '地方电视台栏目、网络直播企划、杂志拍摄、品牌发布活动等有排面的商业露出', examples: '音乐节目短出演、直播带货站台、时尚杂志拍摄、品牌发布会暖场' };
  }
  if (value >= 15) {
    return { id: 'regional', label: '区域正式商演', fame: value, scale: '购物中心、连锁门店、社区文化节等正式对外商演与宣传邀约', examples: '商场周末舞台、连锁咖啡店代言日、地方文化节主舞台、书店签售谈话会' };
  }
  return { id: 'street', label: '街区商演出道期', fame: value, scale: '学园周边、商店街、车站广场等低门槛小型商演与宣传邀约', examples: '商业街舞台暖场、站前快闪、商场中庭迷你演出、店铺开业站台' };
}

export function resolveCommissionLocation(quest = {}, fame = 0) {
  const rawId = String(quest.locationId || '').trim();
  if (LOCATIONS[rawId]) return { ...LOCATIONS[rawId] };
  if (LOCATION_BY_ID[rawId]) return { ...LOCATION_BY_ID[rawId] };
  const title = `${quest.title || ''} ${quest.desc || ''}`;
  if (/综艺|电视台|电视|录制/.test(title)) return { ...LOCATIONS.tv_station };
  if (/音乐节|大型户外|副舞台/.test(title)) return { ...LOCATIONS.music_festival };
  if (/摄影|杂志|拍摄|视觉|橱窗/.test(title)) return { ...LOCATIONS.photo_studio };
  if (/直播|品牌|旗舰|连锁|发布会|代言/.test(title)) return { ...(Number(fame) >= 40 ? LOCATIONS.brand_store : LOCATIONS.shopping_mall) };
  if (/电台|广播|访谈/.test(title)) return { ...LOCATIONS.local_radio };
  if (/商场|购物中心|中庭/.test(title)) return { ...LOCATIONS.shopping_mall };
  if (/会场|文化节|活动方|嘉宾席/.test(title)) return { ...LOCATIONS.event_hall };
  if (/商店街|街区|车站|广场|摊位|食祭|开业|卡拉/.test(title)) return { ...LOCATIONS.shopping_street };
  if (Number(fame) >= 70) return { ...LOCATIONS.tv_station };
  if (Number(fame) >= 40) return { ...LOCATIONS.brand_store };
  if (Number(fame) >= 15) return { ...LOCATIONS.shopping_mall };
  return { ...LOCATIONS.shopping_street };
}

function filterPool(fame) {
  const value = Math.max(0, Number(fame) || 0);
  const eligible = POOL.filter((quest) => value >= quest.minFame && value <= quest.maxFame);
  if (eligible.length >= 3) return eligible;
  return POOL.filter((quest) => value >= quest.minFame);
}

export function pickCommissionPool(day, idolName, fame = 0, count = 3) {
  const seed = hashString(`${day}|${idolName || ''}|${fame}`);
  const ranked = filterPool(fame)
    .map((quest, index) => ({ quest, sort: seededSortKey(seed, index) }))
    .sort((left, right) => left.sort - right.sort);
  const selected = ranked.slice(0, count).map((entry) => entry.quest);
  if (count >= 3 && !selected.some((quest) => quest.tag === 'diet')) {
    const dietQuest = ranked.find((entry) => entry.quest.tag === 'diet' && !selected.includes(entry.quest))?.quest;
    if (dietQuest) selected[selected.length - 1] = dietQuest;
  }
  return selected.map((quest, slotIndex) => slotFromQuest(quest, slotIndex, fame, 'static'));
}

function slotFromQuest(quest, slotIndex, fame, source) {
  const place = resolveCommissionLocation(quest, fame);
  return {
    slotIndex,
    poolId: String(quest.id || quest.poolId || `pool_${slotIndex}`),
    title: clean(quest.title, 40),
    desc: clean(quest.desc, 160),
    tag: normalizeTag(quest.tag),
    locationId: place.locationId,
    locationName: place.locationName,
    status: 'open',
    resultTier: '',
    scenePlayed: false,
    source,
  };
}

function emptyPending() {
  return null;
}

export function emptyCommissionBoard(day = 1) {
  return {
    day: Math.max(1, Math.round(Number(day) || 1)),
    source: '',
    activeSlotIndex: null,
    slots: [],
    pending: emptyPending(),
  };
}

function normalizeSlot(raw, index, fame) {
  const title = clean(raw?.title, 40);
  const desc = clean(raw?.desc, 160);
  if (!title || !desc) return null;
  const place = resolveCommissionLocation({ ...raw, title, desc }, fame);
  const tier = String(raw?.resultTier || '');
  return {
    slotIndex: index,
    poolId: clean(raw?.poolId, 80) || `slot_${index}`,
    title,
    desc,
    tag: normalizeTag(raw?.tag),
    locationId: place.locationId,
    locationName: place.locationName,
    status: raw?.status === 'done' ? 'done' : 'open',
    resultTier: TIER_META[tier] ? tier : '',
    scenePlayed: raw?.scenePlayed === true,
    source: raw?.source === 'ai' ? 'ai' : 'static',
  };
}

export function normalizeCommissionBoard(raw, day = 1, fame = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const boardDay = Math.max(1, Math.round(Number(source.day) || day || 1));
  const slots = (Array.isArray(source.slots) ? source.slots : [])
    .slice(0, 3)
    .map((slot, index) => normalizeSlot(slot, index, fame))
    .filter(Boolean)
    .map((slot, index) => ({ ...slot, slotIndex: index }));
  let activeSlotIndex = Number.isInteger(source.activeSlotIndex) ? source.activeSlotIndex : null;
  if (activeSlotIndex != null && (!slots[activeSlotIndex] || slots[activeSlotIndex].status === 'done')) activeSlotIndex = null;
  const pendingIndex = Number(source.pending?.slotIndex);
  const options = Array.isArray(source.pending?.options) ? source.pending.options.map((item) => clean(item, 80)).filter(Boolean).slice(0, 4) : [];
  const pending = options.length === 4 && slots[pendingIndex]?.status === 'open'
    ? { slotIndex: pendingIndex, options }
    : null;
  return {
    day: boardDay,
    source: source.source === 'ai' ? 'ai' : (slots.length ? 'static' : ''),
    activeSlotIndex,
    slots,
    pending,
  };
}

export function commissionsNeedPlan(board, day) {
  const normalized = normalizeCommissionBoard(board, day);
  return normalized.day !== Number(day) || normalized.slots.length < 3;
}

export function buildCommissionPlanPrompt({ idolName = '担当偶像', day = 1, fame = 0 } = {}) {
  const tier = commissionFameTier(fame);
  return `[初星育成系统 · 委托系统生成]

你是初星学园沙盒模式的委托系统编排器。为制作人担当登记今日 3 条「对外商业委托」摘要（小型商演、宣传活动、媒体露出、品牌站台等）。

担当偶像：${idolName}
当前日期：学园第 ${day} 天
当前知名度：${tier.fame}（档位：${tier.label}）
本档委托规模：${tier.scale}
参考形态：${tier.examples}

委托必须是外部主办方正式邀约的商业活动，用来提高偶像知名度；不是制作人私下安排的培育作业。

${FORBIDDEN_RULES}

要求：
- 共 3 条，每条包含 title（8～18 字）、desc（20～60 字情境）、tag
- 每条 desc 必须写清主办方/场地与对外演出内容（如商场、电台、品牌、节目组、活动执行方）
- 每条可附 locationId，只能从 shopping_street / shopping_mall / local_radio / tv_station / event_hall / music_festival / photo_studio / brand_store 中选择
- tag 只能从 stamina、syngup、diet、stage、general 中选择
- 三条 tag 尽量不同；不要重复同一活动类型
- 委托档次须匹配当前知名度档位
- 不要写金钱、知名度、Vo/Da/Vi 等具体数值；奖励由前端结算
- 不要写选项或剧情正文，只写委托标题与情境

输出格式（严格遵守）：
【初星支线开始】
{"quests":[{"title":"标题","desc":"描述","tag":"stage","locationId":"shopping_mall"},{"title":"...","desc":"...","tag":"syngup","locationId":"local_radio"},{"title":"...","desc":"...","tag":"general","locationId":"shopping_street"}]}
【初星支线结束】`;
}

function parseJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseCommissionBoard(text, { day = 1, idolName = '', fame = 0 } = {}) {
  const source = String(text || '');
  const block = source.match(/【初星支线开始】([\s\S]*?)【初星支线结束】/i);
  const payload = parseJsonObject(block ? block[1] : source);
  const parsed = Array.isArray(payload?.quests) ? payload.quests : [];
  const slots = [];
  parsed.forEach((quest) => {
    if (slots.length >= 3) return;
    const slot = slotFromQuest({ ...quest, id: `gen_${day}_${slots.length}` }, slots.length, fame, 'ai');
    if (!slot.title || !slot.desc) return;
    if (slots.some((item) => item.title === slot.title)) return;
    slots.push(slot);
  });
  if (!slots.length) return null;
  if (slots.length < 3) {
    pickCommissionPool(day, idolName, fame, 3).forEach((filler) => {
      if (slots.length >= 3) return;
      if (slots.some((item) => item.title === filler.title)) return;
      slots.push({ ...filler, slotIndex: slots.length, source: 'static' });
    });
  }
  return normalizeCommissionBoard({ day, source: 'ai', slots }, day, fame);
}

export function commissionBoardFromPool({ day = 1, idolName = '', fame = 0 } = {}) {
  return normalizeCommissionBoard({
    day,
    source: 'static',
    slots: pickCommissionPool(day, idolName, fame, 3),
  }, day, fame);
}

export function setActiveCommission(board, slotIndex, fame = 0) {
  const next = normalizeCommissionBoard(board, board?.day, fame);
  const index = Number(slotIndex);
  const slot = next.slots[index];
  if (!slot || slot.status === 'done') return { ok: false, board: next, reason: 'unavailable' };
  next.activeSlotIndex = index;
  if (next.pending && next.pending.slotIndex !== index) next.pending = null;
  return { ok: true, board: next, slot: { ...slot, slotIndex: index } };
}

export function activeCommissionAt(board, locationId) {
  const next = normalizeCommissionBoard(board, board?.day);
  if (next.activeSlotIndex == null) return null;
  const slot = next.slots[next.activeSlotIndex];
  if (!slot || slot.status === 'done') return null;
  return slot.locationId === String(locationId || '') ? { ...slot } : null;
}

export function tierForCommissionChoice(index) {
  return CHOICE_TIERS[Number(index)] || 'pass';
}

export function commissionChoiceForText(board, text) {
  const next = normalizeCommissionBoard(board, board?.day);
  const line = clean(text, 80);
  if (!next.pending || !line) return null;
  const index = next.pending.options.indexOf(line);
  if (index < 0) return null;
  return { slotIndex: next.pending.slotIndex, tier: tierForCommissionChoice(index), text: line };
}

export function rememberCommissionScene(board, slotIndex, options) {
  const next = normalizeCommissionBoard(board, board?.day);
  const index = Number(slotIndex);
  const slot = next.slots[index];
  const lines = (Array.isArray(options) ? options : []).map((item) => clean(item, 80)).filter(Boolean).slice(0, 4);
  if (!slot || slot.status === 'done' || lines.length !== 4) return { ok: false, board: next };
  slot.scenePlayed = true;
  next.activeSlotIndex = index;
  next.pending = { slotIndex: index, options: lines };
  return { ok: true, board: next, options: lines };
}

export function formatCommissionReward(tier) {
  const reward = TIER_REWARDS[tier];
  if (!reward) return '';
  const parts = [`${reward.money} 初星币`];
  if (reward.Vo) parts.push(`Vo+${reward.Vo}`);
  if (reward.Da) parts.push(`Da+${reward.Da}`);
  if (reward.Vi) parts.push(`Vi+${reward.Vi}`);
  if (reward.fame) parts.push(`知名度+${reward.fame}`);
  if (reward.stamina) parts.push(`体力+${reward.stamina}`);
  if (reward.stress) parts.push(`压力${reward.stress > 0 ? '+' : ''}${reward.stress}`);
  if (reward.trust) parts.push(`信赖+${reward.trust}`);
  return parts.join(' · ');
}

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildCommissionScenePrompt({ idolName, day, clockLabel, slot, locationLabel, locationDescription }) {
  return `[初星育成系统：沙盒模式 · 委托现场]

担当偶像：${idolName}
当前时间：第 ${day} 日 ${clockLabel || ''}
委托地点：${locationLabel || slot?.locationName || '委托地点'}
地点说明：${locationDescription || '对外商业活动现场。'}
委托标题：${slot?.title || '今日委托'}
委托类型：${commissionTagLabel(slot?.tag)}
委托说明：${slot?.desc || ''}

请写制作人与担当偶像抵达现场、正式开始执行该商业委托的开场。
- 这是外部商业委托现场，不是训练、课表或校园日常。
- 需要出现主办方、工作人员、观众或品牌方等外部现场压力。
- 先写 2 到 4 个 <beat>。每个 beat 都有 speaker、display 和 tts。担当说中文 display 与日文 tts，制作人的 tts 留空。
- beat 后面输出一个 <choice>，里面正好 4 个 <option>。
- 选项是制作人第一人称的现场行动，按顺序对应：保守补救、稳健执行、主动加码、冒险处理。
- 选项不要写失败、勉强、完成、完美这些档位词。
- 不要在本轮写委托结果、数值或结算。`;
}

export function buildCommissionSceneFallback(slot, idolName = '藤田琴音') {
  const speaker = idolName === '藤田琴音' ? 'kotone' : idolName;
  const place = slot?.locationName || '委托地点';
  const title = slot?.title || '今天的委托';
  const beats = [
    `<beat id="commission-open-1" speaker="${escapeXml(speaker)}" cue="talk" face="neutral" look="camera" position="center" shot="medium" wait="text"><display lang="zh">主办方已经在${escapeXml(place)}等着了。${escapeXml(title)}，就从这里开始。</display><tts lang="ja">現場はもう始まっている。</tts></beat>`,
    '<beat id="commission-open-2" speaker="制作人" cue="talk" face="neutral" look="camera" position="center" shot="medium" wait="text"><display lang="zh">我在。这一段按现场的情况来处理。</display><tts lang="ja"></tts></beat>',
  ];
  const choice = `<choice>${SCENE_FALLBACK_OPTIONS.map((option) => `<option>${escapeXml(option)}</option>`).join('')}</choice>`;
  return { script: beats.join(''), options: [...SCENE_FALLBACK_OPTIONS], source: `${beats.join('')}${choice}` };
}

export function buildCommissionResultPrompt({ idolName, day, clockLabel, slot, tier, choiceText }) {
  const label = commissionTierLabel(tier);
  return `[初星育成系统：沙盒模式 · 委托收尾]

担当偶像：${idolName}
当前时间：第 ${day} 日 ${clockLabel || ''}
委托标题：${slot?.title || '今日委托'}
委托地点：${slot?.locationName || '委托地点'}
委托说明：${slot?.desc || ''}
制作人的现场选择：${choiceText || ''}
前端结算档位：${label}

前端已经完成奖励结算。请只写 2 到 4 个 <beat>，写委托现场的收尾。
- 不要写数值、金钱、知名度或系统结算。
- 不要再输出 choice 或 option。
- 按「${label}」自然表现现场效果，不要把档位词原样复述。
- 每个 beat 都有 speaker、display 和 tts。担当说中文 display 与日文 tts，制作人的 tts 留空。`;
}

export function buildCommissionResultFallback(slot, tier, idolName = '藤田琴音') {
  const speaker = idolName === '藤田琴音' ? 'kotone' : idolName;
  const title = slot?.title || '这份委托';
  const line = tier === 'fail'
    ? '场面有点乱，不过还是把该交给主办方的部分交出去了。'
    : tier === 'perfect'
      ? '这一段比约定的还要亮。她回头看向制作人，呼吸还没完全平下来。'
      : '约定的环节做完了。现场的人开始收拾，她也终于能喘一口气。';
  return [
    `<beat id="commission-result-1" speaker="${escapeXml(speaker)}" cue="talk" face="neutral" look="camera" position="center" shot="medium" wait="text"><display lang="zh">${escapeXml(title)}。${escapeXml(line)}</display><tts lang="ja">ここまで来られた。</tts></beat>`,
    '<beat id="commission-result-2" speaker="制作人" cue="talk" face="neutral" look="camera" position="center" shot="medium" wait="text"><display lang="zh">今天就到这里。回去再整理。</display><tts lang="ja"></tts></beat>',
  ].join('');
}

export function settleCommission(state, slotIndex, tier) {
  const reward = TIER_REWARDS[tier];
  if (!reward) return { ok: false, reason: 'invalid_tier', state };
  const next = JSON.parse(JSON.stringify(state || {}));
  const fame = Number(next.wallet?.fame) || 0;
  next.commissions = normalizeCommissionBoard(next.commissions, next.day, fame);
  const index = Number(slotIndex);
  const slot = next.commissions.slots[index];
  if (!slot) return { ok: false, reason: 'missing_slot', state };
  if (slot.status === 'done') return { ok: false, reason: 'slot_done', state };
  next.wallet = next.wallet || { coins: 0, fame: 0 };
  next.stats = next.stats || {};
  next.wallet.coins = Math.max(0, Math.round(Number(next.wallet.coins) || 0) + reward.money);
  next.wallet.fame = Math.max(0, Math.round(Number(next.wallet.fame) || 0) + reward.fame);
  next.stats.Vo = Math.max(0, Math.round(Number(next.stats.Vo) || 0) + reward.Vo);
  next.stats.Da = Math.max(0, Math.round(Number(next.stats.Da) || 0) + reward.Da);
  next.stats.Vi = Math.max(0, Math.round(Number(next.stats.Vi) || 0) + reward.Vi);
  next.stats.stamina = clamp((Number(next.stats.stamina) || 0) + reward.stamina, 0, 100);
  next.stats.stress = clamp((Number(next.stats.stress) || 0) + reward.stress, 0, 100);
  next.stats.trust = clamp((Number(next.stats.trust) || 0) + reward.trust, 0, 100);
  const clock = Math.max(0, Math.round(Number(next.time?.clockMinutes) || 0));
  const end = Math.max(clock, Math.round(Number(next.time?.endMinutes) || 24 * 60));
  const today = clock + DURATION < end ? DURATION : Math.max(0, end - clock);
  const overflow = Math.max(0, clock + DURATION - end);
  if (today > 0) {
    next.dailyTimeline = Array.isArray(next.dailyTimeline) ? next.dailyTimeline : [];
    next.dailyTimeline.push({
      day: next.day,
      start: clock,
      duration: today,
      end: clock + today,
      kind: 'commission',
      label: slot.title,
      idolId: next.idolId,
      locationId: slot.locationId,
      commissionId: slot.poolId,
      costs: {},
      rewards: {
        coins: reward.money,
        fame: reward.fame,
        Vo: reward.Vo,
        Da: reward.Da,
        Vi: reward.Vi,
        stamina: reward.stamina,
        stress: reward.stress,
        trust: reward.trust,
      },
    });
    next.time.clockMinutes = clock + today;
  }
  slot.status = 'done';
  slot.resultTier = tier;
  if (next.commissions.activeSlotIndex === index) next.commissions.activeSlotIndex = null;
  if (next.commissions.pending?.slotIndex === index) next.commissions.pending = null;
  next.suggestedActions = [];
  return {
    ok: true,
    state: next,
    slot: { ...slot },
    tier,
    reward: { ...reward },
    rolled: overflow > 0,
    overflow,
  };
}
