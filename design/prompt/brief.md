# Design System Brief: Tactical Operations Dashboard

## Design Philosophy

This aesthetic draws from **military command centers, industrial SCADA systems, and intelligence monitoring platforms**. It prioritizes information density, immediate status recognition, and reduced eye strain for operators monitoring systems over extended periods.

Read the attached images in ./example-1.jpg and ./example-2.jpg to get a sense of the design.

The design should feel like a **serious operational tool**—authoritative, precise, and trustworthy. Every element serves a functional purpose. Nothing is decorative.

---

## Core Principles

**1. Darkness as Default**
The interface uses deep, near-black backgrounds to reduce eye fatigue and make status colors immediately legible. Pure black is avoided—backgrounds carry subtle cool undertones.

**2. Color Equals Meaning**
Color is never decorative. Every use of color beyond the neutral palette communicates system status. Users should be able to assess health at a glance from across a room.

**3. Information Density**
These interfaces serve operators who need comprehensive awareness. Dense layouts with clear hierarchy are preferred over minimalist approaches that require navigation or scrolling.

**4. Precision Typography**
Monospace fonts reinforce the technical, data-driven nature. All numerals align vertically (tabular figures). Uppercase text with wide letter-spacing creates clear section breaks.

**5. Subtle Interaction**
Animations are functional, not decorative. Transitions are fast (150-300ms) and purposeful. Hover states provide clear affordance without distraction.

---

## Color System

### Foundation Palette

| Role | Value | Application |
|------|-------|-------------|
| Background Primary | `#0D0D0F` | Main canvas |
| Background Elevated | `#141418` | Cards, panels, modals |
| Background Interactive | `#1C1C22` | Hover states, selected rows |
| Border Subtle | `#2A2A32` | Dividers, card edges |
| Border Emphasis | `#3A3A45` | Active panels, focus rings |
| Text Primary | `#E8E8EC` | Headings, key content |
| Text Secondary | `#8A8A96` | Labels, metadata, timestamps |
| Text Tertiary | `#5A5A66` | Disabled, placeholder |

### Status Palette

| Status | Color | Usage |
|--------|-------|-------|
| Critical | `#E53E3E` | Alarms, errors, immediate action required |
| Warning | `#F59E0B` | Caution states, approaching thresholds |
| Nominal | `#22C55E` | Healthy, operational, success |
| Info | `#3B82F6` | Selected items, neutral highlights |
| Accent | `#FB923C` | Key metrics, primary calls-to-action |

Status colors appear in three intensities: full strength for text/icons, 15-20% opacity for badge backgrounds, and 30% opacity for borders.

### Data Visualization

Chart traces and graph elements use the status palette. Gridlines and axes use `#2A2A32`. Threshold indicators use dashed lines in `#4A4A56`.

---

## Typography

### Font Selection

**Primary**: JetBrains Mono, Fira Code, or SF Mono (monospace)
**Fallback**: Inter, Roboto, or system sans-serif

The monospace aesthetic is essential to the tactical feel. All data values, timestamps, IDs, and coordinates must use monospace.

### Type Scale

| Element | Size | Weight | Style |
|---------|------|--------|-------|
| Hero Metrics | 48-64px | Light (300) | Slight negative tracking |
| Section Headers | 11-12px | Semibold (600) | UPPERCASE, wide tracking (0.08-0.1em) |
| Table Headers | 11px | Medium (500) | UPPERCASE, tracked |
| Body/Data | 13-14px | Regular (400) | Normal case |
| Badges | 10-11px | Semibold (600) | UPPERCASE |
| Captions | 11px | Regular (400) | Secondary color |

**Critical rule**: All numerals use tabular (monospaced) figures for vertical alignment in data columns.

---

## Spacing & Layout

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Badge padding, tight gaps |
| sm | 8px | Icon margins, inline spacing |
| md | 12px | Cell padding, element gaps |
| lg | 16px | Panel padding, section spacing |
| xl | 24px | Major section breaks |
| 2xl | 32px | Page margins, panel gaps |

### Layout Structure

The canonical layout uses a three-column grid:
- **Left sidebar** (240-280px): Configuration, filters, scenarios
- **Center main** (fluid): Primary data tables, event streams
- **Right panel** (320-400px): Visualizations, network graphs, maps

Header height: 56px
Footer/timeline height: 48px
Minimum viewport: 1440px (optimized for 1920px+)

---

## Motion & Interaction

- Transitions: 150ms for micro-interactions, 250ms for panel changes
- Easing: Ease-out for entrances, ease-in for exits
- Hover states: Immediate feedback via background color shift
- Loading states: Subtle pulse animation, never spinners
- Live indicators: Gentle pulse on status dots (2s cycle)

---

## Accessibility Considerations

- All status colors meet WCAG AA contrast against dark backgrounds
- Never rely on color alone—pair with icons, labels, or position
- Focus states must be visible (use accent color ring)
- Support keyboard navigation for all interactive elements
- Ensure data tables are screen-reader compatible

---

## Implementation Notes

1. Establish CSS custom properties for the full color system from day one
2. Border radius should be consistently 3-4px—never rounded or pill-shaped
3. Avoid pure white (`#FFFFFF`)—use `#E8E8EC` or similar for maximum contrast elements
4. All numeric displays require `font-variant-numeric: tabular-nums`
5. Consider optional CRT/scanline effect for enhanced tactical aesthetic (subtle, never distracting)
6. Design for "alert mode" capability where interface could shift to higher-contrast emergency palette

---

## Reference Terminology

This style may be described as: **Tactical UI, SCADA aesthetic, Command & Control (C2) interface, Operations dashboard, Dark industrial, Military-grade UI, Mission control**