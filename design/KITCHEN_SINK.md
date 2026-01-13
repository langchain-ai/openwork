# Kitchen Sink - Complete Component Showcase

## Overview
A comprehensive demonstration page showcasing all 24 migrated tactical components with populated, realistic data and all variants.

## Location
- **File**: `app/src/KitchenSink.tsx`
- **Access**: Navigate to the "Kitchen Sink" tab in the application

## Components Demonstrated

### 1. Buttons
- **Variants**: Default, Secondary, Outline, Ghost, Link, Destructive
- **Status Colors**: Nominal, Warning, Critical
- **Sizes**: Small, Default, Large
- **Icon Buttons**: With text, icon-only variants
- **Examples**: 15+ button combinations

### 2. Badges
- **Variants**: Default, Secondary, Outline, Destructive
- **Status Colors**: Nominal, Warning, Critical, Info
- **Use Cases**: Status indicators, labels, tags
- **Examples**: 8 badge styles

### 3. Alerts
- **Variants**: Default, Info, Nominal, Warning, Critical
- **Features**: Left border accent, uppercase titles, icons
- **Use Cases**: System notifications, status messages
- **Examples**: 5 alert types with realistic messages

### 4. Cards
- **Layout**: Hero metrics dashboard
- **Features**: Elevated backgrounds, status badges
- **Use Cases**: Metric displays, content grouping
- **Examples**: 3 metric cards (System Status, Active Nodes, Response Time)

### 5. Form Elements
- **Inputs**: Text, Number, Search (with icon)
- **Select**: Dropdown with multiple options
- **Features**: Monospace font, tactical styling
- **Examples**: 4 input variations

### 6. Toggle Controls

#### Switches
- **Variants**: Default, Nominal, Warning, Critical
- **Features**: Squared corners (3px), status colors
- **Examples**: 4 switch styles with labels

#### Checkboxes
- **Variants**: Default, Nominal, Warning, Critical
- **Features**: Squared (3px), status-aware
- **Examples**: 4 checkbox styles

#### Radio Groups
- **Features**: Squared indicators (3px)
- **Examples**: 3 radio options with labels

### 7. Progress Indicators

#### Progress Bars
- **Variants**: Default, Nominal, Warning, Critical, Info
- **Features**: 2px height, squared track, status colors
- **Examples**: 5 progress bars with percentages

#### Sliders
- **Variants**: Default, Critical, Nominal
- **Features**: 2px track, squared thumb, interactive
- **Examples**: 3 sliders with different values

### 8. Tabs
- **Features**: Uppercase triggers, border-bottom indicator
- **Tabs**: Overview, Metrics, Alerts, Config
- **Examples**: 4 tabs with unique content cards

### 9. Data Table
- **Features**: 
  - Uppercase headers with tracking
  - Monospace data cells
  - Tactical hover states
  - Status badges in cells
  - Table caption
- **Data**: 5 rows of system log entries
- **Columns**: Timestamp, Event Type, Source, Status, Duration

### 10. Toggle Groups
- **Single Toggle**: Default and outline variants with icons
- **Connected Group**: No spacing, shared borders
- **Spaced Group**: Individual buttons with gaps
- **Features**: Uppercase labels, tactical styling
- **Examples**: 3 toggle group configurations

### 11. Overlays & Menus

#### Dialog
- **Features**: Elevated background, dark blur overlay, uppercase title
- **Content**: Form inputs, footer actions
- **Example**: System configuration modal

#### Dropdown Menu
- **Features**: Monospace text, tactical hover states
- **Items**: Menu items with icons and shortcuts
- **Variants**: Default and destructive items
- **Example**: System actions menu

#### Sheet
- **Features**: Slide-out panel, elevated background
- **Content**: Node status, resource usage with progress bars
- **Example**: System diagnostics panel

#### Tooltip
- **Features**: Elevated background, monospace, border
- **Example**: Hover trigger with tactical tooltip

