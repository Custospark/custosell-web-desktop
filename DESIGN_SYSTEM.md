# Custosell Design System

## Color Palette

### Primary Brand
| Role | Class | Hex |
|------|-------|-----|
| Primary actions, links, active nav | `blue-600` | `#2563eb` |
| Hover state | `blue-700` | `#1d4ed8` |
| Active/pressed | `blue-800` | `#1e40af` |
| Light background | `blue-50` | `#eff6ff` |
| Icon/fill bg | `blue-100` | `#dbeafe` |
| Focus ring | `blue-500` | `#3b82f6` |

### Status
| Role | Classes | Hex |
|------|---------|-----|
| Success | `green-50/100/500/600/700/800` | `#dcfce7` → `#166534` |
| Warning | `amber-50/100/500/600/700/800` | `#fef3c7` → `#92400e` |
| Danger | `red-50/100/500/600/700/800` | `#fee2e2` → `#991b1b` |
| Info | `blue-50/100/500/600/800` | shared with primary |

### Neutrals
| Role | Class | Hex |
|------|-------|-----|
| Page background | `bg-gray-50` | `#f9fafb` |
| Card/surface bg | `bg-white` | `#ffffff` |
| Card border | `border-gray-200` | `#e5e7eb` |
| Input border | `border-gray-300` | `#d1d5db` |
| Light divider | `border-gray-100` | `#f3f4f6` |
| Section header | `bg-gray-50` | `#f9fafb` |

### Text Hierarchy
| Role | Class | Hex |
|------|-------|-----|
| Primary | `text-gray-900` | `#111827` |
| Secondary | `text-gray-700` | `#374151` |
| Muted | `text-gray-500` | `#6b7280` |
| Subtle/disabled | `text-gray-400` | `#9ca3af` |

### Accent Variants (Stat Cards)
| Color | Border | Icon bg | Icon | Glow |
|-------|--------|---------|------|------|
| Blue | `border-blue-500` | `bg-blue-100` | `text-blue-600` | `bg-blue-500/10` |
| Green | `border-green-500` | `bg-green-100` | `text-green-600` | `bg-green-500/10` |
| Amber | `border-amber-500` | `bg-amber-100` | `text-amber-600` | `bg-amber-500/10` |
| Purple | `border-purple-500` | `bg-purple-100` | `text-purple-600` | `bg-purple-500/10` |
| Indigo | `border-indigo-500` | `bg-indigo-100` | `text-indigo-600` | `bg-indigo-500/10` |

Stat cards always use `border-2` with `bg-gradient-to-br from-white to-{color}-50/50`.

---

## Shared Components

### Button (`shared/components/buttons/Button.tsx`)
| Variant | Classes |
|---------|---------|
| `primary` | `bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm` |
| `secondary` | `bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-400` |
| `outline` | `border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-blue-500` |
| `danger` | `bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm` |
| `ghost` | `text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-400` |

Size variants: `sm` / `md` / `lg`.

### Card (`shared/components/cards/Card.tsx`)
- Default: `bg-white border border-gray-200 rounded-xl shadow-sm p-6`
- Accent prop adds tinted border: `<Card accent="blue">` → `border-blue-200 hover:border-blue-300`

### Badge (`shared/components/badges/Badge.tsx`)
| Variant | Classes |
|---------|---------|
| `success` | `bg-green-100 text-green-800` |
| `warning` | `bg-amber-100 text-amber-800` |
| `danger` | `bg-red-100 text-red-800` |
| `primary` | `bg-blue-100 text-blue-800` |
| `neutral` | `bg-gray-100 text-gray-800` |

### Input (`shared/components/inputs/Input.tsx`)
- Default border: `border-gray-300`
- Focus: `ring-2 ring-blue-500 focus:border-blue-500`
- Error: `border-red-500 focus:ring-red-500`
- Label: `text-gray-700 font-medium`

### Select (`shared/components/inputs/Select.tsx`)
- Same border/focus/error pattern as Input.

### SearchInput (`shared/components/inputs/SearchInput.tsx`)
- Default: `bg-gray-50 border border-gray-200`
- Focus: `focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white`

### Table (`shared/components/tables/Table.tsx`)
- Wrapper: `border border-gray-200 rounded-lg`
- Header: `bg-gray-50 text-gray-500 uppercase tracking-wider`
- Body: `bg-white divide-y divide-gray-200 text-gray-700`
- Row hover: `hover:bg-gray-50`

### Pagination (`shared/components/tables/Pagination.tsx`)
- Active page: `bg-blue-600 text-white`
- Inactive page: `text-gray-600 hover:bg-gray-100`
- Nav arrows: `text-gray-400 hover:text-gray-600`

### Modal (`shared/components/modals/Modal.tsx`)
- Overlay: `bg-black/50`
- Dialog: `bg-white rounded-xl shadow-xl`
- Title bar: `border-b border-gray-200`
- Close: `text-gray-400 hover:text-gray-600`

### SlideDrawer (`shared/components/modals/SlideDrawer.tsx`)
- Overlay: `bg-black/50`
- Panel: `bg-white shadow-xl`
- Header: `border-b border-gray-200`
- Footer: `border-t border-gray-200` with Cancel + Save buttons

### LoadingSkeleton (`shared/components/loading/LoadingSkeletons.tsx`)
- Shimmer: `bg-gray-200` with gradient `from-gray-200 via-gray-100 to-gray-200`
- Variants: `table`, `card`, `text`, `default`

