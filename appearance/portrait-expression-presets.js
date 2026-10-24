(function (global) {
  "use strict";

  const SAKI_NAME = "花海咲季";
  const KOTONE_NAME = "藤田琴音";
  const UME_NAME = "花海佑芽";
  const HIRO_NAME = "筱泽广";
  const MISUZU_NAME = "秦谷美铃";
  const SAKI_PRESET_FILES = Object.freeze({
    "认真投入": "confident_explanation.png",
    "冷静思考": "thoughtful_assessment.png",
    "被夸陶醉": "praise_delighted.png",
    "被夸慌张": "praise_flustered.png",
    "恳切请求": "earnest_plea.png",
    "正面挑战": "direct_challenge.png",
    "激动强调": "excited_emphasis.png",
    "不服审视": "defiant_assessment.png",
    "真诚表态": "sincere_declaration.png",
    "沮丧低落": "dejected.png",
    "平常待机": "neutral_standby.png",
    "意外动摇": "surprised_concern.png",
    "慌张解释": "flustered_explanation.png",
    "震惊失语": "shocked_speechless.png",
    "振奋宣言": "determined_rally.png",
    "得意大笑": "triumphant_laugh.png",
    "温柔喜悦": "gentle_joy.png",
    "凑近追问": "leaning_in_question.png"
  });
  const KOTONE_PRESET_FILES = Object.freeze({
    "俏皮推销": "playful_sales_pitch.png",
    "委屈求饶": "flustered_plea.png",
    "黑脸无语": "bright_confidence.png",
    "精明盘算": "thoughtful_calculation.png",
    "意外发愣": "startled_reaction.png",
    "平常待机": "neutral_standby.png",
    "认真审视": "serious_assessment.png",
    "诚恳请求": "earnest_appeal.png",
    "害羞躲闪": "shy_hiding.png",
    "灿烂欢呼": "delighted_cheer.png",
    "得意吐槽": "smug_teasing.png",
    "振奋宣言": "energetic_declaration.png",
    "沮丧低落": "dejected.png",
    "真诚表态": "sincere_statement.png",
    "委屈忍耐": "hurt_endurance.png",
    "含泪抗议": "tearful_protest.png",
    "生气抗议": "angry_protest.png",
    "温柔喜悦": "gentle_joy.png"
  });
  const KOTONE_PRESET_ALIASES = Object.freeze({
    "开朗自信": "振奋宣言"
  });
  const UME_PRESET_FILES = Object.freeze({
    "真诚说明": "sincere_explanation.png",
    "惊讶解释": "surprised_explanation.png",
    "羞涩待机": "bashful_standby.png",
    "轻微不满": "mildly_annoyed.png",
    "尴尬困惑": "awkward_confusion.png",
    "温柔好奇": "gentle_curiosity.png",
    "俏皮提问": "playful_question.png",
    "恳切请求": "earnest_plea.png",
    "自信站姿": "confident_stance.png",
    "严肃追问": "stern_question.png",
    "振奋宣言": "determined_rally.png",
    "认真思考": "thoughtful_assessment.png",
    "温柔喜悦": "gentle_joy.png",
    "开朗挥手": "cheerful_wave.png",
    "害羞微笑": "bashful_smile.png",
    "不安询问": "anxious_question.png",
    "羞恼抗议": "bashful_anger.png",
    "沮丧低落": "dejected.png",
    "慌张不安": "flustered_anxiety.png",
    "得意欢呼": "triumphant_cheer.png",
    "凑近问候": "leaning_greeting.png",
    "温暖问候": "warm_greeting.png",
    "倾慕陶醉": "lovestruck_admiration.png",
    "沉思怀疑": "pensive_doubt.png"
  });
  const HIRO_PRESET_FILES = Object.freeze({
    "平常待机": "neutral_standby.png",
    "平静说明": "calm_explanation.png",
    "冷静思考": "thoughtful_assessment.png",
    "出神侧目": "distant_gaze.png",
    "浅淡微笑": "soft_smile.png",
    "捂脸害羞": "bashful_blush.png",
    "窘迫躲闪": "shy_aversion.png",
    "真诚表态": "sincere_declaration.png",
    "虚脱乏力": "exhausted.png",
    "意外动摇": "surprised_concern.png",
    "困惑发问": "puzzled_inquiry.png",
    "沉思顾虑": "pensive_concern.png",
    "安静自信": "quiet_confidence.png",
    "温柔喜悦": "gentle_joy.png",
    "好奇询问": "curious_question.png",
    "怔住触动": "touched_reaction.png",
    "愿望浅笑": "wishful_smile.png",
    "前倾关心": "caring_lean.png"
  });
  const MISUZU_PRESET_FILES = Object.freeze({
    "认真投入": "confident_explanation.png",
    "冷静判断": "thoughtful_assessment.png",
    "开心庆幸": "pleased_relief.png",
    "含泪动摇": "tearful_waver.png",
    "震惊": "astonished.png",
    "午睡": "sleeping_nap.png",
    "沮丧": "dejected.png",
    "思考": "thoughtful.png",
    "平静生气": "calm_anger.png",
    "平静说明": "calm_explanation.png",
    "生气": "mild_anger.png",
    "震惊难受": "shocked_hurt.png",
    "平常待机": "neutral_standby.png",
    "闹别扭": "sulking.png",
    "惊讶害羞": "surprised_shy.png",
    "独占欲": "angry_question.png",
    "戏谑亲昵": "teasing_affection.png",
    "意味深长微笑": "meaningful_smile.png",
    "坚定决意": "determined_rally.png",
    "温柔喜悦": "gentle_joy.png"
  });
  const MISUZU_PRESET_ALIASES = Object.freeze({
    "自信说明": "认真投入",
    "平静思考": "冷静判断",
    "恳切请求": "沮丧",
    "轻微生气": "生气",
    "独占娇嗔": "独占欲",
    "戏谑宠溺": "戏谑亲昵",
    "意味深长": "意味深长微笑",
    "振奋宣言": "坚定决意"
  });
  const SAKI_VISUAL_TAGS = Object.freeze(Object.keys(SAKI_PRESET_FILES));
  const KOTONE_VISUAL_TAGS = Object.freeze(Object.keys(KOTONE_PRESET_FILES));
  const UME_VISUAL_TAGS = Object.freeze(Object.keys(UME_PRESET_FILES));
  const HIRO_VISUAL_TAGS = Object.freeze(Object.keys(HIRO_PRESET_FILES));
  const MISUZU_VISUAL_TAGS = Object.freeze(Object.keys(MISUZU_PRESET_FILES));
  const CHARACTER_PRESETS = Object.freeze({
    [SAKI_NAME]: Object.freeze({
      assetDirectory: "Saki_Standees_Altered",
      defaultTag: "平常待机",
      files: SAKI_PRESET_FILES
    }),
    [KOTONE_NAME]: Object.freeze({
      assetDirectory: "Kotone_Standees_Altered",
      defaultTag: "平常待机",
      files: KOTONE_PRESET_FILES
    }),
    [UME_NAME]: Object.freeze({
      assetDirectory: "Ume_Standees_Altered",
      defaultTag: "羞涩待机",
      files: UME_PRESET_FILES
    }),
    [HIRO_NAME]: Object.freeze({
      assetDirectory: "Hiro_Standees_Altered",
      defaultTag: "平常待机",
      files: HIRO_PRESET_FILES
    }),
    [MISUZU_NAME]: Object.freeze({
      assetDirectory: "Misuzu_Standees_Altered",
      defaultTag: "平常待机",
      files: MISUZU_PRESET_FILES
    })
  });
  const VISUAL_SUFFIX = /^(.*?)\s*[（(]\s*([^()（）]+?)\s*[）)]\s*$/u;

  function parseSpeakerVisualCue(value) {
    const rawSpeaker = String(value || "").trim();
    const match = rawSpeaker.match(VISUAL_SUFFIX);
    const speaker = String(match?.[1] || rawSpeaker).trim();
    const requestedTag = String(match?.[2] || "").trim();
    const preset = CHARACTER_PRESETS[speaker];
    const canonicalTag = speaker === KOTONE_NAME
      ? String(KOTONE_PRESET_ALIASES[requestedTag] || requestedTag)
      : speaker === MISUZU_NAME
        ? String(MISUZU_PRESET_ALIASES[requestedTag] || requestedTag)
        : requestedTag;
    const fileName = String(preset?.files?.[canonicalTag] || "");
    return {
      rawSpeaker,
      speaker,
      requestedTag,
      visualTag: fileName ? canonicalTag : "",
      fileName,
      assetPath: fileName ? `./assets/novel-standees/${preset.assetDirectory}/${fileName}` : "",
      matched: Boolean(fileName)
    };
  }

  function getDefaultSpeakerVisualCue(value) {
    const speaker = String(value || "").trim();
    const preset = CHARACTER_PRESETS[speaker];
    return preset ? `${speaker}(${preset.defaultTag})` : speaker;
  }

  global.HatsuPortraitExpressions = Object.freeze({
    SAKI_VISUAL_TAGS,
    KOTONE_VISUAL_TAGS,
    UME_VISUAL_TAGS,
    HIRO_VISUAL_TAGS,
    MISUZU_VISUAL_TAGS,
    parseSpeakerVisualCue,
    getDefaultSpeakerVisualCue
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
