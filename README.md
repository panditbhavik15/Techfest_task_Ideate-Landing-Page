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

Opening `index.html` directly also works; a server keeps the self-hosted fonts and `fetchpriority`
hints behaving the same as production, and it is required for the manifest — `file://` origins
cannot register one, so the install prompt and the standalone window only appear over HTTP.

## Layout

```
index.html          markup + all copy
css/styles.css      design tokens, liquid glass, layout, motion, print sheet (Space Grotesk, #0A0A0C / #FFD700)
js/main.js          category tabs, motion toggle, scroll reveal + section rail, mobile nav,
                    the searchable zonal board, pointer spotlight, shortlist and its
                    export, ambience
js/platform.js      the Fest OS modules: crew, live day, judging, engage, payouts
manifest.webmanifest PWA manifest (standalone display, #0A0A0C theme, three icon sizes)
assets/img          generated 2D artwork (webp), favicon.svg, the 1200x630 og-farside.jpg
                    share card and the icon-192 / icon-512 / apple-touch-icon PNGs
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

## Depth and the pointer

Three layers sit under and over that glass: a fixed **aurora** (three large radial washes in gold,
`--cool` and `--violet`, plus per-section washes so each band has its own temperature), a **film
grain** on `body::after` at 5.5% in `overlay`, and an 18px corner radius everywhere a panel meets
the eye. The grain is above the content at `z-index:45` — under the sticky header, over everything
else — and neither layer animates, so the depth survives reduced motion instead of being part of
what the Motion switch gives back.

A **section rail** of eight dots lives in the left gutter from 1080px. Names appear only from
1440px, because below that an eight-character label would sit on the headline it points at; in
between the label is clipped out of the layout and the hit area but stays the link's accessible
name. The active dot is written by the same scroll pass that drives the progress line and the moon,
after all eight rects have been read, so one scroll event costs one layout pass.

Hovering a glass panel lights it from the cursor: one delegated `pointermove` listener writes
`--gx`/`--gy` on the surface under the pointer, and a negative-z-index pseudo inside the panel's own
`isolation` paints the radial over its glass and under its text. Coordinates are percentages of that
box rather than the viewport, so the light holds its place through the hover lift and when the page
scrolls under a still cursor. Touch is ignored — a tap has nowhere to rest. The spotlight is a
colour change and stays on with motion off; the 2px lift that accompanies it is a movement and does
not.

Type got the same pass: the hero runs to 5.6rem at desktop widths with `line-height:.99`, section
heads to 3.25rem, and `text-wrap:balance`/`pretty` keep short headings from orphaning a word. The
accent word in the hero is gradient-clipped, inside `@supports (background-clip:text)` so an
unsupported browser keeps the flat gold rule above it rather than an invisible word — and the glow
is dropped in that block, since a `text-shadow` under transparent text paints as a solid blob.

## Shareable

The head carries Open Graph and Twitter card tags, a `manifest.webmanifest` link, an
`apple-touch-icon`, and `preload` hints for the hero artwork and the two heaviest font weights —
`crossorigin` on the font hints is not optional, since without it the preloaded response fails the
CORS check and the file is fetched a second time. The preview card is `assets/img/og-farside.jpg`,
a 1200x630 render in the same Farside language as the artwork: gold crescent, silhouetted domes and
rocket gantry, no lettering in the image because the title arrives through `og:title`.

The JSON-LD `Event` deliberately has no `startDate` or `endDate`. Those are the two fields search
engines want most and the two this page refuses to invent — a guess in structured data is worse than
an omission, because crawlers repeat it as fact. Add them here and to the hero's `.tbc` span when
the real dates are known.

`og:image` and the manifest icon paths are relative, which is right for the local server and for a
deploy at a domain root; crawlers want absolute URLs, so replace the two image values with the full
origin when publishing.

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

The header has a second, narrower breakpoint at 1340px. With the words **Ambience** and **Motion
off** shown, the row measured 12px wider than the 1240px column at a 1280px laptop — the single most
common width there is — and the page scrolled sideways by that much. The words go to accessible-name
only across that band and the nav and control gaps tighten, which is also what keeps a six-link nav
from being squeezed into wrapping a link onto a second line. The words reappear above 1340px, where
the row overhangs the column's right edge by ~120px; that overhang predates this pass and is a
spacing trade-off rather than a break, but it is the reason the collapse exists at all.

### Ambience: drone  +  score

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

## Zonals: one board, fourteen hosts

`#zonals` carries the fourteen host campuses listed on the official competitions page as a single
searchable board: one text field matched against city, institute and date, seven zone chips, and a
counted line announced through `aria-live`.

