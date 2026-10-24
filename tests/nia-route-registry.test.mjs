import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const registrySource = fs.readFileSync(new URL("nia/routes/registry.js", root), "utf8");
const sakiSource = fs.readFileSync(new URL("nia/routes/hanami-saki.js", root), "utf8");
const kotoneSource = fs.readFileSync(new URL("nia/routes/fujita-kotone.js", root), "utf8");
const umeSource = fs.readFileSync(new URL("nia/routes/hanami-ume.js", root), "utf8");
const hiroSource = fs.readFileSync(new URL("nia/routes/shinosawa-hiro.js", root), "utf8");
const html = fs.readFileSync(new URL("index.html", root), "utf8");
const st = fs.readFileSync(new URL("st.html", root), "utf8");

function loadRoutes() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(registrySource, context);
  vm.runInContext(sakiSource, context);
  vm.runInContext(kotoneSource, context);
  vm.runInContext(umeSource, context);
  vm.runInContext(hiroSource, context);
  return context.HatsuNiaRoutes;
}

test("Saki route registers affinity, rounds, opponents, and episodes", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("花海咲季");
  assert.equal(route.routeId, "hanami-saki");
  assert.equal(route.inheritedAffinity.tag, "AFF_SAKI_100");
  assert.equal(routes.getRound("花海咲季", 2).opponent.name, "贺阳燐羽");
  assert.equal(routes.getRound("花海咲季", 3).opponent.name, "花海佑芽");
  assert.deepEqual(Array.from(routes.getEpisodes("花海咲季"), (entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
});

test("Kotone route registers inherited affinity, QUARTET opponents, and episode order", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("藤田琴音");
  assert.equal(route.routeId, "fujita-kotone");
  assert.equal(route.inheritedAffinity.tag, "AFF_KOTONE_100");
  assert.equal(route.inheritedAffinity.value, 100);
  assert.equal(route.assets.finaleVideo, "assets/campusmode/Fujita-Kotone-Campusmode.mp4");
  const quartetOpponents = [...route.rounds.find((entry) => entry.round === 2).opponents];
  assert.deepEqual(quartetOpponents.map((entry) => String(entry.name)), ["蓝井抚子", "白草四音"]);
  assert.deepEqual(quartetOpponents.map((entry) => String(entry.avatar)), [
    "./assets/avatars/aoi-nadeshiko.png",
    "./assets/avatars/shirakusa-shion.png"
  ]);
  assert.equal(route.rounds.find((entry) => entry.round === 3).opponent.avatar, "./assets/avatars/shirakusa-tsukika.png");
  assert.deepEqual(Array.from(routes.getEpisodes("藤田琴音"), (entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(route.opening.episode, 11);
});

test("Saki route keeps its Campus Mode finale video", () => {
  const routes = loadRoutes();
  assert.equal(routes.getByIdol("花海咲季").assets.finaleVideo, "assets/campusmode/Hanami-Saki-Campusmode.mp4");
});

test("Ume route registers inherited affinity, opponents, opening, and episode anchors", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("花海佑芽");
  assert.equal(route.routeId, "hanami-ume");
  assert.equal(route.inheritedAffinity.tag, "AFF_UME_100");
  assert.equal(route.assets.finaleVideo, "assets/campusmode/Hanami-Ume-Campusmode.mp4");
  assert.equal(route.opening.episode, 11);
  assert.match(route.opening.anchors.join("\n"), /H\.I\.F/);
  assert.equal(routes.getRound("花海佑芽", 2).opponent.name, "贺阳燐羽");
  assert.equal(routes.getRound("花海佑芽", 3).opponent.name, "花海咲季");
  assert.deepEqual(Array.from(routes.getEpisodes("花海佑芽"), (entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.match(routes.getEpisode("花海佑芽", "nia-ume-fans-10000").promptAnchors.join("\n"), /替她复仇/);
});

test("Hiro route registers inherited affinity, rival groups, opening, and episode anchors", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("筱泽广");
  assert.equal(route.routeId, "shinosawa-hiro");
  assert.equal(route.inheritedAffinity.tag, "AFF_HIRO_100");
  assert.equal(route.assets.finaleVideo, "assets/campusmode/Shinosawa-Hiro-Campusmode.mp4");
  assert.equal(route.opening.episode, 11);
  assert.equal(route.dossier.schoolYear, "1年2组");
  assert.deepEqual(Array.from(route.dossier.report, (line) => String(line)), [
    "14岁大学毕业的天才少女。",
    "详细的履历记于别处。",
    "入学测试成绩为、笔试满分、实操0分。",
    "学园长亲自面试后给出优的评价。",
    "放弃了备受期待的将来、选择成为偶像的理由目前还不得而知。"
  ]);
  assert.match(route.opening.anchors.join("\n"), /合作赛/);
  assert.deepEqual(
    Array.from(routes.getRound("筱泽广", 2).opponents, (entry) => String(entry.name)),
    ["花海佑芽"]
  );
  assert.deepEqual(
    Array.from(routes.getRound("筱泽广", 3).opponents, (entry) => String(entry.name)),
    ["花海佑芽", "仓本千奈"]
  );
  const episodes = Array.from(routes.getEpisodes("筱泽广"));
  assert.deepEqual(episodes.map((entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.deepEqual(episodes.map((entry) => String(entry.eventId)), [
    "nia-hiro-fans-5000",
    "nia-hiro-fans-10000",
    "nia-hiro-round2-audition-eve",
    "nia-hiro-round2-quartet-opening",
    "nia-hiro-round2-quartet-victory",
    "nia-hiro-round3-first-business",
    "nia-hiro-round3-finale-eve",
    "nia-hiro-finale-victory",
    "nia-hiro-finale-epilogue"
  ]);
  assert.equal(new Set(episodes.map((entry) => entry.eventId)).size, episodes.length);
  assert.deepEqual(episodes.map((entry) => [
    String(entry.trigger.type),
    Number(entry.trigger.threshold || 0),
    Number(entry.trigger.round || 0),
    Number(entry.trigger.day || 0)
  ]), [
    ["fans", 5000, 0, 0],
    ["fans", 10000, 0, 0],
    ["round_day_complete", 0, 2, 5],
    ["audition_eve", 0, 2, 0],
    ["audition_complete", 0, 2, 0],
    ["first_business_complete", 0, 3, 0],
    ["schedule_complete", 0, 3, 0],
    ["finale_complete", 0, 0, 0],
    ["finale_complete", 0, 0, 0]
  ]);
  assert.equal(routes.getEpisode("筱泽广", "nia-hiro-fans-5000").trigger.threshold, 5000);
  assert.equal(routes.getEpisode("筱泽广", "nia-hiro-fans-10000").trigger.threshold, 10000);
  assert.deepEqual(episodes.slice(3).map((entry) => String(entry.background)), [
    "./assets/scenes/Producer_Office.png",
    "./assets/scenes/NIA_Stage_Backstage.png",
    "./assets/scenes/Kuramoto_Bedroom.png",
    "./assets/scenes/NIA_Stage_Backstage.png",
    "./assets/scenes/NIA_Stage_Backstage.png",
    "./assets/scenes/Hiro_NIA_Episode20_Sunset.png"
  ]);
  assert.match(routes.getEpisode("筱泽广", "nia-hiro-round2-quartet-victory").promptAnchors.join("\n"), /第一次.*对手/);
  assert.match(routes.getEpisode("筱泽广", "nia-hiro-finale-epilogue").promptAnchors.join("\n"), /共同的兴趣/);
});

test("every available N.I.A route supplies an idol-specific first-round draft", () => {
  const routes = loadRoutes();
  const expected = new Map([
    ["花海咲季", "咲季"],
    ["藤田琴音", "琴音"],
    ["花海佑芽", "佑芽"],
    ["筱泽广", "广"]
  ]);
  for (const [idolName, ownName] of expected) {
    const defaults = routes.getByIdol(idolName).draftDefaults;
    assert.ok(defaults?.goal);
    assert.ok(defaults?.image);
    assert.match(`${defaults.goal}\n${defaults.image}`, new RegExp(ownName));
    for (const otherName of [...expected.values()].filter((name) => name !== ownName)) {
      assert.doesNotMatch(`${defaults.goal}\n${defaults.image}`, new RegExp(otherName));
    }
  }
});

test("Hiro episode 20 uses the dedicated sunset campus background", () => {
  const routes = loadRoutes();
  const episode = routes.getEpisodes("筱泽广").find((entry) => entry.episode === 20);
  assert.equal(episode.background, "./assets/scenes/Hiro_NIA_Episode20_Sunset.png");
  assert.equal(fs.existsSync(new URL("../assets/scenes/Hiro_NIA_Episode20_Sunset.png", import.meta.url)), true);
});

test("registry rejects incomplete routes and duplicates", () => {
  const routes = loadRoutes();
  assert.throws(() => routes.register({ routeId: "bad" }), /idolName/);
  assert.throws(() => routes.register({
    routeId: "hanami-saki",
    idolName: "other",
    inheritedAffinity: { value: 0, max: 100, tag: "AFF_OTHER_0", relationshipSummary: "none" }
  }), /Duplicate/);
});

test("route scripts load before N.I.A cores and app in both entries", () => {
  assert.ok(html.indexOf("nia/routes/registry.js") < html.indexOf("nia-training-core.js"));
  assert.ok(html.indexOf("nia/routes/hanami-saki.js") < html.indexOf("app.js"));
  assert.ok(html.indexOf("nia/routes/fujita-kotone.js") < html.indexOf("nia-training-core.js"));
  assert.ok(html.indexOf("nia/routes/hanami-ume.js") < html.indexOf("nia-training-core.js"));
  assert.ok(html.indexOf("nia/routes/shinosawa-hiro.js") < html.indexOf("nia-training-core.js"));
  assert.ok(st.indexOf("'nia/routes/registry.js'") < st.indexOf("abs('nia-training-core.js')"));
  assert.ok(st.indexOf("'nia/routes/hanami-saki.js'") < st.indexOf("abs('app.js')"));
  assert.ok(st.indexOf("'nia/routes/fujita-kotone.js'") < st.indexOf("abs('nia-training-core.js')"));
  assert.ok(st.indexOf("'nia/routes/hanami-ume.js'") < st.indexOf("abs('nia-training-core.js')"));
  assert.ok(st.indexOf("'nia/routes/shinosawa-hiro.js'") < st.indexOf("abs('nia-training-core.js')"));
});
