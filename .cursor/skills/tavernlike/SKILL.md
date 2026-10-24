---
name: tavernlike
description: Use when integrating SillyTavern-like systems into a web project: lorebooks/world info, presets, character cards, game-style AI chat UI, streamed XML-like tag parsing, variables, summaries, prompt assembly, or React components modeled after SillyTavern. Also use when adapting or inspecting ariespo/tavernlike templates.
metadata:
  short-description: Build SillyTavern-like web frontends
---

# Tavernlike

Use this skill when the user asks to add or design a SillyTavern-style frontend, lorebook/world-info system, character card importer, preset manager, game UI with choices, streaming tag parser, variables system, or prompt assembly pipeline.

This is a Codex migration of `ariespo/tavernlike` v3.0.0. The bundled React templates live in `assets/react/`.

## Workflow

1. Inspect the target project first.
   - Check `package.json`, framework, source layout, styling system, and whether React/TypeScript are already present.
   - Do not copy templates blindly into non-React projects.

2. Choose the integration scope.
   - **Core engine only**: copy/adapt files from `assets/react/sillytavern/`.
   - **React hooks**: copy/adapt `assets/react/hooks/`.
   - **Game UI**: copy/adapt `assets/react/components/SillyTavern/`.
   - **Reference-only design**: read templates for patterns but implement natively in the current app style.

3. Preserve project conventions.
   - Match existing component structure, CSS approach, state management, naming, and build tooling.
   - Use the templates as source material, not as mandatory architecture.

4. Add dependencies only when needed.
   - The original templates use `dexie` for IndexedDB. Install or add it only if the project does not already have an equivalent storage layer.

5. Verify after integration.
   - Run typecheck/tests/build available in the project.
   - For UI work, run the app and inspect the flow in browser when feasible.

## Bundled Template Map

- `assets/react/sillytavern/types.ts`: shared types for lorebooks, presets, chats, variables, settings.
- `assets/react/sillytavern/database.ts`: Dexie IndexedDB persistence.
- `assets/react/sillytavern/lorebook-engine.ts`: keyword/world-info matching.
- `assets/react/sillytavern/prompt-assembler.ts`: prompt construction.
- `assets/react/sillytavern/importer.ts`: SillyTavern import/export helpers.
- `assets/react/sillytavern/stream-parser.ts`: streaming XML-like tag parser.
- `assets/react/sillytavern/vars-merger.ts`: variable deep merge.
- `assets/react/sillytavern/api-router.ts`: primary/secondary API routing.
- `assets/react/hooks/`: React hooks wrapping the core engine.
- `assets/react/components/SillyTavern/`: game/chat UI components.

## Output Format Pattern

The original Tavernlike game mode expects LLM output shaped like:

```xml
<thinking>optional hidden or folded reasoning text</thinking>
<maintext>story text</maintext>
<option>
Option A
Option B
Option C
</option>
<sum>one-turn summary</sum>
<vars>{ "HP": 80, "gold": 15 }</vars>
```

When adapting this pattern, keep tags configurable. Do not hard-code hidden reasoning display unless the target app explicitly wants it.

## References

- Read `references/README.md` for the original project overview.
- Read `references/QUICKSTART.md` for original usage examples.
- Read `references/CLAUDE_SKILL.md` only when you need the full migrated Claude skill text.
- Read `references/skill.json` for original metadata.

## Guardrails

- Do not overwrite existing app architecture with the template wholesale unless the user explicitly asks for a full scaffold.
- Do not add API keys to source files.
- Do not expose private chain-of-thought content; if using a `<thinking>` tag, treat it as ordinary user-visible folded text unless the project has a safe hidden-channel design.
- Do not let AI-generated `<vars>` directly mutate state without schema validation when high-stakes or persistent state matters.
