# CVPilot Mobile App: Developer Handoff

## 1. Design Tokens (Cyber-Logic AI System)

**Primary Palette:**
- **Electric Indigo (Primary):** `#5d3fd3` (used for CTA buttons, active navigation, and primary brand accents)
- **Primary Container:** `#e8e0ff`
- **Surface:** `#f7f9fb` (Page background)
- **Surface-Low:** `#f2f4f6` (Card backgrounds)
- **On-Surface:** `#1a1c1e` (Primary text)

**Typography:**
- **Font Family:** Plus Jakarta Sans
- **Headlines:** font-headline-lg (22px/28px, Bold)
- **Body:** font-body-md (14px/20px, Regular)
- **Labels:** font-label-md (12px/16px, Semi-bold)

**Spacing & Radius:**
- **Base Radius:** 16px (Cards), 12px (Buttons)
- **Page Margin:** 16px (Horizontal)
- **Stack Spacing:** 16px / 24px

---

## 2. Shared Components

### TopAppBar
- **Height:** 64px
- **Elements:** Logo (left), Notification Icon (right)
- **Style:** Glassmorphism (`backdrop-blur-md`, `bg-surface/90`)

### BottomNavBar
- **Height:** 72px
- **Items:** Home, Jobs, Coach, Stats, Profile
- **Active State:** Bg container with indigo tint, Bold label.

---

## 3. Screen Mapping & HTML References

The following screens are built with consistent CSS variables tied to the `Cyber-Logic` system.

| Screen Title | Placeholder | Key Features |
| :--- | :--- | :--- |
| **Home Dashboard** | {{DATA:SCREEN:SCREEN_20}} | Resume Health gauge (SVG), Top Matches list, Application stats. |
| **Jobs Feed** | {{DATA:SCREEN:SCREEN_21}} | Search/Filter bar, Role cards with match % badges. |
| **AI Career Coach** | {{DATA:SCREEN:SCREEN_2}} | Suggestion cards, Glassmorphism chat input. |
| **Career Insights** | {{DATA:SCREEN:SCREEN_3}} | Application funnel (Progress bars), Job activity metrics. |
| **Applied Jobs** | {{DATA:SCREEN:SCREEN_22}} | Vertically stacked application status cards. |
| **Chat History** | {{DATA:SCREEN:SCREEN_24}} | Categorized list of previous sessions (Today/Yesterday). |
| **My Resumes** | {{DATA:SCREEN:SCREEN_8}} | Document cards with status indicators (Active/Analyzing/Failed). |
| **User Profile** | {{DATA:SCREEN:SCREEN_27}} | Profile header, settings list, Sign out action. |

---

## 4. Implementation Notes
- **Status Bar:** All screens have been stripped of the system status bar for design clarity. Implement as a standard iOS/Android status bar with background matching `surface`.
- **Glassmorphism:** Use `backdrop-filter: blur(12px)` for headers and overlay elements.
- **Interactions:** Buttons use a `scale(0.98)` active state.
