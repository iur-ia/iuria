# Design Guidelines: Legal Management System (Sistema de Gestão Jurídica)

## Design Approach

**Selected Framework**: Material Design 3 with enterprise customization for legal/professional context
**Rationale**: Information-dense business application requiring clarity, efficiency, and professional credibility for Brazilian law firms

## Core Design Principles

1. **Professional Authority**: Establish trust through clean, structured layouts and consistent visual language
2. **Information Clarity**: Enable quick scanning of complex legal data through strong hierarchy and color coding
3. **Efficient Workflows**: Minimize clicks and cognitive load for high-frequency tasks
4. **Status Visibility**: Use color-coded indicators extensively for process status, deadlines, and priorities

## Typography

**Font Family**: 
- Primary: Inter (via Google Fonts)
- Monospace: JetBrains Mono (for case numbers, CNJ codes)

**Hierarchy**:
- Page Titles: text-2xl font-semibold (32px)
- Section Headers: text-xl font-semibold (24px)
- Card Titles: text-lg font-medium (20px)
- Body Text: text-base font-normal (16px)
- Metadata/Labels: text-sm font-medium (14px)
- Captions/Timestamps: text-xs (12px)

## Layout System

**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4 to p-6
- Section spacing: mb-6 to mb-8
- Card gaps: gap-4 to gap-6
- Page margins: px-6 py-8

**Grid System**:
- Dashboard metrics: grid-cols-1 md:grid-cols-3 lg:grid-cols-5
- Process cards: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3
- Sidebar: fixed w-64 (collapsible to w-16 icon-only)
- Main content: max-w-7xl mx-auto

## Component Library

### Navigation
- **Sidebar**: Fixed left, 256px wide, hierarchical menu with expandable sections, icon + label for each item
- **Header**: h-16, global search bar (prominent, center-weighted), notification bell with badge, user avatar dropdown
- **Breadcrumbs**: Small text with chevron separators, clickable path navigation

### Dashboard Cards
- **Metric Cards**: Rounded-lg, shadow-sm, border-l-4 with semantic color stripe
- **Structure**: Large number (text-3xl font-bold), label below (text-sm), icon top-right, sub-metrics with smaller text and color dots
- **Status Colors**: Red (overdue), Yellow/Amber (today/warning), Green (future/complete), Purple (action needed), Blue (informational)

### Process/Case Cards
- **Layout**: Compact vertical card, rounded-lg border, hover:shadow-md transition
- **Header**: Client name (font-semibold), case number (monospace, text-sm)
- **Body**: 2-column grid for metadata (label: value pairs)
- **Footer**: Horizontal flex with badges (status, instance, tags) and circular avatar badges (responsible attorneys with 2-letter initials)
- **Left Border**: 4px colored indicator matching primary status

### Tables & Lists
- **Headers**: Sticky, bg-surface with border-b, text-sm font-medium uppercase tracking-wide
- **Rows**: Alternating subtle background, hover highlight, 48px min-height
- **Actions**: Right-aligned three-dot menu icon, expands to action list on click

### Forms
- **Input Fields**: Rounded-md border, focus:ring-2 focus:border-primary, h-10 px-3
- **Labels**: text-sm font-medium mb-1.5, required indicator (*)
- **Buttons**: 
  - Primary: Solid fill, h-10, px-6, rounded-md, font-medium
  - Secondary: Border variant, same dimensions
  - Destructive: Red variant
- **Select/Dropdowns**: Chevron icon right-aligned, same styling as inputs
- **Multi-select**: Chips/tags inside input field, removable with X icon

### Status Indicators
- **Badges**: Rounded-full px-3 py-1 text-xs font-medium, semantic colors (orange=incomplete, purple=moved, gray=stopped, green=active)
- **Dots**: w-2 h-2 rounded-full inline-block, used in lists for quick status
- **Progress Rings**: Circular progress for tasks/deadlines completion
- **Avatar Badges**: Circular, 32px diameter, 2-letter initials, unique background colors per user

### Calendar/Timeline
- **Calendar Grid**: 7-column layout, day cells with rounded corners, current day highlighted with ring
- **Event Pills**: Small rounded rectangles within day cells, color-coded by type, truncated text with ellipsis
- **Timeline**: Vertical line with circular nodes, alternating left/right content cards, icons in nodes

### Modals & Overlays
- **Modal**: Centered, max-w-2xl, rounded-lg, shadow-xl, backdrop blur
- **Header**: Border-b, close button top-right
- **Footer**: Border-t, actions right-aligned
- **Dropdown Menus**: Shadow-lg, rounded-md, divide-y for sections, hover:bg-surface on items

### Document/File Display
- **File Cards**: Icon + filename + size + date, grid layout for multiple files
- **Upload Zone**: Dashed border, drag-drop area, centered icon and text

## Interaction Patterns

- **Loading States**: Skeleton screens for data-heavy sections, spinner for quick actions
- **Empty States**: Centered icon + message + action button
- **Error States**: Inline error messages below fields, toast notifications for system errors
- **Confirmation Dialogs**: For destructive actions (delete, archive)
- **Tooltips**: On hover for icons and truncated text, subtle shadow, arrow pointer

## Responsive Behavior

- **Desktop (≥1024px)**: Full sidebar, multi-column grids, expanded tables
- **Tablet (768-1023px)**: Collapsible sidebar, 2-column grids, scrollable tables
- **Mobile (<768px)**: Bottom navigation or hamburger menu, single column, card-based lists, swipe actions

## Animation Guidelines

**Minimal and Purposeful**:
- Page transitions: None (instant)
- Dropdown/modal appearance: Fade + scale from 95% to 100% (150ms)
- Hover states: Subtle shadow change (100ms ease-out)
- Loading: Subtle pulse on skeletons
- NO scroll-triggered animations, NO decorative motion