The fourteen are plain `<li class="z-cell">` markup and the script only ever sets `hidden` on them,
so the list is readable with JavaScript off and on paper, and no city exists twice. `.z-cell` is
`display:grid`, which would beat the browser's own `[hidden]` rule, so `.z-cell[hidden]` is
restated in the sheet next to the two other `[hidden]` overrides that section needs.

There used to be a second copy of this list: a ticker that drifted the same fourteen past the
header on a forty-six second loop. It was atmosphere you could not use, it doubled its own row in
`innerHTML` for the seamless loop, and the board read its data out of it, which made boot order
load-bearing for no benefit. Both it and the marquee engine are gone.

The zone labels are this page's own reading of where each host sits geographically — Techfest's
competitions page does not group them that way — which is said out loud in the `.z-aside` under the
board rather than left for the visitor to assume.

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

A list you cannot hand to anyone is a to-do rather than a plan, so the panel ends in three exits:
**Copy as text** puts the picks on the clipboard grouped by lane, **Download CSV** writes
`techfest-plan.csv` from a Blob for a spreadsheet, and **Print plan** puts them on paper (see
[On paper](#on-paper)). All three read the same in-memory array and none of them sends it anywhere.
The `role="status"` line under the panel reports what happened, including the
refusal path: the asynchronous clipboard API falls back to a hidden textarea and `execCommand`, and
if even that is blocked it says so instead of claiming a copy.

## On paper

The shortlist's third exit is a print stylesheet, and it has two paths. `js/main.js` fills the
empty `.print-sheet` at the end of the body and puts `print-plan` on `<html>`, and the print media
block then hides every other body child: with picks, Ctrl/Cmd+P or **Print plan** yields one clean
sheet of them, grouped by lane with a count per group and a line saying the sheet is not a booking.
With no picks the class is never set and the page prints as itself, because a sheet that announces
"nothing" is a worse answer than whatever the visitor meant to print. `beforeprint` rebuilds the
sheet, so the browser's own print menu takes the same path as the button.

Flattening the page for paper needed one decision worth stating: this design is built from
translucent dark fills under near-white text, and on paper that breaks twice — the fills print as
grey smudges and the text disappears. Rather than restate the twenty-odd component backgrounds that
carry a literal `rgba`, the print block flattens every surface with one universal rule and
re-derives the colour tokens for paper, so components follow without being named.

The rest is what a screen affordance is not worth ink over: the fixed layers, the section rail, the
moon button, the header and every control that would ask the reader to click a sheet of paper are
removed; `.pick` is restated at its own specificity (`.card .pick`) because the flat rule loses to
it; scroll reveal is forced to opacity 1 so a page that was never scrolled does not print blank
sections; `body`'s `overflow-x:hidden` becomes visible so nothing is clipped to the print viewport;
and external links in the footer, the zonals note and the CTA rows print their own URL after the
label, which is the only reason a printed link exists.

One section stays off paper deliberately: **Fest OS does not print at all**. It is sliders,
chat inputs and a rubric over data that is labelled sample, and on paper that reads like a result
rather than a mock-up. The zonal board does print, minus its search row, and a cell the visitor
screened out stays screened out.

One expected oddity for an automated audit: the sheet opens with its own `<h1>`, so a heading count
taken over the raw markup finds two. It is inside a `display:none` subtree on screen and the only
heading on paper, where the page's own `<h1>` is hidden along with the rest of the body's children.

## Fest OS

`#fest-os` covers the part of a festival that is not browsing: who is on my team, where the day
actually is, how I was scored, what happens after I win. Five tabs on one rail — and because the
ARIA tab engine in `js/main.js` is generic over `[role="tablist"]`, the module rail got the roving
tabindex and arrow-key behaviour for free.

Everything in it is **sample data written for this review**. No module has a server, no record is
real, nothing typed leaves the device: state lives in `localStorage` under `tf-crew`, `tf-live`,
`tf-judge`, `tf-hunt`, `tf-net` and `tf-pay`. Each module ends with a `.mod-note` naming what a live
deployment would need — an auth boundary, a payout instrument chosen after KYC, a deadline that
closes the sheet and refuses the rewrite.

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
  inside a field.
- **Engage** — a six-stop campus hunt whose placards unlock in order, drawn on the same floor plan
  with the walked route estimated in metres and minutes, and an alumni and recruiter board: eight
  profiles with no real names and employers described rather than named, search, ten filters, and
  saved intro requests as removable chips.
- **Payouts** — a seven-claim ledger over five stages, with a median claim-to-money figure, a stage
  screen, three orders, a per-claim stage trail and a reference lookup. The lookup is deliberately
  unkind: an unknown reference gets "nothing matches" and no hint about whether the number is real,
  because that confirmation is the entire attack.

Three conventions hold the section together :

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
