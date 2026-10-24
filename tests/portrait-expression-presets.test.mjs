import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

await import("../appearance/portrait-expression-presets.js");

const expressions = globalThis.HatsuPortraitExpressions;
const expectedPresets = new Map([
  ["认真投入", "confident_explanation.png"],
  ["冷静思考", "thoughtful_assessment.png"],
  ["被夸陶醉", "praise_delighted.png"],
  ["被夸慌张", "praise_flustered.png"],
  ["恳切请求", "earnest_plea.png"],
  ["正面挑战", "direct_challenge.png"],
  ["激动强调", "excited_emphasis.png"],
  ["不服审视", "defiant_assessment.png"],
  ["真诚表态", "sincere_declaration.png"],
  ["沮丧低落", "dejected.png"],
  ["平常待机", "neutral_standby.png"],
  ["意外动摇", "surprised_concern.png"],
  ["慌张解释", "flustered_explanation.png"],
  ["震惊失语", "shocked_speechless.png"],
  ["振奋宣言", "determined_rally.png"],
  ["得意大笑", "triumphant_laugh.png"],
  ["温柔喜悦", "gentle_joy.png"],
  ["凑近追问", "leaning_in_question.png"]
]);
const expectedKotonePresets = new Map([
  ["俏皮推销", "playful_sales_pitch.png"],
  ["委屈求饶", "flustered_plea.png"],
  ["黑脸无语", "bright_confidence.png"],
  ["精明盘算", "thoughtful_calculation.png"],
  ["意外发愣", "startled_reaction.png"],
  ["平常待机", "neutral_standby.png"],
  ["认真审视", "serious_assessment.png"],
  ["诚恳请求", "earnest_appeal.png"],
  ["害羞躲闪", "shy_hiding.png"],
  ["灿烂欢呼", "delighted_cheer.png"],
  ["得意吐槽", "smug_teasing.png"],
  ["振奋宣言", "energetic_declaration.png"],
  ["沮丧低落", "dejected.png"],
  ["真诚表态", "sincere_statement.png"],
  ["委屈忍耐", "hurt_endurance.png"],
  ["含泪抗议", "tearful_protest.png"],
  ["生气抗议", "angry_protest.png"],
  ["温柔喜悦", "gentle_joy.png"]
]);
const expectedUmePresets = new Map([
  ["真诚说明", "sincere_explanation.png"],
  ["惊讶解释", "surprised_explanation.png"],
  ["羞涩待机", "bashful_standby.png"],
  ["轻微不满", "mildly_annoyed.png"],
  ["尴尬困惑", "awkward_confusion.png"],
  ["温柔好奇", "gentle_curiosity.png"],
  ["俏皮提问", "playful_question.png"],
  ["恳切请求", "earnest_plea.png"],
  ["自信站姿", "confident_stance.png"],
  ["严肃追问", "stern_question.png"],
  ["振奋宣言", "determined_rally.png"],
  ["认真思考", "thoughtful_assessment.png"],
  ["温柔喜悦", "gentle_joy.png"],
  ["开朗挥手", "cheerful_wave.png"],
  ["害羞微笑", "bashful_smile.png"],
  ["不安询问", "anxious_question.png"],
  ["羞恼抗议", "bashful_anger.png"],
  ["沮丧低落", "dejected.png"],
  ["慌张不安", "flustered_anxiety.png"],
  ["得意欢呼", "triumphant_cheer.png"],
  ["凑近问候", "leaning_greeting.png"],
  ["温暖问候", "warm_greeting.png"],
  ["倾慕陶醉", "lovestruck_admiration.png"],
  ["沉思怀疑", "pensive_doubt.png"]
]);
const expectedHiroPresets = new Map([
  ["平常待机", "neutral_standby.png"],
  ["平静说明", "calm_explanation.png"],
  ["冷静思考", "thoughtful_assessment.png"],
  ["出神侧目", "distant_gaze.png"],
  ["浅淡微笑", "soft_smile.png"],
  ["捂脸害羞", "bashful_blush.png"],
  ["窘迫躲闪", "shy_aversion.png"],
  ["真诚表态", "sincere_declaration.png"],
  ["虚脱乏力", "exhausted.png"],
  ["意外动摇", "surprised_concern.png"],
  ["困惑发问", "puzzled_inquiry.png"],
  ["沉思顾虑", "pensive_concern.png"],
  ["安静自信", "quiet_confidence.png"],
  ["温柔喜悦", "gentle_joy.png"],
  ["好奇询问", "curious_question.png"],
  ["怔住触动", "touched_reaction.png"],
  ["愿望浅笑", "wishful_smile.png"],
  ["前倾关心", "caring_lean.png"]
]);
const expectedMisuzuPresets = new Map([
  ["认真投入", "confident_explanation.png"],
  ["冷静判断", "thoughtful_assessment.png"],
  ["开心庆幸", "pleased_relief.png"],
  ["含泪动摇", "tearful_waver.png"],
  ["震惊", "astonished.png"],
  ["午睡", "sleeping_nap.png"],
  ["沮丧", "dejected.png"],
  ["思考", "thoughtful.png"],
  ["平静生气", "calm_anger.png"],
  ["平静说明", "calm_explanation.png"],
  ["生气", "mild_anger.png"],
  ["震惊难受", "shocked_hurt.png"],
  ["平常待机", "neutral_standby.png"],
  ["闹别扭", "sulking.png"],
  ["惊讶害羞", "surprised_shy.png"],
  ["独占欲", "angry_question.png"],
  ["戏谑亲昵", "teasing_affection.png"],
  ["意味深长微笑", "meaningful_smile.png"],
  ["坚定决意", "determined_rally.png"],
  ["温柔喜悦", "gentle_joy.png"]
]);

