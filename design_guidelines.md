# Design Guidelines: Barbora.lv Category Scraper Tool

## Design Approach

**Framework**: Design System Approach using **Fluent Design** principles combined with developer tool aesthetics inspired by **Linear**, **Vercel Dashboard**, and **GitHub's interface**. This utility demands precision, efficiency, and professional polish characteristic of modern data tools.

**Core Principles**: 
- Information clarity over decoration
- Hierarchical data presentation
- Instant feedback on system states
- Professional, focused workspace aesthetic

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN)
- Code/Data: JetBrains Mono (for category paths, JSON output)

**Hierarchy**:
- Page Titles: text-2xl font-semibold (32px)
- Section Headers: text-lg font-medium (20px)
- Body/Labels: text-sm font-normal (14px)
- Data/Code: text-xs font-mono (12px, JetBrains Mono)
- Metadata: text-xs text-muted (11px, reduced opacity)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8** (p-2, m-4, gap-6, py-8)

**Page Structure**:
- Fixed top navigation bar (h-16)
- Main content area with max-w-7xl container, px-8 py-6
- Sidebar for controls (w-80 on desktop, collapsible on mobile)
- Content sections with consistent py-8 spacing between major blocks

**Grid Strategy**:
- Results display: 2-column layout (sidebar + main content area)
- Category tree: Single column with nested indentation
- Stats cards: 4-column grid (grid-cols-4 gap-4) on desktop

---

## Component Library

### Navigation Bar
- Full-width sticky header
- Logo/title left-aligned
- Action buttons (Trigger Scrape, Download CSV) right-aligned with gap-4
- Height h-16, horizontal padding px-8
- Include status indicator (last scrape time, item count)

### Control Sidebar
- Fixed width w-80 on desktop
- Contains: URL input field, scrape trigger, filter options, depth selector
- Sticky positioning with top-offset matching navbar
- Group controls with section dividers (border-t with my-6)

### Results Display Panel
- Flex-1 main content area
- Header with result count and export options
- Hierarchical category tree with:
  - Indentation: pl-6 per level
  - Toggle icons for expandable branches
  - Checkbox selection for bulk actions
  - Metadata badges (item count, depth level) inline

### Data Cards (Statistics)
- Grid of metric cards: Total categories, Max depth, Items scraped, Duration
- Each card: p-6, rounded-lg border
- Large number display (text-3xl font-bold)
- Label underneath (text-sm)

### Category Tree Items
- Each row height h-10 with px-4 py-2
- Hover state with subtle backdrop
- Icon (Heroicons chevron-right/down) + category name + item count badge
- Nested items with progressive indentation (pl-6 increments)

### Action Buttons
- Primary actions: px-6 py-2.5 rounded-md font-medium
- Secondary actions: px-4 py-2 rounded border
- Icon + text combinations with gap-2
- Loading states with spinner icon replacement

### Status Indicators
- Dot indicators for scrape status (idle/running/complete/error)
- Progress bar component (h-2 rounded-full) for active scrapes
- Toast notifications (top-right corner, slide-in animation)

### Export Modal
- Centered overlay (max-w-lg)
- Format selection (CSV, JSON, XML) with radio buttons
- Options checklist (include metadata, flatten hierarchy)
- Action footer with Cancel + Export buttons

---

## Images

**No hero image needed** - this is a utility tool. Instead:
- Placeholder empty state illustration when no data loaded (centered, max-w-md)
- Icon-based visual system throughout (Heroicons for all UI elements)
- Optional: Small brand logo in navbar (h-8)

---

## Specialized Features

**Hierarchical Tree Display**:
- Expandable/collapsible nodes with smooth transitions
- Breadcrumb trail at top showing current path
- Quick-expand-all / collapse-all buttons in header
- Visual connection lines (border-l-2) for nested items

**Real-time Scrape Monitoring**:
- Live counter updating during scrape
- Progress indicator showing current category being processed
- Recent activity feed in sidebar (last 5 scraped categories)

**Data Table Alternative View**:
- Toggle between tree view and flat table view
- Sortable columns (Category, Parent, Depth, Items)
- Compact row height (h-12) with alternating subtle backgrounds

**Accessibility**:
- Keyboard navigation for tree (arrow keys expand/collapse)
- Focus indicators on all interactive elements (ring-2)
- Screen reader announcements for scrape status changes
- High contrast ratios maintained in dark mode

---

## Layout Specifics

**Desktop Layout** (>1024px):
```
[Navbar - Full Width]
[Sidebar(320px)][Main Content Area(flex-1)]
```

**Tablet** (768-1024px):
- Collapsible sidebar, overlay mode
- Single column main content

**Mobile** (<768px):
- Bottom sheet for controls
- Full-width tree display
- Simplified stat cards (2-column grid)

**Animations**: Minimal - only expand/collapse transitions (duration-200) and loading spinners. No decorative animations.