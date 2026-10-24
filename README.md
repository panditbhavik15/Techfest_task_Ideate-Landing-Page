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
css/styles.css      design tokens, layout, motion (Space Grotesk, #0A0A0C / #FFD700)
js/main.js          category tabs, motion toggle, scroll reveal, mobile nav, marquee
assets/img          generated 2D artwork (webp) + favicon.svg
assets/fonts        self-hosted Space Grotesk 400/500/700 latin woff2
```

## Motion

Animations are gated behind `html.motion-on`, so nothing moves unless JavaScript opts in.
The header **Motion** control sets the state and stores it in `localStorage`
(`tf-motion`). With no stored choice, the page follows `prefers-reduced-motion`.

### Scroll behaviour

One scroll handler publishes a `--p` progress value (0 → 1) on `<html>` and drives:

- the gold progress line under the header,
- the fixed **moon-phase badge** bottom-right — the moon waxes and its satellite orbits as
  you descend, reset to new moon at the top (set via SVG attributes, not CSS transforms),
- parallax on the hero artwork and the Pushpak diagram (`data-par` speed multipliers).

Parallax is skipped when motion is off; the progress line and moon still track scroll, since
they follow the user's own scrolling rather than animating on their own.

### Ambient sound

The header **Ambience** button starts a synthesised night-drone bed built live with the Web
Audio API — three low oscillators through a slowly sweeping low-pass, plus a band-passed
noise wash for crowd distance. No audio file, no autoplay: the graph is created on the first
click, ramps in over 1.6 s at a low level, and ducks to silence when the tab is hidden.
The choice is deliberately never remembered.

## Links out

Competitions, workshops, Ignite, accommodation, College Ambassador, contact and the social
profiles all point at the live `techfest.org` properties, opened in a new tab.
