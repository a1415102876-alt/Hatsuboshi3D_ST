# Hatsuboshi Produce Frontend Notes

## Architecture Map

- `st.html` is the preferred SillyTavern entry. It embeds/loads the frontend and bridges prompt send, regenerated/swiped replies, and chat-scoped save metadata.
- `index.html` should keep working for local standalone testing.
- `app.js` owns most behavior. It combines configuration, state migration, numeric settlement, prompt builders, event overlays, VN rendering, choice parsing, save sync, and dev helpers.
- `style.css` owns the mobile game presentation. The UI intentionally resembles a vertical Gakuen Idolmaster produce screen, with full-screen backgrounds, stat rings, action cards, side buttons, and galgame-style event display.

## Gameplay Loop

The frontend, not AI, settles numbers.

1. Player chooses an action.
2. Frontend calculates stamina, stress, trust, Vo/Da/Vi, SP/random events, round/day advancement, and logs.
3. Frontend builds a prompt that says the result is already settled.
4. SillyTavern role reply generates narrative only.
5. Frontend extracts the narrative and displays it in the event/VN panel.

Do not let AI recalculate or mutate settled values. Prompts should explicitly say not to recalculate, not to alter system results, and to place final display text inside the required delimiters when appropriate.

## SillyTavern Bridge

The current direction is `st.html`, not the local plugin.

Important behavior:

- Prompt send should work from inside the frontend.
- AI replies may arrive late, stream in chunks, be regenerated, or be swiped.
- The bridge should acknowledge handled replies but keep frontend regeneration possible when parsing fails.
- Chat metadata should win over stale browser-local saves. Only migrate a meaningful local save into empty chat metadata.

When debugging bridge issues, inspect both the frontend state and the host message flow. Mobile browsers can reveal layout/viewport bugs that desktop does not.

## Reply Extraction

Known reply formats:

- Preferred delimiters: `【初星正文开始】 ... 【初星正文结束】`.
- Galgame tags may appear inside the delimiters: `<story>`, `<narration>`, `<dialogue char="...">`, `<option1>` through `<option4>`.
- SillyTavern presets may inject planning, XML-like hidden tags, markdown, or variable updates.

Rules:

- Prefer delimited `【初星正文开始】` content.
- Strip planning/thinking only after preserving the display body.
- Do not treat ordinary quoted dialogue as options.
- Fallback option parsing should require explicit option tags or numbered option lines.
- If a choice event finishes without valid options, keep the event in a regenerable state instead of settling or inventing options.

## Choice Events

Choice UI must be gated by explicit state, not by the presence of random lines in the reply.

Relevant concepts:

- `state.eventMode = "choice_prompt"` means the frontend is waiting for AI to produce story plus choices.
- `state.eventMode = "choice_resolution"` means the player selected an option and the frontend is waiting for AI to write the consequence.
- `state.pendingActionContext` identifies the action being resolved.
- `state.pendingOptionTexts` should contain exactly four meaningful choices before showing the choice overlay.

Outing and companion choices convert selected options into trust gains. Bond events can have custom multi-phase routes, currently most developed for Temari.

Regeneration in `choice_prompt` mode should resend `state.lastPrompt`, not ask the host to regenerate a stale or partial message.

## Action Types

- Lessons and training are normal rounds.
- Rest is a normal-round recovery action and can trigger random events for Misuzu tuning.
- Extra action rounds expose outing and companion.
- Freechat and idol interaction do not consume actions or advance time.
- Bond events are triggered by affinity thresholds and can force the next day for thresholds 20/40/60/80.
- First Live occurs at the final schedule point and unlocks affinity 100 after success.

When adding a new action, update all of these surfaces as needed:

- action button rendering and availability
- settlement and result formatting
- prompt builder
- event/VN background selection
- icon mapping
- save/state shape defaults
- tests

## Affinity And Bond

Affinity thresholds are 0/20/40/60/80/100. The frontend emits tags like `AFF_TEMARI_40` so the user's worldbook/EJS can activate stage-specific persona rules.

Current design:

- 0: opening after choosing an idol; player can proceed without waiting for AI.
- 20/40/60/80: required bond event days after threshold unlock.
- 100: post-First Live ending, unlocked only after successful First Live and enough trust.

Temari has a more custom route. Preserve custom seeds and staged choices when touching bond logic. Other idols can keep generic route seeds until the user designs their routes.

## Idol Assets

Use stable filenames for backgrounds and avatars. Missing images should degrade gracefully.

Backgrounds should favor vertical portrait-friendly composition, ideally around 9:16 or tall mobile screenshots. Avatars should be square or near-square, cleanly cropped around the face.

## Mobile UI

The frontend must work through a phone browser connected to the desktop SillyTavern LAN URL.

Avoid:

- fixed desktop widths that push panels off-screen
- overlays that render above the visible viewport
- tiny click targets
- click/drag handlers that swallow taps
- diagnostic overlays left enabled

Prefer:

- viewport-relative panels
- draggable floating entry button with tap tolerance
- full-screen event overlays on phone
- stable z-index ordering

## Visual Direction

Use a polished mobile game interface inspired by Gakuen Idolmaster:

- character/background as first-viewport signal
- strong stat badges and circular gauges
- bright but controlled gradients
- icon-first action cards
- in-app toasts instead of browser alerts
- VN/galgame event panel for AI-generated story

Keep all player-facing text Chinese. Do not use emoji.

## Useful Verification

From `public/hatsu-produce-local`:

```powershell
node --check app.js
node --test tests\vn-flow.test.mjs
$tests = Get-ChildItem -LiteralPath tests -Filter *.test.mjs | ForEach-Object { $_.FullName }; node --test $tests
```

Run the narrower test first while iterating, then the full test set before reporting completion.

## Common Failure Modes

- AI output is partial and the frontend treats the last dialogue lines as choices.
- Regenerate sends a host regenerate request instead of resending the original prompt.
- A non-choice event inherits stale choice UI from a previous event.
- A choice continuation displays the previous full story while waiting, making the UI look frozen.
- Mobile tap opens only a sliver of panel because the overlay is positioned for desktop.
- Browser-local save overwrites a better SillyTavern chat save.
- Prompt wording lets AI write aftermath when the user wants live-performance-in-progress narration.
