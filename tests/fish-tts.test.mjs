import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../fish-tts.js", import.meta.url), "utf8");
const context = { console, URL, setTimeout, clearTimeout, AbortController };
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "fish-tts.js" });
const api = context.HatsuFishTts;

test("Fish TTS uses the free default model and keeps a configurable proxy", () => {
  assert.equal(api.DEFAULT_MODEL, "s2.1-pro-free");
  assert.equal(api.getConfig().model, "s2.1-pro-free");
  assert.equal(api.getConfig().proxyUrl, `${api.DEFAULT_WORKER_ORIGIN}/api/fish-tts`);
});

test("Fish TTS does not make a request when no API key is configured", async () => {
  let fetchCalls = 0;
  context.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch should not be called without a key");
  };
  api.configure({ enabled: true, apiKey: "" });
  api.beginSession("no-key");
  const result = await api.enqueue({ id: "no-key", speaker: "藤田琴音", text: "テスト" });
  assert.equal(result, false);
  assert.equal(fetchCalls, 0);
  api.configure({ enabled: false });
});

test("Fish TTS parser keeps Chinese display text separate from Kotone Japanese text", () => {
  const parsed = api.parseLocalizedText(
    '<display lang="zh">中文显示</display><tts lang="ja">日本語 [soft] [pause] [not-allowed]</tts>',
    "藤田琴音(说话)"
  );
  assert.equal(parsed.display, "中文显示");
  assert.equal(parsed.ttsText, "日本語 [soft] [pause]");
});

test("Fish TTS sends romanized idol names through the pronunciation dictionary", async () => {
  const calls = [];
  context.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      headers: { get: () => "audio/mpeg" },
      blob: async () => ({ text: JSON.parse(init.body).text })
    };
  };
  api.configure({ enabled: true, apiKey: "test-key" });
  const session = api.beginSession("pronunciation-dictionary");
  const audio = await api.prepare({
    id: "dict-1",
    speaker: "紫云清夏",
    text: "shiun sumika、arimura mao、amaya tsubame",
    session
  });
  assert.equal(audio.blob.text, "shiun sumika、arimura mao、amaya tsubame");
  const items = calls[0].pronunciation_dictionary?.[0]?.items || [];
  assert.deepEqual(
    items.map((item) => [item.key, item.value]),
    [
      ["amaya tsubame", "a1ma0ya0tsu0ba1me1"],
      ["shiun sumika", "shi0u1N1su1mi0ka0"],
      ["arimura mao", "a1ri0mu0ra1ma0o1"]
    ]
  );
  api.cancel("test-end");
  api.configure({ enabled: false, apiKey: "" });
});

test("Fish TTS parser ignores TTS copies for other speakers", () => {
  const parsed = api.parseLocalizedText(
    '<display lang="zh">制作人说话</display><tts lang="ja">生成されない</tts>',
    "制作人"
  );
  assert.equal(parsed.display, "制作人说话");
  assert.equal(parsed.ttsText, "");
  assert.equal(api.isKotoneSpeaker("Kotone(cue)"), true);
  assert.equal(api.isKotoneSpeaker("花海咲季"), false);
});

test("Fish TTS requests each Kotone line separately and skips other speakers", async () => {
  const calls = [];
  context.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      headers: { get: () => "audio/mpeg" },
      blob: async () => ({ text: JSON.parse(init.body).text })
    };
  };
  context.URL.createObjectURL = () => "blob:fish";
  context.URL.revokeObjectURL = () => {};
  let played = null;
  context.Audio = class {
    constructor() { played = this; }
    set src(value) { this._src = value; }
    play() {
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  api.configure({ enabled: true, apiKey: "test-key" });
  const session = api.beginSession("scene-1");
  const first = api.prepare({ id: "b01", speaker: "藤田琴音", text: "おはよう", session, priority: 0 });
  const skipped = api.prepare({ id: "b02", speaker: "制作人", text: "おはよう", session, priority: 1 });
  const second = api.prepare({ id: "b03", speaker: "琴音", text: "ありがとう [nope]", session, priority: 2 });
  const [firstAudio, skippedAudio, secondAudio] = await Promise.all([first, skipped, second]);
  assert.equal(skippedAudio, null);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].reference_id, api.DEFAULT_REFERENCE_ID);
  assert.equal(calls[0].text, "おはよう");
  assert.equal(calls[1].text, "ありがとう");
  assert.equal(firstAudio.id, "b01");
  assert.equal(secondAudio.blob.text, "ありがとう");
  const replay = await api.prepare({ id: "b01", speaker: "藤田琴音", text: "おはよう", session });
  assert.equal(replay, firstAudio);
  assert.equal(calls.length, 2);
  let playbackAudio = null;
  let playbackEnded = false;
  const playedOk = await api.playPrepared({
    id: "b01",
    speaker: "藤田琴音",
    text: "おはよう",
    session,
    isCurrent: () => true,
    onAudio: (audio) => { playbackAudio = audio; },
    onPlaybackEnd: () => { playbackEnded = true; }
  });
  assert.equal(playedOk, true);
  assert.equal(played?._src, "blob:fish");
  assert.equal(playbackAudio, played);
  assert.equal(playbackEnded, true);
  const stale = await api.playPrepared({
    id: "b03",
    speaker: "琴音",
    text: "ありがとう",
    session,
    isCurrent: () => false
  });
  assert.equal(stale, false);
  api.cancel("test-end");
  api.configure({ enabled: false, apiKey: "" });
});

