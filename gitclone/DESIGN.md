# GitClone Design System & Style Guide

> Generated from Stitch MCP project `GitClone Design System Guide` (`projects/3979992466396912904`).
> Engineered for high-throughput repository navigation, code review triage, and sub-millisecond tactile feedback.

---

## 1. Brand Philosophy & Design Principles

- **Utilitarian Precision**: Dense, high-legibility developer interface calibrated for marathon debugging and multi-thousand-line pull request diff reviews.
- **Calm, Low-Fatigue Dark Mode Default**: Deep `#0D1117` base backdrop with structured `#161B22` panes, `#21262D` interactive surfaces, and crisp `1px` `#30363D` borders.
- **Dual-Theme Fidelity**: Seamless light mode (`#FFFFFF` canvas, `#F6F8FA` subtle surface, `#D0D7DE` borders) with 100% semantic token parity via `[data-theme="light"]`.
- **Typographic Division of Concern**: `Inter` for structural UI, metadata, and controls; `JetBrains Mono` for commit SHAs, filepaths, diff gutters, and AST syntax.
- **4px Spatial Increment Rhythm**: Compact 32px standard control heights, 28px tree nodes, 36px table rows, and zero excessive skeuomorphic paddings.

---

## 2. Color System & Semantic Tokens

### 2.1 Surfaces & Layout Layers

| Token | CSS Variable | Dark Value (Default) | Light Value (`[data-theme="light"]`) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Default** | `--color-canvas-default` | `#0D1117` | `#FFFFFF` | Primary application window backdrop |
| **Canvas Subtle** | `--color-canvas-subtle` | `#161B22` | `#F6F8FA` | Sidebars, split pane gutters, header bars |
| **Canvas Inset** | `--color-canvas-inset` | `#21262D` | `#EAEEF2` | Card backgrounds, search boxes, tab containers |
| **Canvas Overlay** | `--color-canvas-overlay` | `#161B22` | `#FFFFFF` | Modals, dropdown menus, popovers |

### 2.2 Borders & Structural Outlines

| Token | CSS Variable | Dark Value (Default) | Light Value (`[data-theme="light"]`) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Border Default** | `--color-border-default` | `#30363D` | `#D0D7DE` | Standard structural borders, card outlines |
| **Border Muted** | `--color-border-muted` | `#21262D` | `#D8DEE4` | Internal table row dividers, tree gridlines |
| **Border Subtle** | `--color-border-subtle` | `#1B1F24` | `#E1E4E8` | Faint secondary outlines |
| **Border Accent** | `--color-border-accent` | `#58A6FF` | `#0969DA` | Active tab indicators, focused boundaries |

### 2.3 Typography & Foreground

| Token | CSS Variable | Dark Value (Default) | Light Value (`[data-theme="light"]`) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **FG Default** | `--color-fg-default` | `#F0F6FC` | `#24292F` | Primary titles, body text, active inputs |
| **FG Muted** | `--color-fg-muted` | `#8B949E` | `#57606A` | Subtitles, secondary timestamps, descriptions |
| **FG Subtle** | `--color-fg-subtle` | `#6E7681` | `#6E7781` | Line numbers, gutter indicators, shortcuts |
| **FG On Emphasis** | `--color-fg-on-emphasis` | `#FFFFFF` | `#FFFFFF` | High-contrast text on solid status chips/buttons |

### 2.4 Semantic State Accents & Git Primitives

