---
name: Cyber-Logic AI System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#484554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#797586'
  outline-variant: '#c9c4d7'
  surface-tint: '#6042d6'
  primary: '#451ebb'
  on-primary: '#ffffff'
  primary-container: '#5d3fd3'
  on-primary-container: '#d8ceff'
  inverse-primary: '#cabeff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004f34'
  on-tertiary: '#ffffff'
  tertiary-container: '#006947'
  on-tertiary-container: '#5fecb0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4723be'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 24px
  gutter-grid: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 48px
---

## Brand & Style

The design system is engineered to feel like a high-performance intelligence tool. It balances the "AI-native" aesthetic with the reliability expected of a professional career platform. The visual narrative centers on **Sophisticated Minimalism** with **Glassmorphic** accents, creating a sense of depth and computational clarity.

The target audience consists of ambitious professionals who value efficiency and data-driven insights. To evoke a sense of empowerment, the UI uses a combination of deep, recessive backgrounds and vibrant, energetic foreground accents.

**Key Aesthetic Principles:**
- **Clarity & Precision:** High-contrast typography and generous whitespace ensure that complex data—like ATS scores and job matching—remains digestible.
- **Dimensionality:** The use of translucent layers and backdrop blurs creates a "glass-on-glass" stack that feels futuristic yet orderly.
- **Intelligent Motion:** While not captured in static tokens, the interface should utilize "shimmer" and "glow" states to indicate AI processing and discovery.

## Colors

The palette is anchored by **Deep Navy** (Secondary) and **Crisp White**, providing a grounded, professional foundation. The **Cyber Violet** (Primary) acts as the high-energy signal for all critical actions and AI-driven elements.

- **Primary (Cyber Violet):** Used for primary buttons, active states, and "magic" AI features.
- **Secondary (Deep Navy):** Reserved for primary text, deep-tone navigation elements, and heavy contrast areas.
- **Tertiary (Emerald Pulse):** Used specifically for positive metrics, like high ATS scores or successful application statuses.
- **Neutral (Soft Slate):** A range of greys used for borders, secondary text, and surface backgrounds to maintain a clean, airy feel.
- **Glass Accents:** Transparent white/navy overlays (8-12% opacity) with a 20px-40px background blur are used for card components to create the frosted glass effect.

## Typography

The typography system uses **Plus Jakarta Sans** for headlines to provide a modern, geometric character, while **Inter** is used for body and labels to ensure maximum legibility at smaller scales.

**Hierarchy Rules:**
- **Tracking:** Apply slight negative tracking to large headlines to maintain a tight, professional look. Use increased tracking (+0.05em) for small labels and uppercase badges to improve scan-ability.
- **Weight:** Reserve 700 weight for major page titles. Use 500/600 weights for sub-headers to avoid visual clutter.
- **Contrast:** Always use Deep Navy for primary headlines. Secondary body text should drop to a 60% opacity of the secondary color to create a clear informational hierarchy.

## Layout & Spacing

This design system utilizes a **Fluid Grid** model with a strict 8px base unit. This ensures all components scale predictably across mobile and desktop.

**Layout Philosophy:**
- **Mobile:** A 4-column grid with 24px side margins. Cards usually span the full width of the content area.
- **Tablet/Desktop:** A 12-column grid. Information is grouped into modules (e.g., career overview on the left, AI coach on the right) to avoid overly long line lengths.
- **Rhythm:** Use "stack-lg" (32px) for spacing between major sections and "stack-md" (16px) for spacing between cards within a section. Inner card padding should consistently be 24px to provide a premium, airy feel.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Ambient Shadows**. Instead of traditional harsh shadows, we use extra-diffused, low-opacity shadows tinted with the primary or secondary color to simulate a soft light source.

**Depth Levels:**
- **Level 0 (Base):** The page background (Neutral Soft Slate).
- **Level 1 (Surface):** Standard cards. Pure white or semi-transparent glass with a subtle 1px border (#E2E8F0) and a very soft blur shadow (0px 4px 20px rgba(15, 23, 42, 0.05)).
- **Level 2 (Floating):** Modals, dropdowns, and active AI tooltips. These utilize a more pronounced "Electric Indigo" tinted shadow (0px 12px 32px rgba(93, 63, 211, 0.15)) to signal importance and interactive priority.
- **AI Special State:** Components powered by AI (like the ATS analyzer) feature a continuous, subtle outer glow (Primary color at 10% opacity) to distinguish them from static data.

## Shapes

The shape language is defined by **Large Radii**, conveying a friendly, approachable, and modern tech feel. 

- **Standard Cards:** Use `rounded-lg` (16px) to create a soft, containerized look.
- **Buttons & Inputs:** Use `rounded-lg` (16px) or fully pill-shaped (100px) for primary action buttons to make them feel "tactile" and distinct from layout containers.
- **Chips/Badges:** Always use pill-shaped (100px) roundedness for tags like "Full-time" or "Remote" to differentiate them from clickable cards.
- **Progress Bars:** Use 8px roundedness for both container and fill to maintain the soft-edge aesthetic.

## Components

### Buttons
- **Primary:** Solid Cyber Violet with white text. High-contrast, no border.
- **Secondary:** Transparent with a Cyber Violet border (1.5px) and violet text.
- **AI-Action:** Solid Cyber Violet with a subtle horizontal gradient (Primary to a slightly lighter violet) and a "sparkle" icon prefix.

### Cards (The "Container")
- White background (or 90% white glass).
- 16px corner radius.
- Inner padding: 24px.
- Border: 1px solid #F1F5F9.

### Input Fields
- Background: #F8FAFC (Neutral).
- Border: 1px solid #E2E8F0; on focus, transitions to 1.5px Cyber Violet.
- Label: Inter Medium, 14px, Deep Navy.

### Chips & Tags
- Used for job categories and skills.
- Background: 10% opacity of the Primary color.
- Text: Primary color, Inter Bold, 12px.

### AI Career Coach (Unique Component)
- **Chat Bubbles:** User bubbles are Deep Navy; AI bubbles are Glassmorphic (frosted) with a subtle violet gradient border.
- **Input Bar:** A floating pill-shaped container with backdrop-blur.

### Progress Gauges (ATS Score)
- Circular or bar-based.
- Background rail: #F1F5F9.
- Progress fill: Tertiary (Emerald) or Primary (Violet) depending on the score tier.
- Add a subtle outer glow to the fill to represent "AI Analysis."