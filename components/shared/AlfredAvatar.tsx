"use client";

/**
 * alfred_ avatar mark.
 *
 * A clean typographic/geometric mark — NOT animated eyes, NOT emoji-adjacent.
 * Renders the brand ligature "a_" in IBM Plex Mono inside a precise
 * rectangular frame. The underscore blinks at a human-readable cadence
 * when state === "thinking". All other states are static or near-static.
 *
 * States:
 *   idle     — static mark, no animation
 *   thinking — underscore blinks (caret-blink keyframe)
 *   decided  — accent border flash, then back to idle
 *   wink     — brief opacity dip (used for SILENT verdict acknowledgment)
 *
 * Source: UI-UX-DESIGN.md §2 (avatar intent), DESIGN.md §2.2 (no emojis)
 */

type AvatarState = "idle" | "thinking" | "decided" | "wink";

interface AlfredAvatarProps {
  state?: AvatarState;
  /** px width of the outer frame — height is auto proportional */
  size?: number;
  className?: string;
}

export function AlfredAvatar({
  state = "idle",
  size = 32,
  className = "",
}: AlfredAvatarProps) {
  const fontSize   = Math.round(size * 0.38);
  const padding    = Math.round(size * 0.18);
  const radius     = Math.round(size * 0.12);

  const borderColor =
    state === "decided"
      ? "var(--accent-copper)"
      : "var(--border-subtle)";

  const caretStyle: React.CSSProperties =
    state === "thinking"
      ? { animation: "caret-blink 1.1s step-end infinite" }
      : {};

  return (
    <span
      aria-label="alfred_"
      role="img"
      className={className}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        border:         `1px solid ${borderColor}`,
        borderRadius:   radius,
        padding:        `${Math.round(padding * 0.5)}px ${padding}px`,
        fontFamily:     "var(--font-mono)",
        fontSize:       fontSize,
        fontWeight:     500,
        lineHeight:     1,
        letterSpacing:  "-0.02em",
        color:          "var(--accent-copper)",
        backgroundColor:"var(--bg-secondary)",
        userSelect:     "none",
        flexShrink:     0,
        height:         size,
        transition:     "border-color var(--transition-fast)",
        opacity:        state === "wink" ? 0.45 : 1,
      }}
    >
      a
      <span style={caretStyle}>_</span>
    </span>
  );
}
