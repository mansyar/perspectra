# Primary browser verification — 2026-11-26

- Track: 20261126-tutor-grounding-dock
- Branch: feat/20261126-tutor-grounding-dock
- Session: primary agent, in-app browser (browser MCP)
- Page: `http://127.0.0.1:4322/lessons/heart` served by `pnpm exec astro dev --host 127.0.0.1 --port 4322`
- Method: direct tab at 1000×700 plus a same-origin iframe rendered at 1280×800 and 1024×768 CSS pixels; in-frame interactions used `browser.evaluate` with the frame ID because `browser.click` cannot target a frame.
- Static dev has no Worker, so `/api/*` calls return 404 by design; these are not application failures.

## Desktop 1280×800 (iframe)

- `.tutor` computed `position: fixed`; rect `{top: 64, left: 896.67, width: 336, height: 551.21}`.
- `#tutor-question` visible; context label read `Context: Left Ventricle`.
- Selecting `[data-hotspot-chip="aorta"]` changed the label to `Context: Aorta` without navigating.
- `document.documentElement.scrollHeight` was 3673 against an 800px viewport, confirming scrollable content.

## Desktop 1024×768 (iframe)

- `.tutor` computed `position: fixed`; rect `{top: 64, left: 640.67, width: 336, height: 551.21}`.
- `#tutor-question` computed `display: block`.
- With `scrollY = 1200` (`scroll-behavior: smooth` required `behavior: 'instant'`), the dock rect was unchanged (`top: 64`) and the question box rect `{top: 418.04, bottom: 512.16}` stayed fully in viewport (`qInView: true`).
- Question entry, send, and graceful failure: entering `What does this hotspot do?` and clicking send produced `The tutor could not be reached. The lesson prose is still available.` in the answer/error region, with prose still rendered — the expected FR-8 fallback without a Worker.

## Mobile 1000×700 tab (below 1024px)

- The collapsed `Ask the tutor` control was present; activating it opened the sheet and focused `#tutor-question`.
- Escape closed the sheet and returned focus to the toggle.

## Review pass (2026-11-26, primary)

- Fresh tab at 1000×700: `Ask the tutor` opened the sheet (`data-sheet-open=true`, body `display:block`, `#tutor-question` focused); `browser.press Escape` closed it (`data-sheet-open=false`, body `display:none`) and returned focus to `[data-testid=tutor-toggle]`.
- Fresh same-origin iframe at 1280×800: `matchMedia('(min-width:1024px)')` matched, `.tutor` was `position:fixed` with rect `{top:64,left:896.67,width:336}`, `#tutor-question` fully in viewport, context `Context: Left Ventricle`.
- Same iframe resized to 1024×768: `.tutor` remained `fixed` at `{top:64,left:640.67,width:336}`; with `scrollY=1200` the rect was unchanged and the question box stayed in view. Clicking `[data-hotspot-chip="aorta"]` changed the context to `Context: Aorta`.
- Evidence screenshot (private, uncommitted): `.conductor/media/20261126-tutor-grounding-dock/review-dock.jpeg` shows the collapsed control visible at 1000px.

## Result

AC-4, AC-5, AC-6 and FR-8 were observed in the primary browser at Phase 3 and again at review. No console errors beyond the expected static-dev 404s for `/api/mastery?lessonId=heart` and `/api/auth/get-session`. No live credential sign-in or production verification was attempted.
