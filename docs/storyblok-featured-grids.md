# Storyblok setup guide: Featured Grids

This project now supports one `featured_grid` block with multiple operating modes.

## Goal
Use the same block component for three contexts:
1. `auto_random` → common rotating featured products
2. `manual_featured` → admin-picked products
3. `seasonal` → owner-picked seasonal categories

---

## 1) Product content prerequisites

In Storyblok, product listings should continue to live under the `products/` folder as stories.

Each product story should have at least:
- `name`
- `price_pln`
- `photos`
- `category` (multi-option/tag list)
- `pcs`

`category` is used by the seasonal featured mode.

Recommended category conventions for seasons:
- `spring`
- `summer`
- `autumn`
- `winter`
- `christmas`
- `easter`

---

## 2) Update the `featured_grid` block schema

Add the following fields to your existing `featured_grid` block in Storyblok:

1. `title`
   - Type: Text
   - Example: `Seasonal Picks`

2. `intro`
   - Type: Textarea
   - Optional section description under title

3. `mode`
   - Type: Single-option
   - Options:
     - `auto_random`
     - `manual_featured`
     - `seasonal`
   - Default: `auto_random`

4. `items_limit`
   - Type: Number
   - Recommended: `4`, `6`, or `8`

5. `rotate_every_hours`
   - Type: Number
   - Used only in `auto_random`
   - Recommended: `6`, `12`, or `24`

6. `include_out_of_stock`
   - Type: Boolean
   - If `false`, grid only shows ready-now items
   - If `true`, made-to-order items can appear too

7. `manual_items`
   - Type: Multi-asset link / multi-link (stories)
   - Used only in `manual_featured`
   - Select stories from `products/`

8. `season_key`
   - Type: Text
   - Used in `seasonal`
   - Example: `winter`

9. `seasonal_categories`
   - Type: Multi-option or text list
   - Used in `seasonal`
   - Example values: `winter`, `christmas`

---

## 3) How each mode behaves

### A) `auto_random`
- Pulls products from Storyblok `products/`
- Applies stock availability
- Deterministically shuffles by time window
- Rotates every `rotate_every_hours`

### B) `manual_featured`
- Uses `manual_items` selection from Storyblok
- Keeps the selected order
- Applies stock visibility rules via `include_out_of_stock`

### C) `seasonal`
- Filters products by categories
- Matches either:
  - exact `seasonal_categories`, or
  - category containing `season_key`

---

## 4) Editor playbook

### Common rotating grid
- mode = `auto_random`
- items_limit = `6`
- rotate_every_hours = `12`
- include_out_of_stock = `false`

### Admin fixed featured grid
- mode = `manual_featured`
- pick items in `manual_items`
- include_out_of_stock = your preference

### Seasonal grid
- mode = `seasonal`
- season_key = e.g. `winter`
- seasonal_categories = e.g. `winter`, `christmas`

---

## 5) Placement guidance (for coherent homepage)

To match current layout style:
- Keep featured grids directly below hero/feature storytelling sections
- Use one clear title per grid
- Limit to 4–8 products per grid
- Prefer 1–2 featured grids per page section to avoid visual overload

---

## 6) Operational notes

- Storyblok is the source of product data.
- Redis availability overlay is applied server-side for "ready now" counts.
- Seasonal/manual selections are story-driven, no redeploy required when editors update stories.
