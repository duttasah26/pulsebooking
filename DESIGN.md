---
name: Pulse Rooms
description: The front desk register. Hyperlegible type, ink on paper, one green action per screen.
colors:
  canvas: "#f3f2ee"
  surface: "#ffffff"
  surface-2: "#efeee9"
  line: "#e3e1d9"
  grid-line: "#d6d3c9"
  field-line: "#948b80"
  ink: "#261f1c"
  muted: "#6f655c"
  accent: "#1d6b50"
  accent-strong: "#155a43"
  accent-soft: "#e6f0ea"
  accent-ink: "#ffffff"
  danger: "#a3301e"
  danger-soft: "#f8e7e3"
  hold: "#f6ebc8"
  hold-edge: "#a87708"
  hold-ink: "#7a4e05"
  tint: "rgb(38 31 28 / 0.06)"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Atkinson Hyperlegible Next"
    fontSize: "20px"
    fontWeight: 700
  headline:
    fontFamily: "Atkinson Hyperlegible Next"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "Atkinson Hyperlegible Next"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  footnote:
    fontFamily: "Atkinson Hyperlegible Next"
    fontSize: "15px"
    fontWeight: 400
  figures:
    fontFamily: "Atkinson Hyperlegible Mono"
    fontWeight: 600
rounded:
  md: "6px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px touch, 36px pointer"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
---

## Overview

A front desk tool, not a showcase. One person, often older, often on a phone, often mid-conversation with a guest. The
thesis is **the register**: ink on paper, every room number, date and count set in hyperlegible figures, one green action
per screen, and every state told in words and shape as well as colour. The thing it is remembered by is its type: Atkinson
Hyperlegible, drawn by the Braille Institute for low vision readers, which is who works this desk.

## Colors

Warm neutrals from the brand palette (dimgray, gainsboro, near black) on a paper canvas `#f3f2ee`, white surfaces with
hairline edges. **One accent, ledger green `#1d6b50`** (white on it 6.4:1): the primary action, the chosen tab in the phone
tab bar, check-in. Never decoration. Golden and peru accents were rejected and must not return.

- **Ink means "this one is on."** A tool that is on, the chosen filter, the chosen settings tab, the selection bar under the
  calendar and the mode banner are solid ink with white words. Selection inside a picker (a colour, a status, a room) is a
  2px ink ring with a gap.
- **Straw yellow means on hold, and nothing else**: the hold status, the On Hold tool and its banner, Keep On Hold.
  Always with a dashed edge, so it reads without colour.
- **Brick red means leaving, delete or cancel**; errors sit on `danger-soft` with brick words, no thick border.
- Tools have no colours of their own. Notices that are not errors (possible duplicates, an unsaved change) are white or
  `surface-2`, never yellow.
- Booking, guest and floor colours are muted tints (like coloured index cards) with a firmer edge. They carry meaning on
  the calendar and are never reused for decoration.
- Secondary text is `muted` (5.7:1 on white) and never lighter. Field edges are `field-line` (3.35:1). Light mode only;
  the page tells the browser not to darken it.

## Typography

**Atkinson Hyperlegible Next** for every word, **Atkinson Hyperlegible Mono** for every number that identifies
something: room numbers, dates in the grid, times, counts, the clock. Words beside a number stay in Next ("Room" is Next,
"301" is Mono). Its 0 is slashed and its 1, l and I are distinct, on purpose.

| Style | Size | Weight | Use |
|---|---|---|---|
| display (`t-display`) | 28px | 700 | page titles, the calendar heading |
| title (`t-title`) | 20px | 700 | sheet, panel and section titles |
| headline (`t-headline`) | 17px | 600 | names in lists, card titles, setting names |
| body | 16px | 400 | anything you read or press on a phone |
| footnote (`t-footnote`) | 15px | 400, muted | help under a field or a title |
| group (`t-group`) | 15px | 600, muted | the small heading over a group of rows; never uppercase |

Controls are 16px on touch and 15px with a pointer, weight 500; primary buttons 600. Nothing lighter than 400. 12 to 14px
only inside the dense calendar grid.

## Layout