| State | Role | Dark Value | Light Value | CSS Variables |
| :--- | :--- | :--- | :--- | :--- |
| **Accent / Link** | Primary Brand, Links, Active selection | `#58A6FF` (fg)<br>`#1F6FEB` (emp)<br>`rgba(56,139,253,0.15)` (subtle) | `#0969DA` (fg)<br>`#0969DA` (emp)<br>`#DDF4FF` (subtle) | `--color-accent-fg`<br>`--color-accent-emphasis`<br>`--color-accent-subtle` |
| **Success / Open** | Open PRs/Issues, Passing CI, Additions | `#3FB950` (fg)<br>`#238636` (emp)<br>`rgba(46,160,67,0.15)` (subtle) | `#1A7F37` (fg)<br>`#1F883D` (emp)<br>`#DAFBE1` (subtle) | `--color-success-fg`<br>`--color-success-emphasis`<br>`--color-success-subtle` |
| **Attention / Draft** | Warnings, Draft PRs, In-progress CI | `#D29922` (fg)<br>`#9E6A03` (emp)<br>`rgba(187,128,9,0.15)` (subtle) | `#9A6700` (fg)<br>`#9A6700` (emp)<br>`#FFF8C5` (subtle) | `--color-attention-fg`<br>`--color-attention-emphasis`<br>`--color-attention-subtle` |
| **Danger / Closed** | Closed PRs, Deletions, Errors, Alerts | `#F85149` (fg)<br>`#DA3633` (emp)<br>`rgba(248,81,73,0.15)` (subtle) | `#CF222E` (fg)<br>`#CF222E` (emp)<br>`#FFEBE9` (subtle) | `--color-danger-fg`<br>`--color-danger-emphasis`<br>`--color-danger-subtle` |
| **Merged PR** | Merged branches & pull requests | `#A371F7` (fg)<br>`#8957E5` (emp)<br>`rgba(163,113,247,0.15)` (subtle) | `#8250DF` (fg)<br>`#8250DF` (emp)<br>`#FBEFFF` (subtle) | `--color-merged-fg`<br>`--color-merged-emphasis`<br>`--color-merged-subtle` |

### 2.5 Unified Diff Rendering Tokens

| Diff Element | Dark Value | Light Value | CSS Variable |
| :--- | :--- | :--- | :--- |
| **Diff Add BG** | `rgba(46, 160, 67, 0.15)` (`#2EA04326`) | `rgba(46, 160, 67, 0.15)` | `--color-diff-add-bg` |
| **Diff Add Text** | `#3FB950` | `#1A7F37` | `--color-diff-add-fg` |
| **Diff Delete BG** | `rgba(248, 81, 73, 0.15)` (`#F8514926`) | `rgba(207, 34, 46, 0.15)` | `--color-diff-delete-bg` |
| **Diff Delete Text** | `#F85149` | `#CF222E` | `--color-diff-delete-fg` |
| **Diff Hunk Header BG** | `rgba(56, 139, 253, 0.1)` | `rgba(9, 105, 218, 0.1)` | `--color-diff-hunk-bg` |
| **Diff Hunk Header Text** | `#79C0FF` | `#0969DA` | `--color-diff-hunk-fg` |

---

## 3. Typography Scale & Stacks

