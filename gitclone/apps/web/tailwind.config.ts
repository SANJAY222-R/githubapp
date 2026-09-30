import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: {
          default: "var(--color-canvas-default)",
          subtle: "var(--color-canvas-subtle)",
          inset: "var(--color-canvas-inset)",
          overlay: "var(--color-canvas-overlay)",
        },
        surface: {
          DEFAULT: "var(--color-canvas-default)",
          container: "var(--color-canvas-subtle)",
          "container-low": "var(--color-canvas-default)",
          "container-high": "var(--color-canvas-inset)",
          "container-highest": "var(--color-canvas-inset)",
          dim: "var(--color-canvas-default)",
        },
        "on-surface": "var(--color-fg-default)",
        "on-surface-variant": "var(--color-fg-muted)",
        outline: "var(--color-fg-muted)",
        "outline-variant": "var(--color-border-default)",
        primary: {
          DEFAULT: "var(--color-accent-fg)",
          container: "var(--color-accent-emphasis)",
        },
        secondary: {
          DEFAULT: "var(--color-success-fg)",
          container: "var(--color-success-emphasis)",
        },
        tertiary: {
          DEFAULT: "var(--color-merged-fg)",
          container: "var(--color-merged-emphasis)",
        },
        error: {
          DEFAULT: "var(--color-danger-fg)",
          container: "var(--color-danger-emphasis)",
        },
        border: {
          default: "var(--color-border-default)",
          muted: "var(--color-border-muted)",
          subtle: "var(--color-border-subtle)",
          accent: "var(--color-border-accent)",
        },
        fg: {
          default: "var(--color-fg-default)",
          muted: "var(--color-fg-muted)",
          subtle: "var(--color-fg-subtle)",
          onEmphasis: "var(--color-fg-on-emphasis)",
        },
        accent: {
          fg: "var(--color-accent-fg)",
          emphasis: "var(--color-accent-emphasis)",
          muted: "var(--color-accent-muted)",
          subtle: "var(--color-accent-subtle)",
        },
        success: {
          fg: "var(--color-success-fg)",
          emphasis: "var(--color-success-emphasis)",
          muted: "var(--color-success-muted)",
          subtle: "var(--color-success-subtle)",
        },
        attention: {
          fg: "var(--color-attention-fg)",
          emphasis: "var(--color-attention-emphasis)",
          muted: "var(--color-attention-muted)",
          subtle: "var(--color-attention-subtle)",
        },
        danger: {
          fg: "var(--color-danger-fg)",
          emphasis: "var(--color-danger-emphasis)",
          muted: "var(--color-danger-muted)",
          subtle: "var(--color-danger-subtle)",
        },
        merged: {
          fg: "var(--color-merged-fg)",
          emphasis: "var(--color-merged-emphasis)",
          muted: "var(--color-merged-muted)",
          subtle: "var(--color-merged-subtle)",
        },
        diff: {
          add: {
            bg: "var(--color-diff-add-bg)",
            fg: "var(--color-diff-add-fg)",
            lineNum: "var(--color-diff-add-line-num)",
          },
          delete: {
            bg: "var(--color-diff-delete-bg)",
            fg: "var(--color-diff-delete-fg)",
            lineNum: "var(--color-diff-delete-line-num)",
          },
          hunk: {
            bg: "var(--color-diff-hunk-bg)",
            fg: "var(--color-diff-hunk-fg)",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "display": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        "h2": ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h3": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "600" }],
        "body": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "caption": ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }],
        "label-md": ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        "label-sm": ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.02em", fontWeight: "500" }],
        "code-md": ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "code-sm": ["0.6875rem", { lineHeight: "1rem", fontWeight: "400" }],
      },
      spacing: {
        "0.5": "0.125rem",
        "1": "0.25rem",
        "1.5": "0.375rem",
        "2": "0.5rem",
        "2.5": "0.625rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "7": "1.75rem",
        "8": "2rem",
        "sidebar-collapsed": "3rem", // 48px
        "sidebar-expanded": "13.75rem", // 220px
        "pane-tree": "17.5rem", // 280px
        "drawer": "20rem", // 320px
      },
      borderRadius: {
        xs: "3px",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        full: "9999px",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
      },
    },
  },
  plugins: [],
};

export default config;