### 12. Loading States
- **Skeleton**: 2s pulse animation, background-interactive
- **Layouts**: 
  - Line skeletons (full, 3/4, 1/2 width)
  - Card skeleton (thumbnail + text lines)
- **Examples**: Multiple skeleton patterns

### 13. Separators
- **Orientations**: Horizontal and vertical
- **Features**: Subtle border color
- **Examples**: Content dividers, panel splits

## Layout Structure

The kitchen sink is organized into sections:

1. **Header** - Title and description
2. **Buttons** - All button variants and sizes
3. **Badges** - Status indicators
4. **Alerts** - Notification types
5. **Cards** - Metric displays
6. **Form Elements** - Inputs and selects
7. **Toggle Controls** - Switches, checkboxes, radios
8. **Progress Indicators** - Bars and sliders
9. **Tabs** - Navigation with content
10. **Data Table** - System logs
11. **Toggle Groups** - Button groups
12. **Overlays & Menus** - Dialogs, dropdowns, sheets, tooltips
13. **Loading States** - Skeletons
14. **Separators** - Dividers
15. **Footer** - Status message

## Design Features Demonstrated

### Typography
- ✅ **Monospace fonts** on all data values (timestamps, metrics, IDs)
- ✅ **Uppercase headers** with tracking (`.text-section-header`)
- ✅ **Tabular numerals** for aligned data columns
- ✅ **Hero metrics** with light weight (300) large display

### Color System
- ✅ **Status colors** throughout (critical, warning, nominal, info)
- ✅ **Elevated backgrounds** for cards and overlays
- ✅ **Interactive states** with background-interactive
- ✅ **Consistent borders** at 3px radius

### Interaction
- ✅ **Fast transitions** (150-250ms)
- ✅ **Tactical hover states**
- ✅ **Clear affordances**
- ✅ **Status-driven colors** (never decorative)

### Layout
- ✅ **Information density** - Multiple components per section
- ✅ **Grid layouts** for metrics
- ✅ **Proper spacing** with consistent gaps
- ✅ **Responsive design** (md:grid-cols-* patterns)

## Usage

### Development
```bash
cd app
npm run dev
```

Then navigate to the "Kitchen Sink" tab in the top navigation.

### Router Structure
The app uses a tabbed router:
- **Dashboard** - Original tactical operations dashboard
- **Kitchen Sink** - Complete component showcase

### Modifying Components
To test changes to components:
1. Edit the component in `components/ui/`
2. View changes immediately in the Kitchen Sink
3. All variants and states are visible at once

## Testing Coverage

The Kitchen Sink demonstrates:
- ✅ All 24 migrated components
- ✅ All status color variants (critical, warning, nominal, info)
- ✅ All size variants (sm, default, lg)
- ✅ All style variants (default, outline, ghost, etc.)
- ✅ Interactive states (hover, focus, checked, disabled)
- ✅ Realistic data and use cases
- ✅ Proper spacing and layout
- ✅ Typography utilities
- ✅ Icon integration

## Component Count

**Total Components Showcased**: 24
- Core: 15
- Dashboard: 7
- Dependencies: 2

**Total Variants**: 60+
- Button: 9+ variants
- Badge: 8 variants
- Alert: 5 variants
- Progress: 5 variants
- Switch: 4 variants
- Checkbox: 4 variants
- And more...

## Benefits

1. **Visual Regression Testing** - See all components at once
2. **Design Review** - Easy to spot inconsistencies
3. **Documentation** - Live examples for all components
4. **Development** - Test changes across all variants
5. **Client Demos** - Comprehensive showcase
6. **QA Testing** - All states visible for testing

## Next Steps

To add more examples:
1. Open `KitchenSink.tsx`
2. Add new sections following the existing pattern
3. Include realistic data and use cases
4. Demonstrate all variants of new components
5. Update this documentation