Phone first. Touch targets are 44px or more; the dense grid is the one exception, and zoom is its remedy. A phone held
sideways (the `short:` variant) swaps the toolbar rows for a slim **tool column on the left** because it has width but
no height; the booking form always opens as a **bottom sheet** there, never beside the calendar. On wide screens the booking panel is a card that **lies over the right
side of the calendar**, as tall as the calendar, so opening or closing it never resizes the calendar. The calendar always
leaves a slim column at its right (the width of the folded tab). The room bar sits on the calendar's right edge, which the
open panel covers; fold the panel or use the wheel to scroll the rooms. Nothing scrolls
sideways except the calendar itself.

## Elevation & Depth

Flat. Cards are white with a hairline and no shadow. Only things that float over the page get a shadow (sheets,
popovers, toasts, the unsaved change card). The header and the phone tab bar are white at 95% with a light blur.

## Shapes

One corner everywhere: 6px. No pills and no circles on controls, except the two round dots that stretch a booking bar (dots in the occupancy month are data).
Status is told by shape too: on hold is dashed and hatched.

## Components

- **Buttons**: filled, never outlined, one corner, and never restyled inline: pick one size and one style.
  Sizes (touch / pointer): `btn-sm` 40/32px for chips, quick filters and small actions inside a row or a message; `btn`
  44/36px, the default; `btn-lg` 48px for the actions at the foot of a form, sheet or panel; `btn-block` is `btn-lg` at
  full width; `btn-icon` makes any of them square. Every button in a row shares one size; style, not size, says which
  matters more. Styles: `btn` (a 6% ink tint that deepens on hover and press), `btn-primary` (green, at most one per
  view, never destructive), `btn-quiet` (no fill: Cancel, Back, Clear), `btn-danger` (brick on a brick tint: delete,
  cancel a stay), `btn-hold` (straw with a dashed edge: put on hold, keep on hold), `btn-on` (solid ink: a chosen
  filter, tab or tool), `btn-inverse` (on an ink bar). Forms keep 44px and 16px type on every screen. Nothing shrinks
  or lifts when pressed; the press is shown by colour.
- **Placement**: the way out on the left, the action on the right (Cancel, then Save View; Back, then Next). A footer
  with a decision stacks the primary on top and the destructive one under it. An action appears once on a screen:
  with the panel open beside the calendar, the selection bar only counts and lets go, and Put on Hold and Delete live
  at the foot of the panel. A list never fills with green: row actions (Confirm a hold, Restore) are plain `btn-sm`.
  Search comes before Filter & Sort. Switching between a booking's details and its form starts at the top.
- **Labels**: title case, verb first, the same name through the whole flow (Save Changes on bookings and guests, Put
  on Hold everywhere). An ellipsis only when the button opens more choices (Go to…, Custom range…).
- **Icons**: Phosphor only, **bold** by default (its stroke matches Atkinson), **fill** for the chosen tab or tool. A
  text button carries no icon unless the icon carries meaning: add (plus), delete (trash), hold (clock), help (question).
  Cancel, Save, Confirm, Back, Retry, Edit and View are words alone. Field labels are words alone. Card titles in the booking
  forms carry a small muted icon, and Check-in and Check-out carry their symbols (green, brick), so stacked cards can be told apart.
- **Segmented control** (`seg` and `seg-item`): a tinted track with the chosen segment raised in white. Used for the main
  navigation, the calendar views, floors, the booking steps and sort direction.
- **Navigation**: Calendar, Bookings and Guests as a segmented control in the white header, with words always visible;
  Settings and Account as icon buttons at the far right beside the India clock. On a phone, a five tab bar with filled
  symbols and a green label for the current tab.
- **Tools** (left column or toolbar), in three chunks: **Book** (New, On Hold), **Look** (Open, Select, Hand), **Fix**
  (Undo, Redo). Monochrome; the tool that is on is solid ink. New fills green and On Hold fills straw while on, because
  that is what they make. The pointer over the calendar wears the active tool's icon.
- **Mode banner**: On Hold, Select and Hand change what a tap does, so a 56px bar under the calendar says which mode is on
  and how to use it, with **Done**. It is solid ink with white words (On Hold: straw with a dashed edge; New Booking:
  green). The selection bar that replaces it once something is picked is the same height and also ink.
