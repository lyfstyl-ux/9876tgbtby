# Design Guidelines: Crypto/Betting Platform

## Design Approach
**Reference-Based**: Drawing from Coinbase's professional restraint + Uniswap's technical precision + Stripe's elevated simplicity. This creates credibility in the high-stakes betting/crypto space while maintaining modern sophistication.

## Typography
**Primary Font**: Inter (Google Fonts) - technical clarity, excellent readability
**Accent Font**: Space Grotesk (Google Fonts) - crypto-native, geometric personality

**Hierarchy**:
- Hero Headlines: Space Grotesk, 48-64px (desktop), 700 weight
- Section Titles: Space Grotesk, 32-40px, 600 weight  
- Body Large: Inter, 18-20px, 400 weight
- Body Regular: Inter, 16px, 400 weight
- Captions/Labels: Inter, 14px, 500 weight, uppercase tracking
- Numbers/Stats: Space Grotesk, tabular-nums for alignment

## Layout System
**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6, p-8
- Section spacing: py-16, py-20, py-24
- Card gaps: gap-6, gap-8
- Button padding: px-6 py-3, px-8 py-4

**Grid System**: 
- Main container: max-w-7xl
- Dashboard layouts: 3-column grid (lg:grid-cols-3)
- Betting cards: 2-column grid (md:grid-cols-2)
- Mobile: Single column stack

## Core Components

**Cards/Panels**:
- Solid backgrounds with 1px borders
- Subtle shadow (shadow-lg with low opacity)
- Border radius: rounded-xl (12px)
- No gradients - use border-t-2 accent color for hierarchy

**Buttons**:
- Primary: Solid color, shadow-md elevation, rounded-lg
- Secondary: Border-2 solid, transparent background
- Tertiary: No border, hover opacity change
- All buttons: px-8 py-4, font-medium, uppercase tracking
- Hero buttons with blur: backdrop-blur-md bg-white/10 border border-white/20

**Data Display**:
- Price tickers: Monospace numbers, green/red indicators, clean table layouts
- Stats cards: Large numbers (Space Grotesk 40px), small labels above
- Charts: Solid line graphs, minimal grid lines, axis labels only
- Live indicators: Small dot (w-2 h-2) with pulse animation

**Navigation**:
- Top nav: Solid background, border-b, contained layout
- Sidebar (if needed): Full-height, solid background, grouped menu items with subtle hover states
- Mobile: Slide-in drawer, same styling principles

**Forms/Inputs**:
- Input fields: border-2, rounded-lg, py-3 px-4, focus ring with primary color
- Labels: Above inputs, font-medium, mb-2
- Validation: Border color changes, small helper text below

**Glass Effects** (Use sparingly):
- Modals/overlays only: backdrop-blur-xl bg-white/5 border border-white/10
- Never on primary content areas

## Visual Design Principles

**Elevation Strategy**:
- Level 1: border only
- Level 2: border + shadow-sm
- Level 3: border + shadow-lg
- Critical actions: border-2 + shadow-xl

**Color Application** (awaiting palette):
- Backgrounds: Solid grays/neutrals with clear hierarchy
- Borders: 1-2px solid, never gradients
- Accents: Solid primary color for CTAs, secondary for info
- Success/Error: Traditional green/red, no neon
- Use opacity (bg-gray-900/50) for layering, not gradients

**Professional Constraints**:
- No rainbow gradients, no neon effects
- Animations: Subtle transitions only (hover, state changes)
- Micro-interactions: Scale on hover (scale-105), opacity shifts
- Loading states: Simple spinner or skeleton, no flashy effects

## Images

**Hero Section**:
- Full-width hero image (h-[600px] desktop, h-[500px] mobile)
- Image content: Abstract crypto/blockchain visualization - geometric patterns, network nodes, or clean data visualization aesthetic
- Dark overlay (bg-gradient-to-b from-black/40 to-black/60) for text legibility
- Centered content: Hero headline + subtext + dual CTAs with backdrop-blur

**Feature Icons**:
- Use Heroicons (outline style) for clean, technical feel
- Size: w-8 h-8 for cards, w-12 h-12 for feature sections
- Stroke-width: 1.5px for consistency

**Supporting Imagery**:
- Dashboard screenshots: Place in "How It Works" section (2-column layout)
- Trust signals: Partner logos row (grayscale filters)
- Use placeholder images sparingly - focus on data, not decoration

## Key Sections Structure

1. **Hero**: Full-width image, centered content, dual CTAs
2. **Live Stats Bar**: Ticker-style horizontal scroll, current odds/prices
3. **Feature Grid**: 3-column, icon + title + description cards
4. **Platform Preview**: Large dashboard screenshot, feature callouts
5. **Trust/Security**: Certifications, security features, 2-column layout
6. **CTA Section**: Solid background, centered, single focus

Professional, restrained, technically precise. Every element earns its place through function, not decoration.