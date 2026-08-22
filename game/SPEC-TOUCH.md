# Castle Life — iPad / touch controls (Roblox-style)

Replaces the small d-pad with controls that feel right under a kid's thumbs on an iPad: a floating
thumbstick bottom-left and a big round action button bottom-right, both **overlaid on the game view**
the way Roblox does it — not stacked in a bar underneath.

Current state: `.touch-controls` holds a 2.7rem `.dpad` grid + `#btnAction`, shown via
`@media (hover: none), (max-width: 899px)`, sitting *below* the canvas. `js/game.js` drives movement
from `dpadDir` + a hold-to-repeat timer (`startRepeat`/`stopRepeat`, single-pointer rule) and
`btnAction` calls `interact()` / `advanceDialogue()`.

## Behaviour

**Thumbstick (left)**
- A translucent ring rests in the lower-left of the stage. Touching *anywhere in the left ~45% of the
  stage's lower two-thirds* springs the ring to that point (Roblox's "floating stick") and captures
  the pointer; the nub follows the finger, clamped inside the ring radius.
- Direction = dominant axis of the drag vector (4-way, matching the grid), with a dead zone of ~22%
  of the radius so a resting thumb doesn't creep. Crossing the dead zone starts movement and
  hold-to-repeat; changing dominant axis changes direction immediately.
- Release (`pointerup`/`pointercancel`/leaving the surface) returns the ring to rest and stops
  movement. Reuse the existing repeat mechanism and its single-pointer rule — a second finger on the
  action button must NOT cancel the stick, and vice versa (this is the whole point of two-thumb play).
- Multi-touch: track the stick's `pointerId` and the button's separately.

**Action button (right)**
- Large round gold button (min 88px, scaling up on iPad), bottom-right of the stage, safe-area aware.
- Same behaviour it has now: advances dialogue when open, otherwise `interact()`. Add a brief pressed
  state. It must be usable *while* the stick is held.

**Placement taps still work.** The overlay must only capture pointers inside the stick zone and the
button itself; taps anywhere else on the canvas continue to reach the Phaser placement handler. Use a
transparent overlay with `pointer-events: none` and re-enable it only on the live control elements /
the stick's activation zone.

**When to show.** Touch devices only: `@media (pointer: coarse)`, plus keep the existing narrow-screen
case. Note iPadOS reports desktop-class UA — feature-detect with `navigator.maxTouchPoints > 0`
rather than sniffing for "iPad". Keyboard/mouse behaviour on desktop must be completely unchanged,
and the controls must not appear there.

**iPad polish**
- `game.html` viewport gets `viewport-fit=cover` (keep `width=device-width, initial-scale=1`); add
  `user-scalable=no, maximum-scale=1` so a double-tap near the stick doesn't zoom the page.
- `overscroll-behavior: none` on body and `touch-action: none` on the stage so dragging never
  rubber-bands or scrolls the page.
- `-webkit-user-select: none` / `-webkit-touch-callout: none` on controls so long-press doesn't
  select text or pop the callout menu.
- Respect `env(safe-area-inset-*)` so controls clear the home indicator and rounded corners.
- Landscape iPad (1180x820-ish) and portrait (820x1180) must both fit with no page scrolling; the
  HUD stacks under the stage in portrait, beside it in landscape when there's room.
- Comfortable hit targets everywhere on touch: the header chips (🔊 / Start over) and the HUD's
  recipe/furniture rows should be at least 44px tall.

## Constraints

- Keep the existing keyboard controls, the save format (`pm-castle-life-v1`), the voice work, and the
  Phaser rendering exactly as they are.
- The old `.dpad` markup may be removed, but `#btnAction` must keep its id and behaviour.
- Everything gated behind `prefers-reduced-motion` stays gated.
- `node --check js/game.js` passes; no console errors.

## Verify

Drive with playwright-cli using **real touch emulation**, not synthetic clicks: launch a context with
`hasTouch: true` and an iPad-sized viewport, then dispatch `pointerdown`/`pointermove`/`pointerup`
with `pointerType: "touch"` (or use `page.touchscreen`). Assert:
1. Landscape iPad (1180x820) and portrait (820x1180): no page scroll (`scrollWidth <= clientWidth`,
   same for height), stick + action button visible and inside the viewport.
2. Dragging the stick right moves the player right (`window.__castleLife.getState().x` increases);
   holding keeps stepping; releasing stops.
3. Dead zone: a tiny drag does not move the player.
4. Two-finger: hold the stick while tapping the action button — movement continues AND the action fires.
5. A tap on an empty floor tile in the house still places selected furniture (overlay doesn't swallow it).
6. Desktop (1440x900, mouse): controls hidden, keyboard play unchanged, no console errors.