### 3.1 Font Families
- **Interface / Sans**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Code / Monospace**: `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### 3.2 Type Hierarchy

| Level | Size | Line Height | Weight | Letter Spacing | Font Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | `24px` (`1.5rem`) | `32px` (`2rem`) | `600` (SemiBold) | `-0.015em` | Sans | Repository titles, top-level headers |
| **Headline / H2** | `18px` (`1.125rem`) | `24px` (`1.5rem`) | `600` (SemiBold) | `-0.01em` | Sans | Section headings, modal titles |
| **Subhead / H3** | `14px` (`0.875rem`) | `20px` (`1.25rem`) | `600` (SemiBold) | `normal` | Sans | Subsection headers, table group titles |
| **Body (Regular)** | `14px` (`0.875rem`) | `20px` (`1.25rem`) | `400` (Regular) | `normal` | Sans | Primary issue/PR body text, markdown |
| **Caption / Small** | `12px` (`0.75rem`) | `16px` (`1rem`) | `400` (Regular) | `normal` | Sans | Commit author meta, secondary dates |
| **Label MD** | `12px` (`0.75rem`) | `16px` (`1rem`) | `500` (Medium) | `normal` | Sans | Button labels, status badge text |
| **Label SM** | `10px` (`0.625rem`) | `14px` (`0.875rem`) | `500` (Medium) | `0.02em` | Mono | Micro tags, CI check durations |
| **Code MD** | `13px` (`0.8125rem`) | `20px` (`1.25rem`) | `400` (Regular) | `normal` | Mono | Code editor lines, file preview blocks |
| **Code SM** | `11px` (`0.6875rem`) | `16px` (`1rem`) | `400` (Regular) | `normal` | Mono | Commit SHAs, branch pills, diff line numbers |

---

## 4. Spacing & Spatial Layout System

- **Baseline Spatial Increment**: `4px` grid rhythm (`0.25rem`).
- **Scale**:
  - `space-xs`: `4px` (`0.25rem`)
  - `space-sm`: `8px` (`0.5rem`)
  - `space-md`: `12px` (`0.75rem`)
  - `space-lg`: `16px` (`1rem`)
  - `space-xl`: `24px` (`1.5rem`)
  - `space-2xl`: `32px` (`2rem`)
- **Structural Workspace Geometry**:
  - Global Navigation Sidebar: `48px` (collapsed) / `220px` (expanded)
  - Secondary Tree / Files Pane: `240px`–`360px` (resizable)
  - Contextual Inspector Drawer: `320px` (fixed/collapsible)
  - Standard Action Bar / Header Height: `40px`
  - Tab Strip Height: `32px`
  - File Tree Item Height: `28px`
  - Table Row Height: `36px`

---

## 5. Radii & Elevations

### 5.1 Corner Radii
- `radius-none`: `0px`
- `radius-xs`: `3px` (Checkboxes, radio indicators)
- `radius-sm`: `4px` (Status badges, compact buttons, code chips)
- `radius-md`: `6px` (Standard buttons, form inputs, dropdown cards, tabs)
- `radius-lg`: `8px` (Modal windows, large panels)
- `radius-full`: `9999px` (Avatars, pill tags)

### 5.2 Depth & Elevations
- **Level 0 (Base Canvas)**: No shadow. Flat `#0D1117` surface.
- **Level 1 (Structural Panels)**: `1px solid #30363D` border.
- **Level 2 (Interactive Floating Elements)**: `1px solid #30363D` with subtle lift.
- **Modal Dialogs & Overlays**: `0 8px 24px rgba(1, 4, 9, 0.75)` with `1px solid #30363D`.
- **Focus Rings**: `0 0 0 2px #58A6FF` with `1px` inner offset.

---

## 6. Component Rules & Interaction Matrix

### 6.1 Buttons & Action Triggers
- **Standard Control Height**: `32px` (compact: `28px`, micro: `24px`).
- **Primary**: Background `#238636` (or `#1F6FEB`), text `#FFFFFF`, 1px border `rgba(240, 246, 252, 0.1)`. Hover increases brightness 10%.
- **Secondary / Default**: Background `#21262D`, text `#F0F6FC`, 1px border `#30363D`. Hover background `#30363D`.
- **Danger**: Transparent background, text `#F85149`, 1px border `#30363D`. Hover background `#DA3633`, text `#FFFFFF`.
- **Ghost / Subtle**: Transparent background, text `#8B949E`. Hover background `#21262D`, text `#F0F6FC`.

### 6.2 Form Inputs & Search Fields
- Height `32px`, horizontal padding `8px`, font size `14px` (or `13px` Mono for git references).
- Surface `#0D1117`, border `1px solid #30363D`, text `#F0F6FC`.
- Focus state: Border color `#58A6FF` with 2px outer outline.

### 6.3 Status Badges & Pills
- Height `24px`, horizontal padding `8px`, corner radius `4px` (or pill `9999px`).
- Open: `#238636` (Dark) / `#1A7F37` (Light), text `#FFFFFF`.
- Merged: `#8957E5` (Dark) / `#8250DF` (Light), text `#FFFFFF`.
- Closed: `#DA3633` (Dark) / `#CF222E` (Light), text `#FFFFFF`.
- Draft: `#6E7681` (Dark) / `#6E7781` (Light), text `#FFFFFF`.

### 6.4 Diff Viewer & Tree View
- Tree Node: Height `28px`, flex alignment with `6px` icon gap. Hover `#161B22`, selected `#1F6FEB20` with text `#58A6FF`.
- Diff Lines: Height `20px`, line numbers right-aligned in `JetBrains Mono 11px`, color `#6E7681`.
- Add row: `rgba(46, 160, 67, 0.15)` fill with `#3FB950` text marker.
- Delete row: `rgba(248, 81, 73, 0.15)` fill with `#F85149` text marker.
