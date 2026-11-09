---
name: FingerprinterJS
description: A restrained developer playground for inspectable browser signals.
colors:
  background: '#ffffff'
  surface: '#fafafa'
  surface-hover: '#f4f4f5'
  foreground: '#18181b'
  muted: '#626269'
  subtle: '#71717a'
  border: '#e4e4e7'
  strong-border: '#d4d4d8'
  primary: '#18181b'
  primary-foreground: '#fafafa'
  success: '#147d49'
  warning: '#946000'
  danger: '#b42318'
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: '32px'
    fontWeight: 630
    lineHeight: 1.25
    letterSpacing: '-0.035em'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: 1.5
  code:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 1.9
rounded:
  control: '6px'
  container: '9px'
  badge: '4px'
spacing:
  tight: '8px'
  medium: '16px'
  panel: '22px'
  column: '32px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-foreground}'
    rounded: '{rounded.control}'
    padding: '7px 12px'
    height: '36px'
  button-secondary:
    backgroundColor: '{colors.background}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.control}'
    padding: '7px 12px'
    height: '36px'
  input:
    backgroundColor: '{colors.background}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.control}'
    padding: '5px 38px 5px 10px'
    height: '34px'
---

# Design System: FingerprinterJS

## Overview

**Creative North Star: "Inspectable by default"**

A familiar, quiet developer interface with a zinc neutral palette, clear hierarchy, and real results at the center. The design follows the user's request for a simple shadcn-style page. It uses standard controls rather than a new visual language that developers must learn.

**Key Characteristics:**

- Flat, bordered surfaces with controlled information density.
- A visible primary action before advanced configuration.
- Color reserved for meaningful collection and check states.
- Expandable observations, explicit uncertainty, and no decorative metrics.

## Colors

The default light palette resembles a clean document and uses zinc tones for structure. The dark theme changes the same semantic roles rather than changing layout or emphasis. `docs/styles.css` owns both theme mappings.

### Primary

The darkest foreground carries the primary action. Its inverse carries the label. An additional brand accent is not necessary for this tool.

### Neutral

Background is the reading surface. Surface is used for code, expanded observations, and table headings. Muted and subtle tones distinguish explanations from result values. Border tones separate regions without adding elevation.

**The State Color Rule.** Green, amber, and red describe a real status. They do not decorate idle sections or imply identification accuracy.

## Typography

Use the platform sans for headings, controls, descriptions, and tables. Use the mono stack for code, hashes, elapsed time, and version identifiers. Headings use a fixed scale. Long prose stays within a readable measure; observations wrap safely instead of pushing the viewport wider.

**The Data Type Rule.** Monospace identifies code and measured data, not the fact that the product is technical.

## Layout

The page uses a centered container with a maximum width of 1172 px including horizontal padding. On desktop the configuration is 272 px wide, separated from the fluid results area by a 32 px gap. At 680 px and below the layout becomes a single column and profile choices form a compact row. Advanced settings and collector selection remain progressive disclosures.

The top tabs switch between operation, explanation, and browser checks. They keep the same page context. The initial screen states exactly what will happen before collection starts.

## Elevation & Depth

Use borders and surface tones. The only shadow belongs to transient clipboard/export feedback. Do not add shadowed panels or nested containers to make the playground look more elaborate.

## Shapes

Containers use softly curved corners; controls use a smaller radius. Badges are compact rectangles. SVG icons share a fine, consistent stroke and accompany text where the action needs a label.

## Components

### Buttons and inputs

One primary collection button. Secondary buttons handle cancellation, code copying, and explicit exports. Inputs have visible labels and units. Controls must provide disabled, focus, hover, loading, and error states. Keyboard focus uses an offset outline.

### Tabs

Tabs have an understated bottom rule for selection, automatic arrow-key activation, and correct tab/panel relationships. Their labels describe distinct tasks rather than implementation modules.

### Results and component table

Show the actual fingerprint, schema version, coverage, elapsed time, and number of contributing collectors. Coverage is always described as collection coverage. An empty projection gets an explicit explanation rather than a reassuring number.

Each component has a status, elapsed time, and projection participation. Its button expands a full-width detail row so raw values remain readable on mobile. Values are inserted as text. Redacted exports use an allow-list and omit both the fingerprint and raw values.

### Motion

The pipeline animation runs only when the user replays the explanation. Loading motion indicates work in progress. All motion respects `prefers-reduced-motion`; no content depends on animation to become visible.

## Do's and Don'ts

### Do

- Do keep the primary action visible before advanced options.
- Do name uncertainty and non-success states clearly.
- Do make expanded data readable at the viewport's full available width.
- Do keep light and dark themes structurally identical.

### Don't

- Don't use gradients, emoji, decorative statistics, or marketing claims as UI structure.
- Don't label collection coverage as accuracy or confidence in a person's identity.
- Don't animate the page into existence or collect data on page load.
- Don't render observations with HTML interpolation.
