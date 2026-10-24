---
name: hatsuboshi-produce-frontend
description: Use when working on the Hatsuboshi Produce local/SillyTavern frontend in public/hatsu-produce-local, including st.html integration, app.js gameplay loops, Gakuen Idolmaster-style UI, AI prompt generation, reply extraction, VN/galgame rendering, choice parsing, bond events, save compatibility, mobile behavior, idol assets, and related tests.
---

# Hatsuboshi Produce Frontend

## Quick Start

Work in `public/hatsu-produce-local`.

Primary files:

- `st.html`: SillyTavern-facing loader/bridge. The user currently relies on this more than the old local plugin entry.
- `index.html`: standalone local page.
- `app.js`: gameplay state, prompts, settlement, event overlays, VN rendering, reply parsing, save migration, and UI actions.
- `style.css`: Gakuen Idolmaster-like mobile-first visual layer.
- `tests/*.test.mjs`: regression tests for state, prompts, bridge, VN flow, choice parsing, and asset conventions.

Read `references/frontend-notes.md` before changing event flow, AI bridge behavior, choice parsing, save logic, mobile layout, idol configs, or prompt templates.

## Workflow

1. Inspect current dirty state in `public/hatsu-produce-local`; do not assume previous Codex changes were committed.
2. Locate the smallest relevant function cluster in `app.js`; this file is large, so search by behavior names such as `choice_prompt`, `pendingActionContext`, `triggerRegeneration`, `applyAiReply`, `build...Prompt`, `open...Overlay`, or `handleAction`.
3. Preserve the existing action loop: frontend settles numbers first, sends prompt to SillyTavern, receives role reply, extracts display text/options, then renders inside the event/VN overlay.
4. For UI changes, keep the current high-detail mobile game style and Chinese localization.
5. Add or update targeted tests when changing prompt generation, reply parsing, event modes, save behavior, idol configuration, or mobile bridge behavior.
6. Verify with `node --check app.js` and the relevant `node --test tests\*.test.mjs` command.

## Core Invariants

- `st.html` must remain usable without enabling the old SillyTavern plugin.
- Normal lesson/training/rest/freechat/interaction events should not show choice UI unless they explicitly enter a choice mode.
- Outing, companion, and selected bond routes may use staged choices.
- AI replies can be malformed, partial, regenerated, or stripped by SillyTavern presets. Reply parsing must be defensive and keep regeneration possible.
- Saves are scoped to the SillyTavern chat when running under the bridge; browser-local state must not silently override meaningful remote chat metadata.
- Mobile browser behavior matters. Avoid fixed desktop-only panels and make overlays visible within phone viewport constraints.
