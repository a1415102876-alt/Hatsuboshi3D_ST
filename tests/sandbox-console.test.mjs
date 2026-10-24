import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, name + " must exist");
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function loadAdapters() {
  const names = [
    "getSandboxConsoleAvailableIdols",
    "getSandboxConsoleLocations",
    "getSandboxConsoleDraft",
    "validateSandboxConsoleDraft",
    "applySandboxConsoleDraft"
  ];
  const sandbox = {
    globalThis: {},
    state: null,
    canonicalIdolName: (value) => String(value || "").trim(),
    getEffectiveWorldMapLocations: () => [
      { id: "courtyard", name: "中庭" },
      { id: "student_store", name: "学生商店" }
    ],
    idols: {
      "藤田琴音": {},
      "月村手毬": {},
      "花海咲季": {}
    },
    HatsuIdolRoster: null,
    HatsuTasks: null
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(names.map(readFunction).join("\n"), sandbox, { filename: "app.js" });
  return sandbox;
}

test("declares the sandbox console state adapter interfaces", () => {
  loadAdapters();
});

test("extracts and validates a sandbox console draft", () => {
  const sandbox = loadAdapters();
  const state = {
    idol: "藤田琴音",
    stamina: 88,
    stress: 12,
    trust: 40,
    Vo: 100,
    Da: 200,
    Vi: 300,
    affinity: { value: 66 },
    sandbox: {
      responsibleIdol: "藤田琴音",
      producedIdols: ["藤田琴音"],
      openingComplete: true,
      inviteComplete: true,
      secondIdolUnlocked: false,
      firstLiveChallenge: { status: "ready" }
    },
    freeMode: {
      postLiveDay: 4,
      clockMinutes: 615,
      activeLocationId: "courtyard",
      atApartment: false,
      facilityKind: null
    }
  };
  const draft = sandbox.getSandboxConsoleDraft(state);
  assert.equal(draft.postLiveDay, 4);
  assert.equal(draft.clockMinutes, 615);
  assert.equal(draft.activeLocationId, "courtyard");
  assert.equal(draft.responsibleIdol, "藤田琴音");

  const valid = sandbox.validateSandboxConsoleDraft({
    ...draft,
    postLiveDay: 9,
    clockMinutes: 617,
    stamina: 140,
    stress: -2,
    producedIdols: ["藤田琴音", "月村手毬"],
    facilityKind: "training",
    firstLiveStatus: "completed"
  }, state);
  assert.equal(valid.ok, true);
  assert.equal(valid.value.postLiveDay, 9);
  assert.equal(valid.value.clockMinutes, 615);
  assert.equal(valid.value.stamina, 100);
  assert.equal(valid.value.stress, 0);
  assert.deepEqual(Array.from(valid.value.producedIdols), ["藤田琴音", "月村手毬"]);
});

test("rejects unknown location, idol and first live state without partial mutation", () => {
  const sandbox = loadAdapters();
  const state = {
    idol: "藤田琴音",
    sandbox: { responsibleIdol: "藤田琴音", producedIdols: ["藤田琴音"], firstLiveChallenge: { status: "ready" } },
    freeMode: { postLiveDay: 1, clockMinutes: 480, activeLocationId: "courtyard", facilityKind: null },
    stamina: 80,
    harness: { activeTurn: { id: "keep" } },
    pendingAiRequestId: "request-keep",
    customField: { preserve: true }
  };
  const result = sandbox.applySandboxConsoleDraft(state, {
    postLiveDay: 2,
    clockMinutes: 600,
    activeLocationId: "unknown-location",
    responsibleIdol: "unknown-idol",
    producedIdols: ["藤田琴音"],
    facilityKind: "training",
    firstLiveStatus: "not-a-status",
    stamina: 20
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
  assert.equal(state.freeMode.postLiveDay, 1);
  assert.equal(state.pendingAiRequestId, "request-keep");
  assert.deepEqual(state.customField, { preserve: true });
});

test("applies only validated fields and preserves active request state", () => {
  const sandbox = loadAdapters();
  const state = {
    idol: "藤田琴音",
    sandbox: {
      responsibleIdol: "藤田琴音",
      producedIdols: ["藤田琴音"],
      openingComplete: false,
      inviteComplete: false,
      secondIdolUnlocked: false,
      firstLiveChallenge: { status: "ready" },
      customSandboxField: "keep"
    },
    freeMode: {
      postLiveDay: 1,
      clockMinutes: 480,
      activeLocationId: "courtyard",
      atApartment: false,
      facilityKind: null,
      world: { customWorldField: "keep" }
    },
    stamina: 80,
    stress: 5,
    trust: 10,
    Vo: 10,
    Da: 20,
    Vi: 30,
    affinity: { value: 20, custom: true },
    pendingAiRequestId: "request-keep",
    harness: { activeTurn: { id: "turn-keep" } },
    customTopLevel: "keep"
  };
  const result = sandbox.applySandboxConsoleDraft(state, {
    postLiveDay: 3,
    clockMinutes: 905,
    activeLocationId: "student_store",
    responsibleIdol: "藤田琴音",
    producedIdols: ["藤田琴音", "月村手毬"],
    stamina: 100,
    stress: 20,
    trust: 75,
    Vo: 400,
    Da: 500,
    Vi: 600,
    affinity: 80,
    openingComplete: true,
    inviteComplete: true,
    secondIdolUnlocked: true,
    atApartment: true,
    facilityKind: "rest",
    firstLiveStatus: "cooldown"
  });
  assert.equal(result.ok, true);
  assert.equal(state.freeMode.postLiveDay, 3);
  assert.equal(state.freeMode.clockMinutes, 905);
  assert.equal(state.freeMode.activeLocationId, "student_store");
  assert.equal(state.sandbox.customSandboxField, "keep");
  assert.equal(state.freeMode.world.customWorldField, "keep");
  assert.equal(state.pendingAiRequestId, "request-keep");
  assert.equal(state.harness.activeTurn.id, "turn-keep");
  assert.equal(state.trust, 80);
  assert.equal(state.sandbox.firstLiveChallenge.status, "cooldown");
});

test("switches the active sandbox idol through the roster profile when responsible idol changes", () => {
  const sandbox = loadAdapters();
  sandbox.globalThis.HatsuIdolRoster = {
    getAssignedIdols: (currentState) => currentState.sandbox.assignedIdols || [],
    switchResponsibleIdol: (currentState, name) => {
      if (!(currentState.sandbox.assignedIdols || []).includes(name)) return { ok: false };
      currentState.idol = name;
      currentState.sandbox.responsibleIdol = name;
      return { ok: true };
    },
    confirmAssignedIdol: (currentState, name) => {
      currentState.sandbox.assignedIdols = [...(currentState.sandbox.assignedIdols || []), name];
      currentState.idol = name;
      currentState.sandbox.responsibleIdol = name;
      return { ok: true };
    }
  };
  const state = {
    idol: "藤田琴音",
    sandbox: { responsibleIdol: "藤田琴音", producedIdols: ["藤田琴音"], assignedIdols: ["藤田琴音"], firstLiveChallenge: { status: "available" } },
    freeMode: { postLiveDay: 1, clockMinutes: 480, activeLocationId: "courtyard", facilityKind: null },
    stamina: 100,
    trust: 0,
    Vo: 90,
    Da: 90,
    Vi: 120
  };
  const result = sandbox.applySandboxConsoleDraft(state, {
    ...sandbox.getSandboxConsoleDraft(state),
    responsibleIdol: "月村手毬",
    producedIdols: ["藤田琴音", "月村手毬"]
  });
  assert.equal(result.ok, true);
  assert.equal(state.idol, "月村手毬");
  assert.equal(state.sandbox.responsibleIdol, "月村手毬");
  assert.ok(state.sandbox.assignedIdols.includes("月村手毬"));
});

test("does not leave roster fields partially changed when responsible idol switching fails", () => {
  const sandbox = loadAdapters();
  sandbox.globalThis.HatsuIdolRoster = {
    getAssignedIdols: (currentState) => currentState.sandbox.assignedIdols || [],
    switchResponsibleIdol: () => ({ ok: false }),
    confirmAssignedIdol: () => ({ ok: false })
  };
  const state = {
    idol: "藤田琴音",
    sandbox: { responsibleIdol: "藤田琴音", producedIdols: ["藤田琴音"], assignedIdols: ["藤田琴音"], firstLiveChallenge: { status: "available" } },
    freeMode: { postLiveDay: 1, clockMinutes: 480, activeLocationId: "courtyard", facilityKind: null },
    stamina: 100,
    trust: 0,
    Vo: 90,
    Da: 90,
    Vi: 120
  };
  const result = sandbox.applySandboxConsoleDraft(state, {
    ...sandbox.getSandboxConsoleDraft(state),
    responsibleIdol: "月村手毬",
    producedIdols: ["藤田琴音", "月村手毬"]
  });
  assert.equal(result.ok, false);
  assert.equal(state.idol, "藤田琴音");
  assert.deepEqual(Array.from(state.sandbox.assignedIdols), ["藤田琴音"]);
  assert.equal(state.sandbox.responsibleIdol, "藤田琴音");
});