- **Views**: Timeline and Month scroll sideways under the booking panel; Occupancy and Day do not scroll, so they
  make room for the open panel instead of sliding under it. Month bars set the name level at the top and wrap it word
  by word down the bar; text is never turned on its side. Day uses the check-in and check-out symbols (green, brick)
  for Arriving and Leaving, and Free rooms are quiet buttons whose colour lives only in the room's key tag. The line
  under a view's strip only counts; the date or month is already the title. On a phone, counts that would crowd
  (Occupancy's 3/18, the Day strip's +1 and -1) are left to the screen reader label and the line below.
- **Today line**: beside the title, one line of counts (arriving, leaving, staying), each a symbol, a figure and a word.
  No tiles.
- **Lists** (bookings, guests): one white card of rows with hairline dividers. A booking row starts with a small square in
  its colour (no side stripe), then the name in headline type, the room as a floor coloured key tag in figures, the dates
  (check-in green, check-out brick) and the status tag. A guest row starts with the guest's initials in a tinted square.
- **Filter panel**: Show is a list where the chosen filter is solid ink; folded sections are plain rows divided by
  hairlines, with an ink count when something inside is on.
- **Cards**: white on the canvas, a hairline edge, 20px inside (24px for settings groups), no shadow. A card holds one
  idea and is never inside another card: anything inside a card is a plain row, a hairline divider or a tinted well
  (the date picker's two ends, a note). A booking reads as two cards: who and where, in the booking's own colour
  (status tag, name, contact, room key tags), then when (check-in, check-out and the nights in one white card). A card
  never holds a single fact on its own; the room sits in the first card, not in a card of its own.
- **Forms**: one card per group of related fields; never a card inside a card. Errors sit at the top of the step on
  `danger-soft` and say what to do. A dropdown only for long lists (times); a handful of choices are buttons.
- **Toast**: an ink bar at the bottom left with white words and a light green Undo.
- **Sheet**: white, title in the title style, a tinted square X; rises from the bottom on phones and slides in from the
  right on wider screens; fades only with reduced motion. Focus moves in, stays in, and goes back when it closes.
- **Motion**: sheets, docks and steps arrive with a short rise or fade; nothing loops, bounces, shakes or shimmers.
  Picked bookings have a still dashed edge. Reduced motion keeps only fades.
- **Behaviour** (unchanged by the redesign): booking bars say more the more room they have and never cut a word in half;
  editing draws a dashed ghost bar at the new place; Undo is the tool pane button and Ctrl+Z on the calendar at desktop
  width, a toast elsewhere; keys T, N, Esc and Ctrl+Z; two taps place a hold; a hold is never created twice by accident.

## Glossary

One word per idea, everywhere in the interface and the docs.

| Word | Means | Never use for |
|---|---|---|
| On Hold (tool) | the tool that puts a room on hold; its banner and button are amber | the status |
| On hold / hold | a room kept for someone, not yet confirmed | the tool or the press gesture |
| Confirm Booking | turn a hold into a real booking | anything else |
| Press and hold | keep a finger or button down (Hold to Delete) | status or tool |
| Open | click or tap a booking to see it | picking several |
| Select | tick bookings with a plain click or tap (no Ctrl) to move, stretch or delete them together | opening one |
| Hand | drag the calendar to move around it | scrolling a list |
| Done | leave a mode and return to Open | closing a sheet (that is Close) |

## Do's and Don'ts

- Do show one clear next step, with a number, when a task has steps.
- Do keep text short: a label, then at most one line of help.
- Don't add a second accent colour, a second radius, a colour per tool, or Lucide icons (Phosphor only).
- Don't put an icon in front of a label that already says what it is.
- Don't use dashes in UI text.
- Don't put controls on top of the calendar. Zoom, tools and Undo live outside it. The only things drawn over it are the
  confirm bar after a first tap, the booking bars' own handles, and the booking panel on wide screens (which never
  resizes the calendar).
- Don't add a colour for decoration. Colour means status, floor, or the one green accent. Booking and guest colours are
  optional and limited to four swatches plus Custom.
