# Techfest — concept landing page

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
js/platform.js      the Fest OS modules: crew, live day, judging, engage, payouts
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

### Three listening levels

Next to the button is a **Low / Med / Loud** pick (radio inputs named `lvl`, master gains
0.032 / 0.055 / 0.086). Changing it while the drone plays just re-ramps the master over the same
1.6 s curve; the bar scheduler is untouched, so the groove never stutters to a restart. Unlike the
on/off choice, the *level* is remembered (`tf-level`) — how loud you left it is a preference, not a
consent question.

The Fest OS modules ask for a confirmation blip through a `tf:ping` document event. It is only ever
heard while the ambience is already running, so no interaction can startle with sound.

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

## Fest OS

`#fest-os` covers the part of a festival that is not browsing: who is on my team, where the day
actually is, how I was scored, what happens after I win. Five tabs on one rail — and because the
ARIA tab engine in `js/main.js` is generic over `[role="tablist"]`, the module rail got the roving
tabindex and arrow-key behaviour for free.

Everything in it is **sample data written for this review**. No module has a server, no record is
real, nothing typed leaves the device: state lives in `localStorage` under `tf-crew`, `tf-live`,
`tf-judge`, `tf-hunt`, `tf-net` and `tf-pay`. Each module ends with a `.mod-note` naming what a live
deployment would need — an auth boundary, a payout instrument chosen after KYC, a container for the
code runner.

- **Crew** — a find-a-teammate form (skills, event lane, what you are still short of) against six
  invented builder profiles, and a pit-channel chat with unread badges and canned sample replies.
- **Live day** — a demo clock that starts at 11:12 and walks the corridor toward the 19:00 halt at
  real time, 1 min/sec or 5 min/sec; a delay tracker where one drifting session pushes everything
  behind it; the venue floor plan with nine searchable pins; a leaderboard and a seven-heat bracket
  you call up quarter by quarter. The clock only moves while that panel is showing and the tab is
  visible.
- **Judging** — a weighted rubric (Innovation 30 / Execution 30 / Documentation 20 / Presentation
  20) with 0–10 marks, live per-criterion points, a warning when the weights stop adding to 100
  since the score normalises across them, lock and unlock, and a CSV export that doubles every quote
  inside a field. Beside it, an evaluator that compiles a submission in a Web Worker built from a
  Blob and terminates it after 1.5 s per case — plus a note stating plainly that a worker has no CPU,
  memory or network limits and is therefore not a security boundary.
- **Engage** — a six-stop campus hunt whose placards unlock in order, drawn on the same floor plan
  with the walked route estimated in metres and minutes, and an alumni and recruiter board: eight
  profiles with no real names and employers described rather than named, search, ten filters, and
  saved intro requests as removable chips.
- **Payouts** — a seven-claim ledger over five stages, with a median claim-to-money figure, a stage
  screen, three orders, a per-claim stage trail and a reference lookup. The lookup is deliberately
  unkind: an unknown reference gets "nothing matches" and no hint about whether the number is real,
  because that confirmation is the entire attack.

Three conventions hold the section together:

- every dynamic node comes from a `node(tag, class, text)` helper and `textContent` — `innerHTML`
  appears nowhere in `js/platform.js`, so a value typed into any field cannot become markup;
- every interval is guarded on `document.hidden` *and* on its own panel's `.is-on` class, so a
  backgrounded tab pays for no animation it cannot see;
- every state reader re-validates what it takes out of storage — numbers must actually be numbers
  (`isFinite(null)` is true, which silently re-scored a blank sheet once), stage indices must be in
  range, saved ids must exist in the sample set — because a hand-edited store must not be able to
  fake a locked verdict, an unsolved stop or a credited claim.

## Links out

Competitions, workshops, Ignite, accommodation, College Ambassador, contact and the social
profiles all point at the live `techfest.org` properties, opened in a new tab.
