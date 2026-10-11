---
name: onb-ui-design
description: Visual and interaction rules for the ONB Agent Copilot frontend. Use whenever creating or changing anything in frontend/src (components, styles, copy, icons, new screens) so the result stays on the Omdurman National Bank identity and free of generic AI-generated UI patterns.
---

# ONB Agent Copilot: UI design rules

The frontend is a product UI for bank call-centre agents, not a marketing page.
Trust and legibility come first. Everything below is already implemented; keep
new work consistent with it. When the general design skills in this folder
disagree with each other or with the brand, these rules win.

## Which general skills apply here

- `redesign-existing-projects`: the method. Audit, then targeted fixes on the
  existing stack. No rewrites, no new frameworks.
- `high-end-visual-design`: nested "double-bezel" surfaces, diffused tinted
  shadows, spring easing, staggered entry, light-weight Phosphor icons.
- `minimalist-ui`: warm monochrome canvas, hairline structure, 8 to 12px
  radii, pastel status tags, keyboard hints as real `<kbd>` keys.
- `full-output-enforcement`: every file complete, no placeholders.
- Not used: the landing-page, image-generation, brutalist, Stitch and 3D
  skills. They do not fit a call-centre tool.

## Brand source

- Identity comes from onb-sd.com: white, one green, neutral text.
- Logos: `frontend/public/brand/onb-logo-en.png` and `onb-logo-ar.png`. Never
  redraw or recolor them. On the dark canvas they sit on a white plate.
- Tagline (do not alter): "We are Committed to Sustaining Excellence" /
  "ملتزمون باستدامة التفوق".

## Tokens (frontend/src/styles/tokens.css)

- Canvas is warm bone (`--canvas`), the working surface is one white sheet
  (`--surface`) with a hairline edge and a diffused shadow tinted to the
  canvas hue. Secondary tiles use `--surface-2`.
- One accent only: `--accent` (#009341 light, #35b86b dark). Spend it on the
  send button, the live status dot and the Verified tag. Never as a large
  background. No gradients, no glows, no second accent.
- Other meaning uses washed-out pastels: `--tag-verified-*`,
  `--tag-confirm-*`, `--tag-policy-*`, `--danger` / `--danger-soft`.
- Structure is hairline: `--line` (7% ink) and `--line-strong` (13%). Use
  `box-shadow: inset 0 0 0 1px var(--line)` rather than solid grey borders.
- Radius rule: controls 8px, panels and bubbles 12px, the outer sheet and the
  composer shell 16px, chips and tags are pills. Nested inner radius is
  outer minus padding (the composer box is 16px minus 6px).
- Theme is resolved in JavaScript to `<html data-theme="light|dark">`. The
  user picks System, Light or Dark in the display menu. Every new colour
  must be defined in both theme blocks.
- Fonts: IBM Plex Sans for Latin, IBM Plex Sans Arabic for Arabic, IBM Plex
  Mono for `<kbd>` and code, all self-hosted through @fontsource. Never link
  Google Fonts at runtime. Body uses tabular numerals.

## Motion

- Two curves only: `--ease-spring` for state changes, `--ease-settle` for
  entry. Never `linear` or `ease-in-out`.
- Entry uses the `rise` keyframe (10px up, fade) with a stagger of
  `calc(var(--index) * 60-70ms)` on lists. Set `--index` inline per item.
- Animate only `transform` and `opacity`. Honour `prefers-reduced-motion`
  by adding new animated selectors to the existing reduce block.

## Bilingual and RTL

- All interface strings live in `frontend/src/i18n.js` under `en` and `ar`.
  Add both when adding a string. Arabic product names stay as the bank
  writes them: اوو-كاش، بنكي نت، بنكي بوت.
- Switching to Arabic sets `dir="rtl"` on the document. Use logical CSS
  (`inset-inline-end`, `margin-inline-start`, `text-align: start`).
- Each message, passage and query sets its own `dir` from its content with
  `isMostlyArabic()` in `frontend/src/lib/text.js`.

## Components

- Icons: `@phosphor-icons/react` only. Header and panel icons are weight
  `light` at 20px; inline icons are `light` at 14 to 18px; `fill` only for
  the send and stop glyphs. Never hand-write SVG paths.
- Controls: `.icon-btn` (36px square), `.text-btn` (36px, hairline),
  `.send-btn` (accent fill, 8px), `.segment` (tray with one raised pane),
  `.switch`. Reuse these classes instead of inventing new ones.
- Settings live in the display menu (`.menu`), not as loose header icons.
  No sun/moon toggle.
- Every async surface has loading, empty and error states. Loading is the
  skeleton pattern, never a spinner.
- Tiles (suggestions, bubbles, passages) are background-only; no border plus
  shadow plus white card. Hover lifts 1px with `--shadow-lift`.
- Source entries show their knowledge-base `status` as a pastel `.tag`:
  Verified, Confirm with ONB, Assistant policy.

## Copy

- Plain functional sentences, sentence case. No marketing verbs, no
  exclamation marks.
- No em-dashes or en-dashes anywhere in visible text. Use a comma, a period
  or a hyphen.
- No decorative labels above headings, no section numbering, no all-caps
  tracking labels, no status dots unless they report real state (the backend
  health dot is the one allowed).

## Layout

- Shell: 16px canvas gutter, 64px header sitting directly on the canvas, one
  sheet below it. Sheet: chat column (content max 800px) plus sources panel
  (360px, 320px under 1100px). Below 960px the gutter and sheet radius go to
  zero and the panel stacks under the chat. Below 640px the header drops the
  title text, keeps the logo, status dot, language, display menu and reset.
- CSS Grid for columns, never flex percentage maths. `100dvh`, never `100vh`.
- Check a change at 1440px, 960px and 390px before calling it done. At 390px
  `document.documentElement.scrollWidth` must equal the viewport width.

## Before finishing any UI change

1. Both themes rendered and readable (WCAG AA contrast).
2. Both languages rendered, RTL mirrored correctly.
3. `npm run build` passes with no warnings.
4. No new colours outside tokens.css, no new radii, no new icon library, no
   new easing curves.
