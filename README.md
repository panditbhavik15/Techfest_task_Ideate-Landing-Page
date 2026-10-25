# Techfest 2026 — concept landing page

A single-page, dependency-free concept site for **Techfest, IIT Bombay** (30th edition,
theme artwork "Farside", tagline "An Aetherial Renaissance"). Content is taken from the
official site; anything not verifiable there is marked in-page with a dashed `◦` placeholder.

## Run it

No build step, no packages.

```bash
python -m http.server 5173 --bind 127.0.0.1
# then open http://127.0.0.1:5173/
```

Opening `index.html` directly also works; a server keeps the self-hosted fonts and
`fetchpriority` hints behaving the same as production.

## Layout

```
index.html          markup + all copy
css/styles.css      design tokens, liquid glass, layout, motion (Space Grotesk, #0A0A0C / #FFD700)
js/main.js          category tabs, motion toggle, scroll reveal, mobile nav, marquee, shortlist, ambience
assets/img          generated 2D artwork (webp) + favicon.svg
assets/fonts        self-hosted Space Grotesk 400/500/700 latin woff2
```

## Liquid glass

Every panel is built from one set of tokens in `:root` instead of per-component values:
`--glass` / `--glass-deep` (layered translucent gradients), `--glass-fill` / `--glass-fill-2`
(the flat colour beneath them), `--edge` (lit 1px border), `--gloss` (inner highlight plus inner
shadow, so a panel reads as a slab with thickness), `--sheen` (a specular band) and `--blur`.

A dedicated block near the end of `css/styles.css` restates those surfaces. It is deliberately the
last thing that touches `background` and `border-color`: at equal specificity the later rule wins,
so the glass lands everywhere while the individual hover, `[aria-selected]` and `:focus-visible`
rules below it still override it.

`backdrop-filter` is only spent where something actually travels behind the panel — the sticky
header, the mobile menu, the hero rail, the shortlist and the moon badge. Cards and list rows sit
on a static section background, so they get fill, edge and gloss alone; blur is the expensive half
of the effect and there is no reason to pay for it forty times over.

The sheen is a pseudo-element at `z-index:-1` inside an `isolation:isolate` panel, which puts the
highlight over the glass and under the text. It sits at opacity 0 at rest, drifts across on hover
and breathes on the two hero panels — all only under `html.motion-on`.

Where `backdrop-filter` is unsupported, `@supports not (...)` overrides the two fill tokens on
`:root` rather than re-listing selectors, so panels declared further down the file get the solid
fallback too.

Text contrast was re-derived after the pass: translucent fills lighten every surface they sit on,
which pushed the secondary tone under 4.5:1 — hence `--haze-2: #93A0B3` and no `opacity` on the
struck-through price. Worst real placement measures 4.83:1 with the sheen at its peak.

## Motion

Animations are gated behind `html.motion-on`, so nothing decorative moves unless JavaScript
opts in. The header **Motion** control sets the state and stores it in `localStorage`
(`tf-motion`). With no stored choice, the page follows `prefers-reduced-motion`.

Functional feedback — the Menu button turning into a cross, the panel sliding open, border
and colour changes on hover and focus — is *not* gated, because a control that gives no
visible response reads as broken. There is deliberately no blanket
`transition-duration:0!important` rule for reduced motion; it used to flatten those
micro-interactions along with the decoration, which made the header controls look dead.

### Scroll behaviour

One scroll handler publishes a `--p` progress value (0 → 1) on `<html>` and drives:

- the gold progress line under the header,
- the fixed **moon-phase badge** bottom-right — the moon waxes and its satellite orbits as
  you descend, reset to new moon at the top (set via SVG attributes, not CSS transforms).
  Once you are past ~45% of the viewport it fades in as a real **Back to top** button; it is
  disabled while you are already at the top and returns focus to the hero when used,
- parallax on the hero artwork and the Pushpak diagram (`data-par` speed multipliers).

Parallax is skipped when motion is off; the progress line and moon still track scroll, since
they follow the user's own scrolling rather than animating on their own.

### Mobile menu

Below 1080px the inline nav collapses into a **Menu** button — the bars rotate into a cross
and the word becomes **Close**; below 560px the word is visually hidden but remains the
accessible name. It opens `#mobile-nav`: the panel slides down and fades, the page behind it
is locked with `html.nav-open`, and a long list scrolls inside the panel instead of pushing
content off screen. It closes on a link tap, on `Escape` (focus returns to the button), and on
resize back to desktop width; `aria-expanded`, the button's label and the `[hidden]` state
all follow. `index.html` requests the css/js with a `?v=` stamp — bump it if you edit a
stylesheet or script and the browser keeps serving the old copy.

### Ambience: drone + score

The header **Ambience** button starts music, not just weather. Two layers are synthesised live
with the Web Audio API the moment you click it — no audio file, no autoplay:

- a **bed**: three low oscillators on an A pedal through a slowly sweeping low-pass, plus a
  band-passed noise loop standing in for a crowd heard from far away,
- a **score**: a four-bar loop at 68 BPM over Am – F – C – G, one chord per bar, voiced as a
  detuned pad, a bass note on beats 1 and 3, an eighth-note arpeggio and a sparse one-note melody.
  Each voice is an oscillator through its own low-pass with a linear attack and an exponential
  release, so notes swell and decay instead of clicking on and off.

Bars are queued by a lookahead scheduler: a 120 ms tick schedules anything starting in the next
1.4 s against `AudioContext.currentTime`, so the groove holds its timing even when the browser
throttles the tab. A compressor on the master keeps the added voices from clipping the bed, and
the score sits on its own sub-bus at 0.8 so it mixes against the drone rather than stacking on
top of it.

The whole thing ramps in over 1.6 s at a low level, stops scheduling and ducks to silence while
the tab is hidden, and the choice is deliberately never remembered — a returning visitor is asked
again.

## Shortlist

A landing page that only links outward has no way to answer "so what would I actually go to?",
so every competition, workshop and event card carries an **Add to plan** toggle that JavaScript
appends to it (the image-only cards are skipped). Picks collect in the **Your shortlist** panel
at the top of the closing section: each row names the item and its category, has its own remove
button, and the panel counts them out loud through an `aria-live` region.

The list is stored in `localStorage` under `tf-plan` as `{slug, title, kind}` objects, keyed by
category + title so the same words in two lanes stay distinct. Nothing leaves the browser, there
is no account, and clearing it removes the key entirely. With storage unavailable (private mode,
locked-down origins) the toggles still work for the visit and simply forget on reload.

## Links out

Competitions, workshops, Ignite, accommodation, College Ambassador, contact and the social
profiles all point at the live `techfest.org` properties, opened in a new tab.