test("all canonical Saki visual tags resolve to existing preset assets", () => {
  assert.ok(expressions);
  assert.deepEqual(expressions.SAKI_VISUAL_TAGS, [...expectedPresets.keys()]);
  for (const [tag, fileName] of expectedPresets) {
    const parsed = expressions.parseSpeakerVisualCue(`花海咲季(${tag})`);
    assert.equal(parsed.speaker, "花海咲季");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Saki_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("speaker visual cue accepts full-width parentheses", () => {
  const parsed = expressions.parseSpeakerVisualCue("花海咲季（被夸慌张）");
  assert.equal(parsed.speaker, "花海咲季");
  assert.equal(parsed.visualTag, "被夸慌张");
  assert.equal(parsed.fileName, "praise_flustered.png");
});

test("all canonical Misuzu visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.MISUZU_VISUAL_TAGS, [...expectedMisuzuPresets.keys()]);
  for (const [tag, fileName] of expectedMisuzuPresets) {
    const parsed = expressions.parseSpeakerVisualCue(`秦谷美铃(${tag})`);
    assert.equal(parsed.speaker, "秦谷美铃");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Misuzu_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Misuzu_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("all canonical Kotone visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.KOTONE_VISUAL_TAGS, [...expectedKotonePresets.keys()]);
  for (const [tag, fileName] of expectedKotonePresets) {
    const parsed = expressions.parseSpeakerVisualCue(`藤田琴音(${tag})`);
    assert.equal(parsed.speaker, "藤田琴音");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Kotone_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Kotone_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("Kotone defaults to neutral standby and unknown tags fall back", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("藤田琴音"), "藤田琴音(平常待机)");
  const unknown = expressions.parseSpeakerVisualCue("藤田琴音(开心)");
  assert.equal(unknown.speaker, "藤田琴音");
  assert.equal(unknown.requestedTag, "开心");
  assert.equal(unknown.assetPath, "");
  assert.equal(unknown.matched, false);
});

test("legacy Kotone confidence tag resolves to the energetic declaration asset", () => {
  const parsed = expressions.parseSpeakerVisualCue("藤田琴音(开朗自信)");
  assert.equal(parsed.requestedTag, "开朗自信");
  assert.equal(parsed.visualTag, "振奋宣言");
  assert.equal(parsed.fileName, "energetic_declaration.png");
  assert.equal(parsed.matched, true);
});

test("all canonical Ume visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.UME_VISUAL_TAGS, [...expectedUmePresets.keys()]);
  for (const [tag, fileName] of expectedUmePresets) {
    const parsed = expressions.parseSpeakerVisualCue(`花海佑芽(${tag})`);
    assert.equal(parsed.speaker, "花海佑芽");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Ume_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Ume_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("Ume defaults to bashful standby and accepts full-width visual cues", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("花海佑芽"), "花海佑芽(羞涩待机)");
  const parsed = expressions.parseSpeakerVisualCue("花海佑芽（得意欢呼）");
  assert.equal(parsed.fileName, "triumphant_cheer.png");
  assert.equal(parsed.matched, true);
});

test("all canonical Hiro visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.HIRO_VISUAL_TAGS, [...expectedHiroPresets.keys()]);
  for (const [tag, fileName] of expectedHiroPresets) {
    const parsed = expressions.parseSpeakerVisualCue(`筱泽广(${tag})`);
    assert.equal(parsed.speaker, "筱泽广");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Hiro_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Hiro_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("Hiro defaults to neutral standby and accepts full-width visual cues", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("筱泽广"), "筱泽广(平常待机)");
  const parsed = expressions.parseSpeakerVisualCue("筱泽广（虚脱乏力）");
  assert.equal(parsed.fileName, "exhausted.png");
  assert.equal(parsed.matched, true);
  const unknown = expressions.parseSpeakerVisualCue("筱泽广(开心)");
  assert.equal(unknown.speaker, "筱泽广");
  assert.equal(unknown.requestedTag, "开心");
  assert.equal(unknown.assetPath, "");
  assert.equal(unknown.matched, false);
});

test("missing and unknown visual tags preserve the base speaker and fall back", () => {
  assert.deepEqual(
    expressions.parseSpeakerVisualCue("花海咲季"),
    { rawSpeaker: "花海咲季", speaker: "花海咲季", requestedTag: "", visualTag: "", fileName: "", assetPath: "", matched: false }
  );
  const unknown = expressions.parseSpeakerVisualCue("花海咲季(开心)");
  assert.equal(unknown.speaker, "花海咲季");
  assert.equal(unknown.requestedTag, "开心");
  assert.equal(unknown.assetPath, "");
  assert.equal(unknown.matched, false);
});

test("unregistered idols do not resolve expression presets", () => {
  const parsed = expressions.parseSpeakerVisualCue("月村手毬(被夸陶醉)");
  assert.equal(parsed.speaker, "月村手毬");
  assert.equal(parsed.assetPath, "");
  assert.equal(parsed.matched, false);
});

test("Saki live scenes start from the neutral standby preset", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("花海咲季"), "花海咲季(平常待机)");
  assert.equal(expressions.getDefaultSpeakerVisualCue("月村手毬"), "月村手毬");
});

test("expression preset module loads before app.js in direct and SillyTavern launches", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const loader = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("appearance/portrait-expression-presets.js") < html.indexOf("app.js"));
  assert.match(loader, /["']appearance\/portrait-expression-presets\.js["']/);
});