test("Fish TTS uses Saki and Temari reference ids and still skips unvoiced speakers", async () => {
  const calls = [];
  context.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      headers: { get: () => "audio/mpeg" },
      blob: async () => ({ text: JSON.parse(init.body).text })
    };
  };
  api.configure({ enabled: true, apiKey: "test-key" });
  const session = api.beginSession("scene-voices");
  const saki = api.parseLocalizedText(
    '<display lang="zh">咲季的中文</display><tts lang="ja">咲季だよ</tts>',
    "花海咲季"
  );
  const temari = api.parseLocalizedText(
    '<display lang="zh">手毬的中文</display><tts lang="ja">手毬だよ</tts>',
    "月村手毬(说话)"
  );
  assert.equal(saki.display, "咲季的中文");
  assert.equal(saki.ttsText, "咲季だよ");
  assert.equal(temari.ttsText, "手毬だよ");
  assert.equal(api.referenceIdForSpeaker("hski"), api.SAKI_REFERENCE_ID);
  assert.equal(api.referenceIdForSpeaker("ttmr"), api.TEMARI_REFERENCE_ID);
  assert.equal(api.isKotoneSpeaker("花海咲季"), false);
  const [sakiAudio, temariAudio, skipped] = await Promise.all([
    api.prepare({ id: "saki-1", speaker: "花海咲季", text: saki.ttsText, session, priority: 0 }),
    api.prepare({ id: "temari-1", speaker: "月村手毬", text: temari.ttsText, session, priority: 1 }),
    api.prepare({ id: "producer-1", speaker: "制作人", text: "おはよう", session, priority: 2 })
  ]);
  assert.equal(skipped, null);
  assert.equal(sakiAudio.blob.text, "咲季だよ");
  assert.equal(temariAudio.blob.text, "手毬だよ");
  assert.deepEqual(calls.map((call) => call.reference_id), [api.SAKI_REFERENCE_ID, api.TEMARI_REFERENCE_ID]);
  api.cancel("test-end");
  api.configure({ enabled: false, apiKey: "" });
});

test("Fish TTS routes additional idol voices", () => {
  const voices = [
    ["shro", "筱泽广", "f4f557d7cc154603bc5abd7549e910d0"],
    ["hmsz", "秦谷美铃", "de0abe9c782f49bc9c22363cae7eb2f1"],
    ["kllj", "葛城莉莉娅", "6af0b79d645d43928e6adbe8d1d0606b"],
    ["jsna", "十王星南", "9934972619db41f4b6364f5e0ffc9fb0"],
    ["hume", "花海佑芽", "ce90bb98872a4cf0a81c39f1fc24707e"],
    ["hrnm", "姬崎莉波", "fb23cd92823d4274a517d7d5bb3340ec"],
    ["rinami", "莉波", "fb23cd92823d4274a517d7d5bb3340ec"],
    ["kcna", "仓本千奈", "f6e6061c803c4d8fa371fdf658c35e2a"],
    ["atbm", "雨夜燕", "39d27c7315044ebab7997e160b2d7f74"],
    ["ssmk", "紫云清夏", "4199b1062c28461ca822d130138e99d1"],
    ["amao", "有村麻央", "4199b1062c28461ca822d130138e99d1"]
  ];
  for (const [idolId, name, referenceId] of voices) {
    assert.equal(api.referenceIdForSpeaker(idolId), referenceId);
    assert.equal(api.referenceIdForSpeaker(`${name}(说话)`), referenceId);
    const parsed = api.parseLocalizedText(
      `<display lang="zh">${name}</display><tts lang="ja">テスト</tts>`,
      name
    );
    assert.equal(parsed.display, name);
    assert.equal(parsed.ttsText, "テスト");
  }
  assert.equal(api.referenceIdForSpeaker("雨夜燕"), "39d27c7315044ebab7997e160b2d7f74");
  assert.equal(api.referenceIdForSpeaker("ssmk(说话)"), "4199b1062c28461ca822d130138e99d1");
  assert.equal(api.referenceIdForSpeaker("有村麻央"), "4199b1062c28461ca822d130138e99d1");
});
