/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                     OBJECTUARY — AUDIO MANIFEST                     │
 * │                                                                     │
 * │  Every sound used by the site is registered here. To add a sound,   │
 * │  drop an .mp3 into public/audio/ replacing the file.                │
 * │  If a file is missing or empty the system silently skips it.        │
 * │                                                                     │
 * │  All paths are relative to public/ (served at root).                │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// ── Ambient ──────────────────────────────────────────────────────────
export const AMBIENT_SOUNDTRACK = '/audio/background-soundtrack.mp3' // loops throughout the cemetery

// ── Gate ─────────────────────────────────────────────────────────────
export const GATE_OPEN = '/audio/gate-open.mp3'       // gate slides open

// ── Cemetery navigation ──────────────────────────────────────────────
export const ZOOM_IN = '/audio/zoom-in.mp3'
export const ZOOM_OUT = '/audio/zoom-out.mp3'

// ── Tomb interaction ─────────────────────────────────────────────────
export const GRAVE_HOVER = '/audio/grave-hover.mp3'   // +1 Attention chime on click
export const CLICK = '/audio/click.mp3'               // legacy UI click
export const GENERIC_CLICK = '/audio/soundreality-mouse-click-5-381777.mp3' // new generic click sound

// ── Objectuary paper ─────────────────────────────────────────────────
export const SCANNER_HOVERING = '/audio/scanner-hovering.mp3' // scanner appears / paper opens
export const PAPER_HOVERING = '/audio/paper-hovering.mp3'     // paper hover / close

// ── Scanner ──────────────────────────────────────────────────────────
export const SCANNER_LOOP = '/audio/scanner-loop.mp3'         // loops while dragging scanner
export const SCANNING_DONE = '/audio/scanning-done.mp3'       // scan reaches 100%

// ── Scan results (loop until user returns) ───────────────────────────
export const RESULT_CREMATED = '/audio/cremation.mp3'
export const RESULT_BURIAL = '/audio/burial.mp3'
export const RESULT_ORGAN_DONATION = '/audio/organ-donation.mp3'
export const RESULT_PRESERVED = '/audio/preservation.mp3'

// Map scan-result keys to their sound
export const RESULT_SOUNDS = {
  cremated: RESULT_CREMATED,
  burial: RESULT_BURIAL,
  'organ-donation': RESULT_ORGAN_DONATION,
  preserved: RESULT_PRESERVED,
}
