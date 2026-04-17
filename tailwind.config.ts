import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        "bg-primary":      "var(--bg-primary)",
        "bg-secondary":    "var(--bg-secondary)",
        "bg-tertiary":     "var(--bg-tertiary)",
        "bg-chat":         "var(--bg-chat-surface)",
        "bg-input":        "var(--bg-input)",
        // Text
        "text-primary":    "var(--text-primary)",
        "text-secondary":  "var(--text-secondary)",
        "text-muted":      "var(--text-muted)",
        // Accents
        "copper":          "var(--accent-copper)",
        "copper-dim":      "var(--accent-copper-dim)",
        "olive":           "var(--accent-olive)",
        // Borders
        "border-subtle":   "var(--border-subtle)",
        "border-active":   "var(--border-active)",
        // Decisions
        "verdict-silent":  "var(--decision-silent)",
        "verdict-notify":  "var(--decision-notify)",
        "verdict-confirm": "var(--decision-confirm)",
        "verdict-clarify": "var(--decision-clarify)",
        "verdict-refuse":  "var(--decision-refuse)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
