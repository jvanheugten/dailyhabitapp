# UI Polish & Desktop Layout — Design Spec

## Goal

Make the app look polished and consistent on all screen sizes: centered phone-frame on desktop, and a unified design system across Today, Habits, Journal, and global elements.

## Desktop Layout

Single CSS change in `src/App.module.css`:
- `.app` gets `max-width: 430px; margin: 0 auto; position: relative`
- `body` background stays `var(--bg)` — fills flanks with the same dark colour
- No per-screen changes needed; all screens inherit the constraint automatically

## Global Design System Fixes

### CSS Variable compliance

`Today.module.css`, `Habits.module.css`, and `BottomNav.module.css` currently use hardcoded hex values. Replace all of them with design-system tokens:

| Hardcoded | Replace with |
|---|---|
| `#1a1a1a`, `#0d0d0d` | `var(--surface)` |
| `#1e1e1e`, `#2a2a2a` | `var(--border-subtle)` |
| `#555`, `#666`, `#888` | `var(--text-muted)` |
| `#4ade80` (inline) | `var(--green)` |
| `#7f1d1d` (delete red bg) | `rgba(239,68,68,0.15)` |
| `#fca5a5` (delete red text) | `#ef4444` |

### Standard card style

All list items and content cards use this pattern:

```css
background: var(--surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius);
padding: 12px 14px;
```

Apply to: Today habit rows, Habits list items, Journal entry rows.

### Typography scale

| Use | Size | Weight | Notes |
|---|---|---|---|
| Screen title | 20px | 700 | Habits "Habits", Journal "Journal" |
| Section label | 10px | 600 | Uppercase, `letter-spacing: 0.1em`, `var(--text-dim)` |
| Body / list item | 14–15px | 500 | Habit name, journal date |
| Secondary / meta | 11–12px | 400 | Days, times, `var(--text-muted)` |

### Button styles

- FAB (Habits add button): `background: var(--green); color: #000` — already correct in intent, just needs variable
- Destructive confirm: `background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-sm)`
- Cancel: `background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm)`

## Screen-Specific Changes

### Today screen

- Habit rows: apply standard card style; replace hardcoded `#1a1a1a` background
- Journal section: replace `border-top: 1px solid #1e1e1e` with `var(--border-subtle)`; align label style to section label token
- Header date/progress: no changes needed (already uses CSS vars)

### Habits screen

- List items: standard card style replacing `background: #1a1a1a`
- Delete/confirm row: use design-system destructive + cancel button styles above
- FAB: `var(--green)` + `var(--radius)`; position calc uses `env(safe-area-inset-bottom)` already — keep

### Journal screen

- Entry list rows: apply standard card style (currently unstyled divs)
- Selected/active entry: `border-color: var(--accent)` to show selection state
- Timestamps (createdAt/updatedAt): already styled — verify they use `var(--text-dim)`

### BottomNav

- Replace `background: #1a1a1a` → `var(--surface)`
- Replace `border-top: 1px solid #2a2a2a` → `var(--border-subtle)`

## Files Changed

| File | Change |
|---|---|
| `src/App.module.css` | Add `max-width: 430px; margin: 0 auto` to `.app` |
| `src/index.css` | No change — design system already correct |
| `src/components/BottomNav.module.css` | Replace hardcoded colours |
| `src/screens/Today.module.css` | Replace hardcoded colours, standard card |
| `src/screens/Habits.module.css` | Replace hardcoded colours, standard card, button styles |
| `src/screens/Journal.module.css` | Standard card on entry rows |

## Testing

No logic changes — visual review only. Check:
- Desktop: app centered at 430px, dark flanks either side
- Mobile: no visual regression (max-width doesn't affect narrow viewports)
- All screens: cards consistent, no colour inconsistency
- Habits: delete flow uses new red/cancel styles
- Journal: entry rows have card borders
