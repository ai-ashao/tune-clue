# TuneClue UI Language V1 — Signal Console

## Objective

TuneClue should read as a focused, trustworthy music-identification product rather than a generic
starter template.

The visual system is called **Signal Console**.

It is intentionally restrained:

- light technical canvas rather than a dark entertainment landing page;
- one strong signal color;
- a small mint confirmation accent;
- compact controls;
- waveform / signal references expressed through lines, gradients, and micro-labels rather than
  decorative illustrations;
- product value stays above decorative branding.

## Brand primitives

### Color

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#0B1020` | Primary text |
| Canvas | `#F5F7FB` | Page background |
| Signal | `#625DF5` | Primary action / focus |
| Signal Deep | `#4C46D8` | Hover / active |
| Mint | `#41D6A3` | Successful recognition / signal confirmation |
| Sky | `#77A7FF` | Secondary glow |
| Line | `#DDE2ED` | Borders |
| Muted | `#697386` | Supporting text |

Avoid introducing extra saturated colors unless a service brand is genuinely needed.

### Shape

- main product card: 20–22 px radius;
- controls: 10–12 px radius;
- status chips: pill;
- artwork: 14–16 px radius;
- no square dashboard cards with identical weight everywhere.

### Elevation

Use shadow only to establish hierarchy:

1. landing/workbench = strongest;
2. task/account cards = medium;
3. content/FAQ = almost flat.

## Typography

Keep existing Inter Variable + DM Mono.

- H1: Inter, 740–780, tight tracking;
- product labels/status: DM Mono, uppercase, 10–11 px;
- body: 14–16 px;
- button: 12–14 px, 650–720.

DM Mono is a product signal, not a body font.

## Product surfaces

### Homepage

Hierarchy:

```text
Video Song Finder
Find the Song From a Video
Short factual explanation

[ finder console ]

constraints / trust
completion proof
```

The finder console is the hero object. Do not add a separate hero illustration.

### Finder console

The interaction should feel like selecting a signal source:

```text
[ Upload file | TikTok link ]

        upload zone
        file selected

local-file privacy note       Find song →
```

When TikTok is disabled, do not show an empty disabled tab.

### Recognition workbench

The workbench is a second-level product surface:

- dark media stage;
- light control panel;
- one sample-position control;
- one clear primary CTA;
- login/credits states below, not inside the media stage.

### Result

A successful result should immediately communicate:

```text
SONG FOUND
artwork    title
           artist
           album

Spotify / Apple / Deezer

Copy
credits / earn credits
```

Mint is reserved for success labels, not all buttons.

### Earn Credits

This is an optional utility, not a gamified dashboard.

Use two rows only:

```text
WA  WhatsApp      +1     [Share +1]
X   X             +1     [Share +1]
```

No points badges, streaks, achievements, confetti, or progress gamification in V1.

## Copy language

Tone:

- factual;
- short;
- action-first;
- no hype.

Prefer:

- `Find song`
- `Choose the clearest music moment`
- `Song found`
- `Unlock your free song search`
- `Earn free credits`

Avoid:

- `AI-powered magic`
- `Revolutionary`
- `Ultimate`
- `Lightning fast`
- `100% private` when a recognition sample leaves the device.

## Responsive contract

390×844 remains a release gate.

The first mobile viewport should still include:

- H1;
- short description;
- complete finder input;
- primary CTA;
- constraint/trust signal;
- completion summary.

Do not grow the hero simply to showcase branding.
