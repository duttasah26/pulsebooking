---
name: Pulse Rooms
description: A calm, high-contrast booking desk for a small property, built for older eyes and thumbs.
colors:
  canvas: "#f3f3ef"
  surface: "#ffffff"
  surface-2: "#ecece6"
  line: "#deded5"
  ink: "#261f1c"
  muted: "#6f655c"
  accent: "#047857"
  accent-ink: "#fafafa"
  accent-soft: "#d8f0e6"
  danger: "#b42318"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  heading:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 600
rounded:
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    height: "48px"
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
---

## Overview

A front desk tool, not a showcase. One person, often older, often on a phone, often mid-conversation with a guest. The
design language is **plain, large, and certain**: one green action per screen, everything else quiet, and every state
shown in words and shape as well as colour. Nothing decorative; the brand lives in the precise details (hold hatching,
room colours, the logo).

## Colors

Warm neutrals from the brand palette (dimgray, gainsboro, near-black) with **one accent, emerald**. Emerald means "do
this" or "this is chosen". A golden or peru accent was rejected and must not return. Light mode only. Status colours
(confirmed green, on hold yellow with a dashed edge, finished grey) and per-room floor colours carry meaning on the
calendar and are never reused for decoration. Secondary text is `muted` (5:1 on white) and never lighter.

## Typography

One family (Geist), Geist Mono only for room numbers, dates and times. Body and controls are **16px on phones**;
12-14px is allowed only inside the dense calendar grid. Headings 20px semibold. No uppercase eyebrow labels above
headings. Plain sentence case for copy; Title Case for button names that match the product's nouns (New Booking,
Confirm Booking, Hold to Delete).

## Layout

Phone first. Touch targets are 44px or more; the dense grid is the one exception, and zoom is its remedy. A phone held
sideways (the `short:` variant) swaps the toolbar rows for a slim **tool column on the left** because it has width but
no height; the booking form always opens as a **bottom sheet** there, never beside the calendar. Nothing scrolls
sideways except the calendar itself.

## Elevation & Depth

Flat. One small shadow on the primary button; sheets and floating bars use one soft large shadow. No glass, no gradients.

## Shapes

One radius everywhere (8px). Status is told by shape too: on hold is dashed and hatched, so it reads without colour.

## Components

- **Tools** (left column or toolbar), in three chunks: **Book** (New, On Hold), **Look** (Open or Select, Select on touch,
  Hand), **Fix** (Undo, Redo), then Zoom on touch screens. At most four chunks of controls on screen at once. Icon above a
  one-word label, always visible; each tool has its own colour (New green, On Hold amber, Open ink, Select violet, Hand sky), shown on its icon and as its fill while it is on. The pointer over
  the calendar wears the active tool's icon (pencil for On Hold, hand for Hand).
- **Mode banner**: On Hold, Select and Hand change what a tap does, so a banner under the calendar, in the same colour as the tool, says which mode
  is on and how to use it, with a **Done** button that returns to Open. Open shows no banner. On a phone, On Hold returns
  to Open by itself after each hold.
- **Primary button**: filled emerald, semibold, 48px on phones. One per screen or sheet.
- **On Hold flow**: two taps (first night, last night) put the room on hold at once, with an Undo. A hold is confirmed from
  its details with **Confirm Booking**, or kept with **Keep On Hold**. A hold with no guest asks for the guest's name; the
  app never invents a guest from a label. A hold is never created twice by accident (the same rooms and days within two
  seconds count once).
- **New Booking** is a tool like the others and appears once on each screen: first in the tool column (wide screens and a
  phone held sideways) or first in the second toolbar row (portrait phone and tablet). While it is on, nights drawn on the
  calendar are green and the draft bar has an X until the booking is created.
- **Sheet**: rises from the bottom (slides in from the right on tablets and desktop); fades only with reduced motion.

## Glossary

One word per idea, everywhere in the interface and the docs.

| Word | Means | Never use for |
|---|---|---|
| On Hold (tool) | the tool that puts a room on hold; its banner and button are amber | the status |
| On hold / hold | a room kept for someone, not yet confirmed | the tool or the press gesture |
| Confirm Booking | turn a hold into a real booking | anything else |
| Press and hold | keep a finger or button down (Hold to Delete) | status or tool |
| Open | tap a booking to see it (touch) | picking several |
| Select | pick several bookings to act on together | opening one |
| Hand | drag the calendar to move around it | scrolling a list |
| Done | leave a mode and return to Open | closing a sheet (that is Close) |

## Do's and Don'ts

- Do show one clear next step, with a number, when a task has steps.
- Do keep text short: a label, then at most one line of help.
- Don't add a second accent colour, a second radius, or Lucide icons (Phosphor only).
- Don't use dashes in UI text.
- Don't put controls on top of the calendar. Zoom, tools and Undo live outside it. The only things drawn over it are the
  confirm bar after a first tap and the booking bars' own handles.
- Don't add a colour for decoration. Colour means status, floor, or the one emerald accent. Booking and guest colours are
  optional and limited to four swatches plus Custom.