### Toast (`shared/contexts/ToastContext.tsx`)
| Variant | Classes |
|---------|---------|
| success | `bg-green-50 border-green-200 text-green-800` + `text-green-500` icon |
| error | `bg-red-50 border-red-200 text-red-800` + `text-red-500` icon |
| warning | `bg-amber-50 border-amber-200 text-amber-800` + `text-amber-500` icon |
| info | `bg-blue-50 border-blue-200 text-blue-800` + `text-blue-500` icon |

### ConfirmDialog (`shared/components/Feedback/ConfirmProvider.tsx`)
| Variant | Confirm button |
|---------|----------------|
| danger | `bg-red-600 hover:bg-red-700` |
| warning | `bg-amber-600 hover:bg-amber-700` |
| info | `bg-blue-600 hover:bg-blue-700` |

---

## Layout

### Sidebar (`shared/components/layout/Sidebar.tsx`)
- Background: `bg-white` with `border-r border-gray-200`
- Logo: `text-blue-600 font-bold`
- Active item: `bg-blue-50 text-blue-700 font-medium`
- Inactive item: `text-gray-600 hover:bg-gray-100 hover:text-gray-900`
- Sub-nav active: `bg-blue-50 text-blue-700`
- Sub-nav inactive: `text-gray-500 hover:text-gray-800 hover:bg-gray-50`
- Collapsed: centered icons in `text-gray-400`
- Bottom user section: `text-gray-800` name / `text-gray-500` email
- Logout hover: `hover:bg-red-50 hover:text-red-600`

### Header (`shared/components/layout/Layout.tsx`)
- Background: `bg-white`, bottom border: `border-b border-gray-200`
- User dropdown: `bg-white border border-gray-200 rounded-lg shadow-lg`
- Item hover: `hover:bg-gray-50`
- Logout in dropdown: `text-red-600 hover:bg-red-50`

### Footer
- Background: `bg-white`, top border: `border-t border-gray-200`
- Text: `text-xs text-gray-500`
- Brand: `text-blue-600 font-semibold`
- Tagline: "Faster Sales. Smarter Business."

---

## Stat Card Pattern (used in Dashboard, Shift, Products, Customers)

```tsx
<div className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-{color}-50/50 {border} {shadow} hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex flex-col justify-center">
  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl {glow}" />
  <div className="flex items-center justify-between mb-4 relative">
    <div className="p-3.5 rounded-xl transition-all duration-300 {iconBg} group-hover:scale-110 {hoverBg}">
      <Icon className="w-6 h-6 {iconColor}" />
    </div>
    <span className="text-xs font-medium px-2.5 py-1 rounded-full {badge}">{badgeText}</span>
  </div>
  <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{value}</p>
  <p className="text-sm font-medium text-gray-500 relative">{label}</p>
</div>
```

---

## Form Patterns

### Drawer Form (SlideDrawer)
- Section wrapper: `rounded-xl border border-gray-200 overflow-hidden mb-5`
- Section header: `px-4 py-3 bg-gray-50 border-b border-gray-200`
- Section title: `text-sm font-semibold text-gray-800`
- Field label: `block text-sm font-medium text-gray-700 mb-1`
- Required asterisk: `text-red-500`
- Input: `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`
- Select: same as input with `bg-white`
- Checkbox: `rounded border-gray-300 text-blue-600 focus:ring-blue-500`
- Textarea: same as input with `resize-none`

### Full-Page Form
- Uses same field patterns as drawer form
- Cards with sections using `-mx-6 -mt-6 mb-6 rounded-t-xl` for header bleed

---

## Receipt Print Styles
- Print wrapper: `bg-white p-4 sm:p-6 max-w-sm mx-auto`
- Header: `text-center` with `uppercase` business name
- Info rows: `flex justify-between` in `text-xs`
- Table header: `border-b border-gray-700` (dark for print clarity)
- Row dividers: `border-b border-dashed border-gray-300`
- Totals: `border-t border-gray-200`
- Status: colored text (`text-green-600` / `text-red-500` / `text-amber-500`)
- Footer: `border-t border-dashed border-gray-300 text-gray-400`

---

## Conventions

### Buttons
- Primary actions: use `Button` component with `variant="primary"`
- Table row actions: use `Button` with `variant="ghost" size="sm"`
- Destructive actions: use `Button` with `variant="danger"`
- Inline confirm before delete: `useConfirm()` dialog

### Icons
- Always use `lucide-react`
- Icon size convention: `w-4 h-4` (small), `w-5 h-5` (medium), `w-6 h-6` (large)
- Icon color: `text-gray-400` for muted, `text-gray-600` for default, `text-blue-600` for active

### Forms
- Always use the shared input styles from `shared/utils/inputStyles.ts`
- Validate on submit, not on change
- Show field-level errors below the input in `text-xs text-red-500`
- Required fields marked with `<span className="text-red-500">*</span>`

### Data Fetching
- React Query for all server state
- Query key factories with `all: ['domain']` base
- Mutations follow optimistic update pattern: onMutate → snapshot → setQueryData → onError rollback → onSettled invalidate
- Single-object queries (business settings) skip optimistic updates

### Pagination
- Client-side via `usePagination(data, pageSize)` from `shared/components/tables/Pagination`
- Default page sizes: 10 for tables, 5 for shift history

### Guards
- Always remove `any` types; use specific interfaces
- Confirm before destructive actions using `useConfirm()`
- Disable buttons during loading with `loading` prop on `Button`
