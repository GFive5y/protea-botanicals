// src/components/hq/HQFoodIngredients.js
// WP-FNB S1 — Claude G5 Food & Beverage Ingredient Encyclopedia — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside component),
//        WorkflowGuide first element, InfoTooltip on key fields
/* ═══════════════════════════════════════════════════════════════════
 * COMPONENT MAP — HQFoodIngredients.js — WP-TABLE-UNIFY Phase 0 (17 Apr 2026)
 * ═══════════════════════════════════════════════════════════════════
 * LOCATION           src/components/hq/HQFoodIngredients.js
 * LINES              ~5,083
 * CONSUMED IN        HQ Command Centre → hq-ingredients tab (F&B only)
 * TENANT CONTEXT     useTenant() at L3128 inside component body (RULE 0G)
 *                    destructure: { tenantId }
 *
 * STATE VARIABLES    15 useState hooks — SEED_INGREDIENTS frozen (WTU-007)
 *   searchQ              — plain text search (no tokens yet)
 *   filterCat            — category filter string
 *   filterAllergen       — allergen filter string
 *   filterHaccp          — HACCP risk level filter
 *   filterTemp           — temperature zone filter
 *   selectedIngredient   — detail panel open state
 *   compareList          — ingredient comparison array
 *   activeTab            — 'library' | 'my-ingredients' | 'create'
 *   (MISSING: sortField, sortDir, viewMode, tileSize, groupFilter,
 *    subFilter, pillExpanded, selectMode, selectedIds, colPickerOpen)
 *
 * SUPABASE CALLS     (3 total — all on food_ingredients, NOT inventory_items)
 *   L3185  food_ingredients SELECT  .or("is_seeded.eq.true,tenant_id.eq."+tenantId)
 *   L3228  food_ingredients UPDATE  (by id)
 *   L3273  food_ingredients INSERT  tenant_id: tenantId (RULE 0F)
 *
 * RENDER SECTIONS (return anchors)
 *   L2419  primary component return
 *   L2436/2442/2463/2488/2510/2538 — sub-component returns
 *   L2614  large card-grid block
 *   L3355  main ingredient grid return
 *
 * DS6 VIOLATIONS (per WP-TABLE-UNIFY_v1_0.md DS6 map — confirmed)
 *   L15-34   Local `C` palette (partial WP-UNIFY done — still raw hex:
 *            #D4CFC4, #1D4ED8, #5B21B6, #245C43, #F5F3FF)
 *   L37-106  Local CATEGORIES array with per-category raw hex — should
 *            migrate to FOOD_WORLDS from FoodWorlds.js (LL-278)
 *   L126-132 HACCP_COLORS: #F0FDF4/#166534, #FEF3C7/#92400E,
 *            #FFF7ED/#C2410C, #FEF2F2/#991B1B
 *            → T.successLight/Text, warningLight/Text, dangerLight/Text
 *   L3484,3707,3754,3983,4546  borderRadius: 10 (integer) → T.radius.lg
 *   L3641-3645 (per gospel) borderRadius: 6 → T.radius.md
 *   Row heights: target 44px single-line, 56px two-line (LL-284)
 *
 * WP-TABLE-UNIFY PLANNED ADDITIONS
 *   Phase 1  DS6 compliance pass · T import exists at L12 · Remove `C`,
 *            migrate HACCP_COLORS + TEMP_COLORS to token-derived map
 *   Phase 2  Ingredient Encyclopedia rebuild — FoodWorld banner icons
 *            (SC-17), FNB_PILL_HIERARCHY drill-down (SC-06),
 *            FNB_SUBCATEGORY_ICONS[item.subcategory] in CATEGORY column
 *            (LL-283)
 *   Phase 3  SmartInventory feature parity — tile view, bulk actions,
 *            smart search with FNB tokens (expiry<7, zone:frozen,
 *            allergen:dairy, portions>10)
 *   Phase 4  Column resize + advanced filters (post-demo)
 * ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";
import { T } from "../../styles/tokens";
import ViewToggle from "./food/ViewToggle";
import FoodTileView from "./food/FoodTileView";
import FoodListView from "./food/FoodListView";
import FoodPillNav, { pillMatches } from "./food/FoodPillNav";
import FoodKPIStrip from "./food/FoodKPIStrip";
import FoodSmartSearch, { matchesSmartSearch } from "./food/FoodSmartSearch";

// WP-UNIFY: F&B local palette mapped to tokens.js T where equivalent
const C = {
  bg: T.surface,
  surface: T.surface,
  border: T.border,
  ink: T.ink900,
  inkMid: T.ink700,
  inkLight: T.ink500,
  accent: T.accentMid,
  accentBg: T.accentLight,
  amber: T.warning,
  amberBg: T.warningLight,
  red: T.danger,
  redBg: T.dangerLight,
  blue: "#1D4ED8",     // KEPT — cold-chain info panels. T.info drifts from Tailwind blue to muted teal (same as TEMP_COLORS decision). Revisit post-demo.
  blueBg: T.infoLight,
  purple: T.purpleText,
  purpleBg: T.purpleLight,
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "grain_cereal",
    label: "Grains & Cereals",
    icon: "🌾",
    color: "#92400E",
  },
  { key: "dairy", label: "Dairy & Eggs", icon: "🥛", color: "#1D4ED8" },
  {
    key: "meat_fish",
    label: "Meat, Poultry & Fish",
    icon: "🐟",
    color: "#DC2626",
  },
  {
    key: "fruit_vegetable",
    label: "Fruit & Vegetables",
    icon: "🥦",
    color: "#16A34A",
  },
  { key: "fat_oil", label: "Fats & Oils", icon: "🫒", color: "#CA8A04" },
  { key: "sweetener", label: "Sweeteners", icon: "🍯", color: "#D97706" },
  {
    key: "flavouring",
    label: "Flavourings & Extracts",
    icon: "🧪",
    color: "#7C3AED",
  },
  { key: "spice_herb", label: "Spices & Herbs", icon: "🌿", color: "#065F46" },
  {
    key: "salt_mineral",
    label: "Salts & Minerals",
    icon: "🧂",
    color: "#475569",
  },
  { key: "preservative", label: "Preservatives", icon: "🛡️", color: "#9F1239" },
  {
    key: "colour_additive",
    label: "Colours & Additives",
    icon: "🎨",
    color: "#BE185D",
  },
  {
    key: "emulsifier",
    label: "Emulsifiers & Stabilisers",
    icon: "⚗️",
    color: "#0E7490",
  },
  { key: "acid_base", label: "Acids & Bases", icon: "🔬", color: "#6D28D9" },
  { key: "enzyme", label: "Enzymes", icon: "🧬", color: "#0369A1" },
  {
    key: "vitamin_supplement",
    label: "Vitamins & Supplements",
    icon: "💊",
    color: "#059669",
  },
  {
    key: "packaging_contact",
    label: "Packaging (Food Contact)",
    icon: "📦",
    color: "#374151",
  },
  {
    key: "water",
    label: "Water & Process Liquids",
    icon: "💧",
    color: "#0891B2",
  },
  { key: "other", label: "Other", icon: "⬡", color: "#6B7280" },
];

// ─── Allergen config ──────────────────────────────────────────────────────────
const ALLERGENS = [
  { key: "gluten", label: "Gluten", icon: "🌾" },
  { key: "crustaceans", label: "Shellfish", icon: "🦐" },
  { key: "eggs", label: "Eggs", icon: "🥚" },
  { key: "fish", label: "Fish", icon: "🐟" },
  { key: "peanuts", label: "Peanuts", icon: "🥜" },
  { key: "soybeans", label: "Soy", icon: "🫘" },
  { key: "milk", label: "Dairy", icon: "🥛" },
  { key: "nuts", label: "Tree Nuts", icon: "🌰" },
  { key: "celery", label: "Celery", icon: "🥬" },
  { key: "mustard", label: "Mustard", icon: "🌱" },
  { key: "sesame", label: "Sesame", icon: "⚪" },
  { key: "sulphites", label: "Sulphites", icon: "🧪" },
  { key: "lupin", label: "Lupin", icon: "🌼" },
  { key: "molluscs", label: "Molluscs", icon: "🐚" },
];

// ─── HACCP colours ────────────────────────────────────────────────────────────
// INTENTIONAL CONTENT COLOURS — NOT migrated to T tokens (S293 PR 2b.3 decision).
// These 4 hues label food-safety risk levels (Low/Medium/High/Critical) and
// must remain visually distinct for safety. Migrating to getSeverityTokens()
// would collapse Medium and High into the same warning-amber (both map to
// "warning" severity), and would shift Critical's red, Low's green, and the
// bright orange of High toward muted T palette equivalents. See 2b scoping.
// Revisit post-demo if a proper design audit is performed (would need
// T.warningStrong etc. to preserve distinctness).
const HACCP_COLORS = {
  low: { bg: "#F0FDF4", color: "#166534", label: "Low Risk" },
  medium: { bg: "#FEF3C7", color: "#92400E", label: "Medium Risk" },
  high: { bg: "#FFF7ED", color: "#C2410C", label: "High Risk" },
  critical: { bg: "#FEF2F2", color: "#991B1B", label: "Critical CCP" },
};

// ─── Temperature colours ──────────────────────────────────────────────────────
// INTENTIONAL CONTENT COLOURS — NOT migrated to T tokens (S293 PR 2b.3 decision).
// 3 hues label cold-chain zones (Ambient/Refrigerated/Frozen). Saturated blue
// for Refrigerated and indigo for Frozen are preserved for visual distinctness;
// getSeverityTokens's "info" + "purple" alternatives drift the Refrigerated
// blue toward muted teal and Frozen's indigo toward violet. Revisit post-demo.
const TEMP_COLORS = {
  ambient: { bg: "#F0FDF4", color: "#166534", label: "Ambient", icon: "☀️" },
  refrigerated: {
    bg: "#EFF6FF",
    color: "#1D4ED8",
    label: "Refrigerated",
    icon: "❄️",
  },
  frozen: { bg: "#EEF2FF", color: "#4338CA", label: "Frozen", icon: "🧊" },
};

// ─── SEED DATA — 200+ ingredients ─────────────────────────────────────────────
// Full nutritional data per 100g (DAFF South African Food Composition Database)
// allergen_flags: SA R638 + EU 1169/2011 (14 keys)
const SEED_INGREDIENTS = [
  // ── GRAINS & CEREALS ──────────────────────────────────────────────────────
  {
    name: "Wheat Flour (Cake/All-Purpose)",
    common_name: "Cake Flour",
    category: "grain_cereal",
    sub_category: "flour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: { gluten: true },
    nutrition_per_100g: {
      energy_kj: 1477,
      energy_kcal: 354,
      protein_g: 9.2,
      fat_total_g: 0.9,
      fat_saturated_g: 0.1,
      carbohydrate_g: 76.3,
      sugars_g: 0.3,
      dietary_fibre_g: 2.4,
      sodium_mg: 2,
    },
    storage_notes: "Store in sealed container. Keep dry and cool.",
    e_number: null,
    requires_fsca_approval: false,
  },
  {
    name: "Wheat Flour (Bread/Strong)",
    common_name: "Bread Flour",
    category: "grain_cereal",
    sub_category: "flour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: { gluten: true },
    nutrition_per_100g: {
      energy_kj: 1490,
      energy_kcal: 357,
      protein_g: 11.8,
      fat_total_g: 1.0,
      fat_saturated_g: 0.1,
      carbohydrate_g: 74.2,
      sugars_g: 0.2,
      dietary_fibre_g: 2.9,
      sodium_mg: 2,
    },
    storage_notes: "Store in sealed container. Keep dry.",
    requires_fsca_approval: false,
  },
  {
    name: "Rolled Oats",
    common_name: "Porridge Oats",
    category: "grain_cereal",
    sub_category: "oats",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: { gluten: true },
    nutrition_per_100g: {
      energy_kj: 1628,
      energy_kcal: 389,
      protein_g: 16.9,
      fat_total_g: 6.9,
      fat_saturated_g: 1.2,
      carbohydrate_g: 66.3,
      sugars_g: 1.0,
      dietary_fibre_g: 10.6,
      sodium_mg: 2,
    },
    storage_notes: "Store in airtight container.",
    requires_fsca_approval: false,
  },
  {
    name: "White Rice (Long Grain)",
    common_name: "White Rice",
    category: "grain_cereal",
    sub_category: "rice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1528,
      energy_kcal: 365,
      protein_g: 7.1,
      fat_total_g: 0.7,
      fat_saturated_g: 0.2,
      carbohydrate_g: 79.0,
      sugars_g: 0.1,
      dietary_fibre_g: 0.6,
      sodium_mg: 1,
    },
    storage_notes: "Store dry. Keep away from pests.",
    requires_fsca_approval: false,
  },
  {
    name: "Brown Rice",
    category: "grain_cereal",
    sub_category: "rice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1490,
      energy_kcal: 357,
      protein_g: 7.5,
      fat_total_g: 2.7,
      fat_saturated_g: 0.5,
      carbohydrate_g: 73.1,
      sugars_g: 0.7,
      dietary_fibre_g: 3.5,
      sodium_mg: 3,
    },
    storage_notes: "Store in cool, dry place.",
    requires_fsca_approval: false,
  },
  {
    name: "Cornflour (Maizena)",
    common_name: "Cornstarch",
    category: "grain_cereal",
    sub_category: "starch",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1546,
      energy_kcal: 370,
      protein_g: 0.3,
      fat_total_g: 0.1,
      fat_saturated_g: 0.0,
      carbohydrate_g: 91.3,
      sugars_g: 0.0,
      dietary_fibre_g: 0.9,
      sodium_mg: 9,
    },
    storage_notes: "Keep dry and sealed.",
    requires_fsca_approval: false,
  },
  {
    name: "Semolina",
    category: "grain_cereal",
    sub_category: "semolina",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: { gluten: true },
    nutrition_per_100g: {
      energy_kj: 1490,
      energy_kcal: 360,
      protein_g: 12.7,
      fat_total_g: 1.1,
      carbohydrate_g: 72.8,
      dietary_fibre_g: 3.9,
      sodium_mg: 1,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Polenta (Coarse Cornmeal)",
    category: "grain_cereal",
    sub_category: "cornmeal",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1494,
      energy_kcal: 362,
      protein_g: 8.1,
      fat_total_g: 3.6,
      carbohydrate_g: 74.1,
      dietary_fibre_g: 3.9,
      sodium_mg: 35,
    },
    requires_fsca_approval: false,
  },

  // ── DAIRY & EGGS ──────────────────────────────────────────────────────────
  {
    name: "Full Cream Milk (Fresh)",
    common_name: "Whole Milk",
    category: "dairy",
    sub_category: "milk",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 7,
    haccp_risk_level: "critical",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 268,
      energy_kcal: 64,
      protein_g: 3.3,
      fat_total_g: 3.7,
      fat_saturated_g: 2.3,
      carbohydrate_g: 4.8,
      sugars_g: 4.8,
      dietary_fibre_g: 0,
      sodium_mg: 50,
    },
    storage_notes: "Keep refrigerated at 2–4°C. Never freeze.",
    handling_notes: "HACCP CCP: temperature must not exceed 8°C.",
    requires_fsca_approval: true,
    fsca_category: "dairy",
  },
  {
    name: "Low Fat Milk (2%)",
    category: "dairy",
    sub_category: "milk",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 7,
    haccp_risk_level: "critical",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 192,
      energy_kcal: 46,
      protein_g: 3.3,
      fat_total_g: 2.0,
      fat_saturated_g: 1.2,
      carbohydrate_g: 4.7,
      sugars_g: 4.7,
      sodium_mg: 49,
    },
    storage_notes: "Keep refrigerated at 2–4°C.",
    requires_fsca_approval: true,
  },
  {
    name: "UHT Full Cream Milk",
    category: "dairy",
    sub_category: "milk",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 180,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 268,
      energy_kcal: 64,
      protein_g: 3.3,
      fat_total_g: 3.7,
      fat_saturated_g: 2.3,
      carbohydrate_g: 4.8,
      sugars_g: 4.8,
      sodium_mg: 50,
    },
    storage_notes: "Store at ambient until opened. Refrigerate after opening.",
    requires_fsca_approval: true,
  },
  {
    name: "Unsalted Butter",
    category: "dairy",
    sub_category: "butter",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 60,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 3031,
      energy_kcal: 726,
      protein_g: 0.5,
      fat_total_g: 81.1,
      fat_saturated_g: 50.5,
      carbohydrate_g: 0.1,
      sugars_g: 0.1,
      sodium_mg: 7,
    },
    storage_notes: "Keep refrigerated. Can be frozen for up to 6 months.",
    requires_fsca_approval: false,
  },
  {
    name: "Salted Butter",
    category: "dairy",
    sub_category: "butter",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 90,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 3027,
      energy_kcal: 722,
      protein_g: 0.5,
      fat_total_g: 80.5,
      fat_saturated_g: 50.2,
      carbohydrate_g: 0.1,
      sodium_mg: 643,
    },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: false,
  },
  {
    name: "Double Cream (Whipping Cream)",
    category: "dairy",
    sub_category: "cream",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 14,
    haccp_risk_level: "high",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 1511,
      energy_kcal: 362,
      protein_g: 2.0,
      fat_total_g: 38.0,
      fat_saturated_g: 23.7,
      carbohydrate_g: 2.8,
      sugars_g: 2.8,
      sodium_mg: 34,
    },
    storage_notes: "Keep refrigerated at 2–4°C.",
    handling_notes: "HACCP CCP: cold chain critical.",
    requires_fsca_approval: true,
  },
  {
    name: "Cream Cheese",
    category: "dairy",
    sub_category: "cheese",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 14,
    haccp_risk_level: "high",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 1382,
      energy_kcal: 330,
      protein_g: 5.8,
      fat_total_g: 33.0,
      fat_saturated_g: 21.0,
      carbohydrate_g: 3.2,
      sugars_g: 2.7,
      sodium_mg: 321,
    },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: true,
  },
  {
    name: "Cheddar Cheese",
    category: "dairy",
    sub_category: "cheese",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 90,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 1701,
      energy_kcal: 407,
      protein_g: 25.0,
      fat_total_g: 33.7,
      fat_saturated_g: 21.1,
      carbohydrate_g: 0.1,
      sodium_mg: 621,
    },
    storage_notes: "Keep refrigerated. Wrap tightly.",
    requires_fsca_approval: true,
  },
  {
    name: "Full Cream Yoghurt (Plain)",
    category: "dairy",
    sub_category: "yoghurt",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 14,
    haccp_risk_level: "high",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 264,
      energy_kcal: 63,
      protein_g: 5.0,
      fat_total_g: 3.2,
      fat_saturated_g: 2.0,
      carbohydrate_g: 4.7,
      sugars_g: 4.7,
      sodium_mg: 70,
    },
    storage_notes: "Keep refrigerated at 2–4°C.",
    requires_fsca_approval: true,
  },
  {
    name: "Eggs (Free Range, Large)",
    common_name: "Eggs",
    category: "dairy",
    sub_category: "eggs",
    default_unit: "pcs",
    temperature_zone: "refrigerated",
    shelf_life_days: 28,
    haccp_risk_level: "critical",
    allergen_flags: { eggs: true },
    nutrition_per_100g: {
      energy_kj: 627,
      energy_kcal: 150,
      protein_g: 12.6,
      fat_total_g: 10.6,
      fat_saturated_g: 3.3,
      carbohydrate_g: 0.6,
      sugars_g: 0.6,
      sodium_mg: 124,
    },
    storage_notes: "Keep refrigerated. Store pointed end down.",
    handling_notes:
      "HACCP CCP: Salmonella risk. Cook to ≥74°C internal temperature.",
    requires_fsca_approval: false,
  },
  {
    name: "Skim Milk Powder",
    category: "dairy",
    sub_category: "milk_powder",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 1469,
      energy_kcal: 351,
      protein_g: 36.2,
      fat_total_g: 0.7,
      fat_saturated_g: 0.4,
      carbohydrate_g: 52.0,
      sugars_g: 52.0,
      sodium_mg: 549,
    },
    storage_notes: "Store in sealed container in cool, dry place.",
    requires_fsca_approval: false,
  },
  {
    name: "Buttermilk",
    category: "dairy",
    sub_category: "milk",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 10,
    haccp_risk_level: "high",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 184,
      energy_kcal: 44,
      protein_g: 3.3,
      fat_total_g: 1.0,
      fat_saturated_g: 0.6,
      carbohydrate_g: 5.3,
      sugars_g: 5.3,
      sodium_mg: 105,
    },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: false,
  },

  // ── FATS & OILS ───────────────────────────────────────────────────────────
  {
    name: "Sunflower Oil (Refined)",
    common_name: "Sunflower Oil",
    category: "fat_oil",
    sub_category: "vegetable_oil",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3696,
      energy_kcal: 884,
      protein_g: 0,
      fat_total_g: 99.9,
      fat_saturated_g: 11.3,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    storage_notes: "Store away from light. Keep sealed.",
    requires_fsca_approval: false,
  },
  {
    name: "Extra Virgin Olive Oil",
    category: "fat_oil",
    sub_category: "olive_oil",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3696,
      energy_kcal: 884,
      protein_g: 0,
      fat_total_g: 99.9,
      fat_saturated_g: 14.3,
      carbohydrate_g: 0,
      sodium_mg: 2,
    },
    storage_notes: "Store in dark, cool place. Do not refrigerate.",
    requires_fsca_approval: false,
  },
  {
    name: "Coconut Oil (Refined)",
    category: "fat_oil",
    sub_category: "coconut_oil",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3696,
      energy_kcal: 884,
      protein_g: 0,
      fat_total_g: 99.1,
      fat_saturated_g: 86.5,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    storage_notes: "Store below 25°C.",
    requires_fsca_approval: false,
  },
  {
    name: "Canola Oil",
    category: "fat_oil",
    sub_category: "vegetable_oil",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3696,
      energy_kcal: 884,
      protein_g: 0,
      fat_total_g: 99.9,
      fat_saturated_g: 7.0,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Vegetable Shortening",
    category: "fat_oil",
    sub_category: "shortening",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3696,
      energy_kcal: 884,
      fat_total_g: 99.9,
      fat_saturated_g: 28.0,
      fat_trans_g: 0.5,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Lard (Pork Fat)",
    category: "fat_oil",
    sub_category: "animal_fat",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 180,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 3752,
      energy_kcal: 897,
      fat_total_g: 99.5,
      fat_saturated_g: 39.2,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: false,
  },

  // ── SWEETENERS ────────────────────────────────────────────────────────────
  {
    name: "White Sugar (Refined)",
    common_name: "Caster Sugar / Granulated Sugar",
    category: "sweetener",
    sub_category: "sucrose",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1700,
      energy_kcal: 406,
      protein_g: 0,
      fat_total_g: 0,
      carbohydrate_g: 101.3,
      sugars_g: 101.3,
      dietary_fibre_g: 0,
      sodium_mg: 1,
    },
    storage_notes: "Store dry. Prevent clumping.",
    requires_fsca_approval: false,
  },
  {
    name: "Brown Sugar (Light)",
    common_name: "Demerara Sugar",
    category: "sweetener",
    sub_category: "sucrose",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1659,
      energy_kcal: 396,
      carbohydrate_g: 98.9,
      sugars_g: 98.9,
      sodium_mg: 39,
    },
    storage_notes: "Store in airtight container to prevent hardening.",
    requires_fsca_approval: false,
  },
  {
    name: "Icing Sugar (Powdered)",
    category: "sweetener",
    sub_category: "sucrose",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1674,
      energy_kcal: 398,
      carbohydrate_g: 99.6,
      sugars_g: 99.6,
      sodium_mg: 1,
    },
    storage_notes: "Keep dry and sealed.",
    requires_fsca_approval: false,
  },
  {
    name: "Raw Honey",
    common_name: "Honey",
    category: "sweetener",
    sub_category: "honey",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1378,
      energy_kcal: 329,
      protein_g: 0.5,
      fat_total_g: 0,
      carbohydrate_g: 82.4,
      sugars_g: 82.1,
      sodium_mg: 4,
    },
    storage_notes:
      "Store at ambient. Do not refrigerate — causes crystallisation.",
    handling_notes: "WARNING: Not suitable for infants under 12 months.",
    requires_fsca_approval: false,
  },
  {
    name: "Golden Syrup",
    category: "sweetener",
    sub_category: "syrup",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1318,
      energy_kcal: 316,
      carbohydrate_g: 79.3,
      sugars_g: 68.3,
      sodium_mg: 34,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Maple Syrup (Grade A)",
    category: "sweetener",
    sub_category: "syrup",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1096,
      energy_kcal: 262,
      carbohydrate_g: 67.1,
      sugars_g: 60.5,
      sodium_mg: 9,
    },
    storage_notes: "Refrigerate after opening.",
    requires_fsca_approval: false,
  },
  {
    name: "Agave Nectar",
    category: "sweetener",
    sub_category: "syrup",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1305,
      energy_kcal: 312,
      carbohydrate_g: 78.0,
      sugars_g: 77.0,
      sodium_mg: 4,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Treacle (Dark Molasses)",
    category: "sweetener",
    sub_category: "molasses",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1040,
      energy_kcal: 248,
      carbohydrate_g: 64.5,
      sugars_g: 64.5,
      sodium_mg: 37,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Stevia Extract Powder",
    category: "sweetener",
    sub_category: "low_calorie",
    default_unit: "g",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E960",
    nutrition_per_100g: {
      energy_kj: 50,
      energy_kcal: 12,
      carbohydrate_g: 3.0,
      sugars_g: 0,
      sodium_mg: 0,
    },
    requires_fsca_approval: false,
  },

  // ── FLAVOURINGS & EXTRACTS ────────────────────────────────────────────────
  {
    name: "Vanilla Extract (Natural)",
    category: "flavouring",
    sub_category: "extract",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 816,
      energy_kcal: 195,
      carbohydrate_g: 29.1,
      sugars_g: 29.1,
      sodium_mg: 9,
    },
    storage_notes: "Store in cool, dark place.",
    requires_fsca_approval: false,
  },
  {
    name: "Vanilla Essence (Artificial)",
    category: "flavouring",
    sub_category: "essence",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 100,
      energy_kcal: 24,
      carbohydrate_g: 6.0,
      sodium_mg: 0,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Almond Extract",
    category: "flavouring",
    sub_category: "extract",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: { nuts: true },
    nutrition_per_100g: { energy_kj: 1205, energy_kcal: 288, sodium_mg: 0 },
    storage_notes: "Store in cool, dark place.",
    requires_fsca_approval: false,
  },
  {
    name: "Peppermint Extract",
    category: "flavouring",
    sub_category: "extract",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Rose Water",
    category: "flavouring",
    sub_category: "water",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Orange Blossom Water",
    category: "flavouring",
    sub_category: "water",
    default_unit: "ml",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },

  // ── SPICES & HERBS ────────────────────────────────────────────────────────
  {
    name: "Fine Table Salt",
    common_name: "Table Salt",
    category: "salt_mineral",
    sub_category: "salt",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 0,
      energy_kcal: 0,
      protein_g: 0,
      fat_total_g: 0,
      carbohydrate_g: 0,
      sodium_mg: 39300,
    },
    storage_notes: "Keep dry.",
    requires_fsca_approval: false,
  },
  {
    name: "Sea Salt (Coarse)",
    category: "salt_mineral",
    sub_category: "salt",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 0, energy_kcal: 0, sodium_mg: 38700 },
    requires_fsca_approval: false,
  },
  {
    name: "Ground Black Pepper",
    category: "spice_herb",
    sub_category: "pepper",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1079,
      energy_kcal: 258,
      protein_g: 10.4,
      fat_total_g: 3.3,
      carbohydrate_g: 65.0,
      dietary_fibre_g: 26.5,
      sodium_mg: 20,
    },
    storage_notes: "Store in sealed jar away from heat and light.",
    requires_fsca_approval: false,
  },
  {
    name: "Ground Cinnamon",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1054,
      energy_kcal: 252,
      protein_g: 4.0,
      fat_total_g: 1.2,
      carbohydrate_g: 80.6,
      dietary_fibre_g: 53.1,
      sodium_mg: 10,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Ground Cumin",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1567,
      energy_kcal: 375,
      protein_g: 17.8,
      fat_total_g: 22.3,
      carbohydrate_g: 44.2,
      dietary_fibre_g: 10.5,
      sodium_mg: 168,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Turmeric (Ground)",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1487,
      energy_kcal: 354,
      protein_g: 7.8,
      fat_total_g: 10.0,
      carbohydrate_g: 67.1,
      dietary_fibre_g: 22.7,
      sodium_mg: 38,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Smoked Paprika",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1264,
      energy_kcal: 302,
      protein_g: 14.1,
      fat_total_g: 14.4,
      carbohydrate_g: 53.9,
      dietary_fibre_g: 34.9,
      sodium_mg: 68,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Dried Basil",
    category: "spice_herb",
    sub_category: "herb",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 870,
      energy_kcal: 208,
      protein_g: 22.7,
      fat_total_g: 4.1,
      carbohydrate_g: 42.9,
      dietary_fibre_g: 37.7,
      sodium_mg: 76,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Dried Oregano",
    category: "spice_herb",
    sub_category: "herb",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1098,
      energy_kcal: 262,
      protein_g: 11.0,
      fat_total_g: 6.8,
      carbohydrate_g: 69.0,
      dietary_fibre_g: 42.5,
      sodium_mg: 25,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Mustard Powder",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: { mustard: true },
    nutrition_per_100g: {
      energy_kj: 1686,
      energy_kcal: 403,
      protein_g: 24.9,
      fat_total_g: 28.8,
      carbohydrate_g: 34.6,
      sodium_mg: 56,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Sesame Seeds (White)",
    category: "spice_herb",
    sub_category: "seed",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { sesame: true },
    nutrition_per_100g: {
      energy_kj: 2530,
      energy_kcal: 605,
      protein_g: 18.3,
      fat_total_g: 53.8,
      fat_saturated_g: 7.5,
      carbohydrate_g: 23.5,
      dietary_fibre_g: 11.8,
      sodium_mg: 11,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Caraway Seeds",
    category: "spice_herb",
    sub_category: "seed",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1413,
      energy_kcal: 338,
      protein_g: 19.8,
      fat_total_g: 14.6,
      carbohydrate_g: 49.9,
      sodium_mg: 17,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Fennel Seeds",
    category: "spice_herb",
    sub_category: "seed",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1260,
      energy_kcal: 301,
      protein_g: 15.8,
      fat_total_g: 14.9,
      carbohydrate_g: 52.3,
      sodium_mg: 88,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Cardamom (Ground)",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1298,
      energy_kcal: 310,
      protein_g: 10.8,
      fat_total_g: 6.7,
      carbohydrate_g: 68.5,
      sodium_mg: 18,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Chilli Flakes",
    category: "spice_herb",
    sub_category: "chilli",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1205,
      energy_kcal: 288,
      protein_g: 13.5,
      fat_total_g: 13.8,
      carbohydrate_g: 56.6,
      sodium_mg: 32,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Star Anise (Whole)",
    category: "spice_herb",
    sub_category: "spice",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Bay Leaves (Dried)",
    category: "spice_herb",
    sub_category: "herb",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Thyme (Dried)",
    category: "spice_herb",
    sub_category: "herb",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Rosemary (Dried)",
    category: "spice_herb",
    sub_category: "herb",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Mixed Spice (Pumpkin Spice)",
    category: "spice_herb",
    sub_category: "blend",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },

  // ── ACIDS, BASES & LEAVENERS ──────────────────────────────────────────────
  {
    name: "Baking Powder",
    category: "acid_base",
    sub_category: "leavener",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 218,
      energy_kcal: 53,
      carbohydrate_g: 27.7,
      sodium_mg: 10600,
    },
    storage_notes: "Keep dry. Close tightly after use.",
    requires_fsca_approval: false,
  },
  {
    name: "Bicarbonate of Soda",
    common_name: "Baking Soda",
    category: "acid_base",
    sub_category: "leavener",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 0, sodium_mg: 27400 },
    storage_notes: "Keep dry and sealed.",
    cas_number: "144-55-8",
    e_number: "E500ii",
    requires_fsca_approval: false,
  },
  {
    name: "Citric Acid",
    category: "acid_base",
    sub_category: "acid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 0, carbohydrate_g: 0, sodium_mg: 0 },
    cas_number: "77-92-9",
    e_number: "E330",
    storage_notes: "Store dry. Hygroscopic — keep sealed.",
    requires_fsca_approval: false,
  },
  {
    name: "Tartaric Acid",
    category: "acid_base",
    sub_category: "acid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    cas_number: "87-69-4",
    e_number: "E334",
    requires_fsca_approval: false,
  },
  {
    name: "Cream of Tartar",
    category: "acid_base",
    sub_category: "leavener",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1054,
      energy_kcal: 252,
      carbohydrate_g: 67.7,
      sodium_mg: 1000,
    },
    cas_number: "868-14-4",
    e_number: "E336i",
    requires_fsca_approval: false,
  },
  {
    name: "White Wine Vinegar",
    category: "acid_base",
    sub_category: "vinegar",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 88,
      energy_kcal: 21,
      carbohydrate_g: 0.6,
      sodium_mg: 2,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Apple Cider Vinegar",
    category: "acid_base",
    sub_category: "vinegar",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 88,
      energy_kcal: 21,
      carbohydrate_g: 1.0,
      sodium_mg: 5,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Instant Dry Yeast",
    common_name: "Active Dry Yeast",
    category: "acid_base",
    sub_category: "yeast",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1218,
      energy_kcal: 291,
      protein_g: 40.4,
      fat_total_g: 7.6,
      carbohydrate_g: 38.9,
      sodium_mg: 51,
    },
    storage_notes: "Keep cool and dry. Freeze for extended shelf life.",
    requires_fsca_approval: false,
  },

  // ── EMULSIFIERS & STABILISERS ─────────────────────────────────────────────
  {
    name: "Xanthan Gum",
    category: "emulsifier",
    sub_category: "hydrocolloid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1046,
      energy_kcal: 250,
      carbohydrate_g: 95.0,
      dietary_fibre_g: 95.0,
      sodium_mg: 750,
    },
    cas_number: "11138-66-2",
    e_number: "E415",
    requires_fsca_approval: false,
  },
  {
    name: "Guar Gum",
    category: "emulsifier",
    sub_category: "hydrocolloid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E412",
    requires_fsca_approval: false,
  },
  {
    name: "Soy Lecithin",
    category: "emulsifier",
    sub_category: "lecithin",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { soybeans: true },
    e_number: "E322",
    storage_notes: "Store in cool place.",
    requires_fsca_approval: false,
  },
  {
    name: "Sunflower Lecithin",
    category: "emulsifier",
    sub_category: "lecithin",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E322",
    requires_fsca_approval: false,
  },
  {
    name: "Agar Agar Powder",
    category: "emulsifier",
    sub_category: "hydrocolloid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E406",
    nutrition_per_100g: {
      energy_kj: 836,
      energy_kcal: 200,
      carbohydrate_g: 80.9,
      dietary_fibre_g: 80.9,
      sodium_mg: 9,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Gelatine Powder (Pork)",
    category: "emulsifier",
    sub_category: "gelatine",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1438,
      energy_kcal: 344,
      protein_g: 86.0,
      fat_total_g: 0.1,
      carbohydrate_g: 0,
      sodium_mg: 196,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Pectin (High Methoxyl)",
    category: "emulsifier",
    sub_category: "pectin",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E440i",
    requires_fsca_approval: false,
  },
  {
    name: "Carrageenan",
    category: "emulsifier",
    sub_category: "hydrocolloid",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E407",
    requires_fsca_approval: true,
    fsca_category: "permitted_additive",
  },

  // ── PRESERVATIVES ──────────────────────────────────────────────────────────
  {
    name: "Potassium Sorbate",
    category: "preservative",
    sub_category: "sorbate",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    cas_number: "24634-61-5",
    e_number: "E202",
    storage_notes: "Store dry, away from oxidising agents.",
    requires_fsca_approval: true,
    fsca_category: "permitted_additive",
    is_controlled: true,
  },
  {
    name: "Sodium Benzoate",
    category: "preservative",
    sub_category: "benzoate",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1825,
    haccp_risk_level: "medium",
    allergen_flags: {},
    cas_number: "532-32-1",
    e_number: "E211",
    handling_notes:
      "Do not combine with ascorbic acid (Vitamin C) — produces benzene.",
    requires_fsca_approval: true,
    fsca_category: "permitted_additive",
    is_controlled: true,
  },
  {
    name: "Sodium Metabisulphite",
    category: "preservative",
    sub_category: "sulphite",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "high",
    allergen_flags: { sulphites: true },
    cas_number: "7681-57-4",
    e_number: "E223",
    handling_notes:
      "ALLERGEN: Sulphites >10ppm must be declared. Wear PPE when handling.",
    requires_fsca_approval: true,
    fsca_category: "permitted_additive",
    is_controlled: true,
  },
  {
    name: "Ascorbic Acid (Vitamin C)",
    category: "preservative",
    sub_category: "antioxidant",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    cas_number: "50-81-7",
    e_number: "E300",
    requires_fsca_approval: false,
  },
  {
    name: "Rosemary Extract (Antioxidant)",
    category: "preservative",
    sub_category: "natural_antioxidant",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E392",
    requires_fsca_approval: false,
  },

  // ── COLOURS & ADDITIVES ───────────────────────────────────────────────────
  {
    name: "Caramel Colour (Class I)",
    category: "colour_additive",
    sub_category: "caramel",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E150a",
    requires_fsca_approval: true,
  },
  {
    name: "Beet Root Powder (Natural Red)",
    category: "colour_additive",
    sub_category: "natural_colour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E162",
    requires_fsca_approval: false,
  },
  {
    name: "Turmeric Extract (Natural Yellow)",
    category: "colour_additive",
    sub_category: "natural_colour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E100",
    requires_fsca_approval: false,
  },
  {
    name: "Spirulina Extract (Natural Blue-Green)",
    category: "colour_additive",
    sub_category: "natural_colour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Annatto Extract (Natural Orange)",
    category: "colour_additive",
    sub_category: "natural_colour",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    e_number: "E160b",
    requires_fsca_approval: false,
  },

  // ── CHOCOLATE & COCOA ─────────────────────────────────────────────────────
  {
    name: "Dark Chocolate Couverture (70% cocoa)",
    common_name: "Dark Chocolate",
    category: "flavouring",
    sub_category: "chocolate",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { milk: true, soybeans: true },
    nutrition_per_100g: {
      energy_kj: 2268,
      energy_kcal: 542,
      protein_g: 6.0,
      fat_total_g: 35.9,
      fat_saturated_g: 21.1,
      carbohydrate_g: 52.8,
      sugars_g: 39.0,
      dietary_fibre_g: 11.9,
      sodium_mg: 9,
    },
    storage_notes: "Store at 16–18°C. Keep away from strong odours.",
    handling_notes: "Temperature: 16–18°C storage. Tempering range: 31–32°C.",
    requires_fsca_approval: false,
  },
  {
    name: "Milk Chocolate Couverture (35% cocoa)",
    category: "flavouring",
    sub_category: "chocolate",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { milk: true, soybeans: true },
    nutrition_per_100g: {
      energy_kj: 2318,
      energy_kcal: 554,
      protein_g: 8.0,
      fat_total_g: 32.2,
      fat_saturated_g: 19.6,
      carbohydrate_g: 57.8,
      sugars_g: 56.0,
      sodium_mg: 58,
    },
    storage_notes: "Store at 16–18°C.",
    requires_fsca_approval: false,
  },
  {
    name: "White Chocolate Couverture",
    category: "flavouring",
    sub_category: "chocolate",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { milk: true, soybeans: true },
    nutrition_per_100g: {
      energy_kj: 2293,
      energy_kcal: 548,
      protein_g: 6.1,
      fat_total_g: 32.7,
      fat_saturated_g: 19.9,
      carbohydrate_g: 59.2,
      sugars_g: 59.0,
      sodium_mg: 90,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Cocoa Powder (Unsweetened)",
    category: "flavouring",
    sub_category: "cocoa",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 987,
      energy_kcal: 236,
      protein_g: 19.6,
      fat_total_g: 13.7,
      fat_saturated_g: 8.1,
      carbohydrate_g: 57.9,
      dietary_fibre_g: 33.2,
      sodium_mg: 21,
    },
    storage_notes: "Store dry.",
    requires_fsca_approval: false,
  },
  {
    name: "Dutch Process Cocoa Powder",
    category: "flavouring",
    sub_category: "cocoa",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 987,
      energy_kcal: 236,
      protein_g: 19.6,
      fat_total_g: 13.7,
      carbohydrate_g: 57.9,
      dietary_fibre_g: 33.2,
      sodium_mg: 21,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Carob Powder",
    category: "flavouring",
    sub_category: "carob",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 916,
      energy_kcal: 219,
      protein_g: 3.0,
      fat_total_g: 0.8,
      carbohydrate_g: 88.9,
      dietary_fibre_g: 39.8,
      sodium_mg: 35,
    },
    requires_fsca_approval: false,
  },

  // ── NUTS & SEEDS ──────────────────────────────────────────────────────────
  {
    name: "Almonds (Raw, Whole)",
    category: "flavouring",
    sub_category: "nuts",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: { nuts: true },
    nutrition_per_100g: {
      energy_kj: 2545,
      energy_kcal: 609,
      protein_g: 21.3,
      fat_total_g: 53.9,
      fat_saturated_g: 4.2,
      carbohydrate_g: 21.7,
      dietary_fibre_g: 12.5,
      sodium_mg: 1,
    },
    storage_notes: "Store in cool, dry place. Freeze for extended shelf life.",
    handling_notes:
      "ALLERGEN: Contains tree nuts. Cross-contamination risk to peanuts.",
    requires_fsca_approval: false,
  },
  {
    name: "Cashews (Raw)",
    category: "flavouring",
    sub_category: "nuts",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 180,
    haccp_risk_level: "medium",
    allergen_flags: { nuts: true },
    nutrition_per_100g: {
      energy_kj: 2360,
      energy_kcal: 564,
      protein_g: 18.2,
      fat_total_g: 46.3,
      fat_saturated_g: 9.2,
      carbohydrate_g: 30.2,
      dietary_fibre_g: 3.3,
      sodium_mg: 12,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Walnuts (Halves)",
    category: "flavouring",
    sub_category: "nuts",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 180,
    haccp_risk_level: "medium",
    allergen_flags: { nuts: true },
    nutrition_per_100g: {
      energy_kj: 2757,
      energy_kcal: 659,
      protein_g: 15.2,
      fat_total_g: 65.2,
      fat_saturated_g: 6.1,
      carbohydrate_g: 13.7,
      dietary_fibre_g: 6.7,
      sodium_mg: 2,
    },
    storage_notes: "Store in cool place or refrigerate.",
    requires_fsca_approval: false,
  },
  {
    name: "Peanuts (Roasted, Unsalted)",
    category: "flavouring",
    sub_category: "peanuts",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 180,
    haccp_risk_level: "high",
    allergen_flags: { peanuts: true },
    nutrition_per_100g: {
      energy_kj: 2567,
      energy_kcal: 614,
      protein_g: 25.8,
      fat_total_g: 53.0,
      fat_saturated_g: 7.4,
      carbohydrate_g: 21.5,
      dietary_fibre_g: 8.5,
      sodium_mg: 6,
    },
    handling_notes:
      "ALLERGEN HIGH RISK: Peanut. Dedicated equipment required. HACCP CCP.",
    requires_fsca_approval: false,
  },
  {
    name: "Desiccated Coconut (Fine)",
    category: "flavouring",
    sub_category: "coconut",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 2707,
      energy_kcal: 647,
      protein_g: 6.9,
      fat_total_g: 64.5,
      fat_saturated_g: 57.2,
      carbohydrate_g: 23.7,
      dietary_fibre_g: 15.2,
      sodium_mg: 26,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Tahini (Sesame Paste)",
    category: "flavouring",
    sub_category: "paste",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { sesame: true },
    nutrition_per_100g: {
      energy_kj: 2602,
      energy_kcal: 622,
      protein_g: 21.2,
      fat_total_g: 53.8,
      fat_saturated_g: 7.5,
      carbohydrate_g: 21.2,
      dietary_fibre_g: 9.3,
      sodium_mg: 68,
    },
    requires_fsca_approval: false,
  },

  // ── FRUIT & VEGETABLES ────────────────────────────────────────────────────
  {
    name: "Tomato Purée (Concentrated)",
    category: "fruit_vegetable",
    sub_category: "puree",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 7,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 218,
      energy_kcal: 52,
      protein_g: 2.5,
      fat_total_g: 0.3,
      carbohydrate_g: 12.2,
      sugars_g: 8.3,
      sodium_mg: 59,
    },
    storage_notes: "Refrigerate after opening. Use within 7 days.",
    requires_fsca_approval: false,
  },
  {
    name: "Lemon Juice (Fresh / Bottled)",
    category: "fruit_vegetable",
    sub_category: "citrus_juice",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 7,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 121,
      energy_kcal: 29,
      carbohydrate_g: 9.3,
      sugars_g: 2.5,
      sodium_mg: 2,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Orange Juice (100% NFC)",
    category: "fruit_vegetable",
    sub_category: "citrus_juice",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 14,
    haccp_risk_level: "high",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 192,
      energy_kcal: 46,
      protein_g: 0.7,
      fat_total_g: 0.2,
      carbohydrate_g: 10.4,
      sugars_g: 8.4,
      sodium_mg: 1,
    },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: true,
  },
  {
    name: "Dried Cranberries",
    category: "fruit_vegetable",
    sub_category: "dried_fruit",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1414,
      energy_kcal: 338,
      carbohydrate_g: 82.4,
      sugars_g: 72.6,
      dietary_fibre_g: 5.7,
      sodium_mg: 2,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Raisins (Seedless)",
    category: "fruit_vegetable",
    sub_category: "dried_fruit",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: { sulphites: true },
    nutrition_per_100g: {
      energy_kj: 1255,
      energy_kcal: 300,
      protein_g: 2.5,
      fat_total_g: 0.5,
      carbohydrate_g: 79.2,
      sugars_g: 59.2,
      dietary_fibre_g: 4.5,
      sodium_mg: 26,
    },
    handling_notes: "May contain sulphites (E220). Must be declared if >10ppm.",
    requires_fsca_approval: false,
  },
  {
    name: "Garlic Powder",
    category: "spice_herb",
    sub_category: "vegetable_powder",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1285,
      energy_kcal: 307,
      protein_g: 16.8,
      fat_total_g: 0.7,
      carbohydrate_g: 72.7,
      dietary_fibre_g: 9.0,
      sodium_mg: 60,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Onion Powder",
    category: "spice_herb",
    sub_category: "vegetable_powder",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1490,
      energy_kcal: 355,
      protein_g: 10.4,
      fat_total_g: 1.0,
      carbohydrate_g: 83.3,
      dietary_fibre_g: 8.8,
      sodium_mg: 17,
    },
    requires_fsca_approval: false,
  },

  // ── COFFEE ────────────────────────────────────────────────────────────────
  {
    name: "Green Coffee Beans (Arabica)",
    common_name: "Arabica Coffee Beans",
    category: "flavouring",
    sub_category: "coffee",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 800,
      energy_kcal: 191,
      protein_g: 11.0,
      fat_total_g: 0.6,
      carbohydrate_g: 45.5,
      sodium_mg: 4,
    },
    storage_notes:
      "Store in cool, dry, dark place. Moisture and light are enemies.",
    requires_fsca_approval: false,
  },
  {
    name: "Roasted Coffee Beans (Espresso Blend)",
    category: "flavouring",
    sub_category: "coffee",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 90,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1060,
      energy_kcal: 253,
      protein_g: 13.3,
      fat_total_g: 16.2,
      carbohydrate_g: 28.5,
      sodium_mg: 15,
    },
    storage_notes: "Store in airtight container. Grind fresh.",
    requires_fsca_approval: false,
  },
  {
    name: "Cold Brew Coffee Concentrate",
    category: "flavouring",
    sub_category: "coffee",
    default_unit: "L",
    temperature_zone: "refrigerated",
    shelf_life_days: 14,
    haccp_risk_level: "high",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 16, energy_kcal: 4, sodium_mg: 5 },
    storage_notes: "Keep refrigerated.",
    requires_fsca_approval: false,
  },
  {
    name: "Instant Coffee Powder",
    category: "flavouring",
    sub_category: "coffee",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1115,
      energy_kcal: 267,
      protein_g: 14.5,
      fat_total_g: 0.5,
      carbohydrate_g: 69.8,
      sodium_mg: 62,
    },
    requires_fsca_approval: false,
  },

  // ── TEA ───────────────────────────────────────────────────────────────────
  {
    name: "Rooibos (Loose Leaf)",
    category: "flavouring",
    sub_category: "tea",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 0, energy_kcal: 0, sodium_mg: 0 },
    storage_notes: "Store in airtight container away from strong odours.",
    requires_fsca_approval: false,
  },
  {
    name: "Green Tea (Loose Leaf)",
    category: "flavouring",
    sub_category: "tea",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Chamomile (Dried Flowers)",
    category: "flavouring",
    sub_category: "herbal_tea",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },
  {
    name: "Hibiscus Flowers (Dried)",
    category: "flavouring",
    sub_category: "herbal_tea",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "low",
    allergen_flags: {},
    requires_fsca_approval: false,
  },

  // ── SOY & PLANT PROTEINS ──────────────────────────────────────────────────
  {
    name: "Soy Sauce",
    category: "flavouring",
    sub_category: "condiment",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: { soybeans: true, gluten: true },
    nutrition_per_100g: {
      energy_kj: 247,
      energy_kcal: 59,
      protein_g: 8.7,
      fat_total_g: 0,
      carbohydrate_g: 5.6,
      sodium_mg: 5720,
    },
    storage_notes: "Store in cool, dark place.",
    requires_fsca_approval: false,
  },
  {
    name: "Tamari (Gluten-Free Soy Sauce)",
    category: "flavouring",
    sub_category: "condiment",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 1095,
    haccp_risk_level: "low",
    allergen_flags: { soybeans: true },
    nutrition_per_100g: {
      energy_kj: 247,
      energy_kcal: 59,
      protein_g: 8.7,
      fat_total_g: 0,
      carbohydrate_g: 5.6,
      sodium_mg: 5720,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Tofu (Firm)",
    category: "fruit_vegetable",
    sub_category: "soy_product",
    default_unit: "kg",
    temperature_zone: "refrigerated",
    shelf_life_days: 7,
    haccp_risk_level: "high",
    allergen_flags: { soybeans: true },
    nutrition_per_100g: {
      energy_kj: 337,
      energy_kcal: 80,
      protein_g: 8.5,
      fat_total_g: 4.7,
      carbohydrate_g: 2.0,
      sodium_mg: 7,
    },
    storage_notes: "Keep refrigerated. Store in water.",
    requires_fsca_approval: false,
  },
  {
    name: "Pea Protein Isolate",
    category: "vitamin_supplement",
    sub_category: "plant_protein",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "low",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 1505,
      energy_kcal: 360,
      protein_g: 80.0,
      fat_total_g: 5.0,
      carbohydrate_g: 5.0,
      sodium_mg: 400,
    },
    requires_fsca_approval: false,
  },
  {
    name: "Whey Protein Concentrate (80%)",
    category: "vitamin_supplement",
    sub_category: "whey",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: 730,
    haccp_risk_level: "medium",
    allergen_flags: { milk: true },
    nutrition_per_100g: {
      energy_kj: 1598,
      energy_kcal: 382,
      protein_g: 80.0,
      fat_total_g: 4.0,
      carbohydrate_g: 6.0,
      sodium_mg: 130,
    },
    requires_fsca_approval: false,
  },

  // ── WATER ─────────────────────────────────────────────────────────────────
  {
    name: "Potable Water (Process Water)",
    common_name: "Water",
    category: "water",
    sub_category: "process_water",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: null,
    haccp_risk_level: "critical",
    allergen_flags: {},
    nutrition_per_100g: {
      energy_kj: 0,
      energy_kcal: 0,
      protein_g: 0,
      fat_total_g: 0,
      carbohydrate_g: 0,
      sodium_mg: 0,
    },
    handling_notes:
      "HACCP CCP: Must meet SANS 241 potable water standard. Test quarterly.",
    requires_fsca_approval: false,
  },
  {
    name: "Sparkling Water (CO₂)",
    category: "water",
    sub_category: "carbonated",
    default_unit: "L",
    temperature_zone: "ambient",
    shelf_life_days: 365,
    haccp_risk_level: "medium",
    allergen_flags: {},
    nutrition_per_100g: { energy_kj: 0, energy_kcal: 0, sodium_mg: 0 },
    requires_fsca_approval: false,
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────
function getAllergenList(flags) {
  if (!flags) return [];
  return ALLERGENS.filter((a) => flags[a.key]);
}

function getCategory(key) {
  return (
    CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
  );
}

function formatNutrition(n, key) {
  if (!n || n[key] === undefined || n[key] === null) return "—";
  const v = n[key];
  if (key === "energy_kj" || key === "energy_kcal" || key === "sodium_mg")
    return v.toFixed(0);
  return v.toFixed(1);
}

// ─── Allergen badge ───────────────────────────────────────────────────────────
function AllergenBadge({ flags, compact = false }) {
  const present = getAllergenList(flags);
  if (present.length === 0)
    return (
      <span style={{ fontSize: T.text.xs, color: C.inkLight, fontStyle: "italic" }}>
        None declared
      </span>
    );
  if (compact)
    return (
      <div style={{ display: "flex", gap: T.gap.xs, flexWrap: "wrap" }}>
        {present.map((a) => (
          <span
            key={a.key}
            title={a.label}
            style={{
              background: "#FEF3C7",
              color: "#92400E",
              border: `1px solid ${T.warningBd}`,
              borderRadius: T.radius.sm,
              padding: "1px 6px",
              fontSize: T.text.xxs,
              fontWeight: T.weight.semibold,
            }}
          >
            {a.icon} {a.label}
          </span>
        ))}
      </div>
    );
  return (
    <div style={{ display: "flex", gap: T.gap.xs, flexWrap: "wrap" }}>
      {present.map((a) => (
        <span
          key={a.key}
          style={{
            background: "#FEF3C7",
            color: "#92400E",
            border: `1px solid ${T.warningBd}`,
            borderRadius: T.radius.sm,
            padding: "2px 8px",
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
          }}
        >
          {a.icon} {a.label}
        </span>
      ))}
    </div>
  );
}

// ─── HACCP badge ──────────────────────────────────────────────────────────────
function HaccpBadge({ level }) {
  const s = HACCP_COLORS[level] || HACCP_COLORS.low;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: T.radius.sm,
        padding: "2px 8px",
        fontSize: T.text.xs,
        fontWeight: T.weight.bold,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Temp badge ───────────────────────────────────────────────────────────────
function TempBadge({ zone }) {
  const s = TEMP_COLORS[zone] || TEMP_COLORS.ambient;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: T.radius.sm,
        padding: "2px 7px",
        fontSize: T.text.xs,
        fontWeight: T.weight.semibold,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

// ─── Nutrition mini display ───────────────────────────────────────────────────
function NutritionMini({ n }) {
  if (!n || Object.keys(n).length === 0)
    return <span style={{ color: C.inkLight, fontSize: T.text.xs }}>No data</span>;
  const items = [
    { label: "Energy", value: `${formatNutrition(n, "energy_kj")}kJ` },
    { label: "Protein", value: `${formatNutrition(n, "protein_g")}g` },
    { label: "Fat", value: `${formatNutrition(n, "fat_total_g")}g` },
    { label: "Carbs", value: `${formatNutrition(n, "carbohydrate_g")}g` },
    { label: "Sodium", value: `${formatNutrition(n, "sodium_mg")}mg` },
  ];
  return (
    <div style={{ display: "flex", gap: T.gap.md, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.label} style={{ textAlign: "center", minWidth: 52 }}>
          <div style={{ fontSize: T.text.smPlus, fontWeight: T.weight.bold, color: C.ink }}>
            {item.value}
          </div>
          <div
            style={{
              fontSize: T.text.xxs,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ingredient detail drawer ─────────────────────────────────────────────────
function IngredientDrawer({ ingredient, onClose }) {
  if (!ingredient) return null;
  const cat = getCategory(ingredient.category);
  const n = ingredient.nutrition_per_100g || {};
  const allergenList = getAllergenList(ingredient.allergen_flags);
  const macros = [
    {
      label: "Energy",
      val: n.energy_kj,
      unit: "kJ",
      val2: n.energy_kcal,
      unit2: "kcal",
      color: T.accent,
    },
    { label: "Protein", val: n.protein_g, unit: "g", color: "#1D4ED8" },
    { label: "Total Fat", val: n.fat_total_g, unit: "g", color: "#D97706" },
    {
      label: "  – Saturated",
      val: n.fat_saturated_g,
      unit: "g",
      indent: true,
      color: "#B45309",
    },
    {
      label: "  – Trans",
      val: n.fat_trans_g,
      unit: "g",
      indent: true,
      color: "#92400E",
    },
    {
      label: "Carbohydrates",
      val: n.carbohydrate_g,
      unit: "g",
      color: T.purple,
    },
    {
      label: "  – Sugars",
      val: n.sugars_g,
      unit: "g",
      indent: true,
      color: T.purpleText,
    },
    {
      label: "Dietary Fibre",
      val: n.dietary_fibre_g,
      unit: "g",
      color: "#065F46",
    },
    { label: "Sodium", val: n.sodium_mg, unit: "mg", color: "#991B1B" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 540,
        height: "100vh",
        background: C.surface,
        boxShadow: "-4px 0 32px rgba(0,0,0,0.12)", // Custom drawer shadow — negative horizontal offset, not in T.shadow.*
        zIndex: 1000,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 28px 20px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: T.gap.sm,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: T.text["2xl"],
                  background: cat.color + "18",
                  width: 40,
                  height: 40,
                  borderRadius: T.radius.md,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cat.icon}
              </span>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: T.text.xl,
                    fontWeight: T.weight.bold,
                    color: C.ink,
                  }}
                >
                  {ingredient.name}
                </h2>
                {ingredient.common_name && (
                  <div
                    style={{ fontSize: T.text.smPlus, color: C.inkLight, marginTop: 2 }}
                  >
                    also: {ingredient.common_name}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: T.gap.sm,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <span
                style={{
                  background: cat.color + "18",
                  color: cat.color,
                  border: `1px solid ${cat.color}30`,
                  borderRadius: T.radius.sm,
                  padding: "2px 8px",
                  fontSize: T.text.xs,
                  fontWeight: T.weight.semibold,
                }}
              >
                {cat.label}
              </span>
              <TempBadge zone={ingredient.temperature_zone} />
              <HaccpBadge level={ingredient.haccp_risk_level} />
              {ingredient.is_seeded && (
                <span
                  style={{
                    background: C.accentBg,
                    color: C.accent,
                    border: `1px solid ${C.accent}30`,
                    borderRadius: T.radius.sm,
                    padding: "2px 8px",
                    fontSize: T.text.xs,
                    fontWeight: T.weight.semibold,
                  }}
                >
                  📚 Platform Library
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: T.text["2xl"],
              cursor: "pointer",
              color: C.inkLight,
              lineHeight: 1,
              padding: T.pad.xs,
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 28px", flex: 1 }}>
        {/* Identifiers */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.bold,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Identifiers
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              ["Category", getCategory(ingredient.category).label],
              ["Sub-Category", ingredient.sub_category || "—"],
              ["Default Unit", ingredient.default_unit],
              [
                "Shelf Life",
                ingredient.shelf_life_days
                  ? `${ingredient.shelf_life_days} days`
                  : "No expiry",
              ],
              ["E-Number", ingredient.e_number || "—"],
              ["CAS Number", ingredient.cas_number || "—"],
              ["INCI Name", ingredient.inci_name || "—"],
              ["SA Permit Code", ingredient.sa_permit_code || "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  background: C.bg,
                  borderRadius: T.radius.smPlus,
                  padding: "8px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: T.text.xxs,
                    color: C.inkLight,
                    fontWeight: T.weight.semibold,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: T.text.smPlus,
                    color: C.ink,
                    marginTop: 2,
                    fontWeight: v === "—" ? 400 : 500,
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Allergens */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.bold,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Allergen Declaration (SA R638 + EU 1169/2011)
          </div>
          <div
            style={{
              background: allergenList.length > 0 ? C.amberBg : C.accentBg,
              border: `1px solid ${allergenList.length > 0 ? T.warningBd : C.accent + "30"}`,
              borderRadius: T.radius.md,
              padding: "12px 14px",
            }}
          >
            {allergenList.length > 0 ? (
              <>
                <div
                  style={{
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: "#92400E",
                    marginBottom: 8,
                  }}
                >
                  ⚠️ CONTAINS ALLERGENS:
                </div>
                <AllergenBadge flags={ingredient.allergen_flags} />
              </>
            ) : (
              <div style={{ fontSize: T.text.sm, color: C.accent, fontWeight: T.weight.semibold }}>
                ✅ No common allergens declared
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: T.text.xs, color: C.inkLight, marginBottom: 6 }}>
              All 14 R638 allergens:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: T.gap.xs }}>
              {ALLERGENS.map((a) => (
                <span
                  key={a.key}
                  style={{
                    background: ingredient.allergen_flags?.[a.key]
                      ? "#FEF3C7"
                      : C.bg,
                    color: ingredient.allergen_flags?.[a.key]
                      ? "#92400E"
                      : C.inkLight,
                    border: `1px solid ${ingredient.allergen_flags?.[a.key] ? T.warningBd : C.border}`,
                    borderRadius: T.radius.sm,
                    padding: "2px 7px",
                    fontSize: T.text.xs,
                    fontWeight: ingredient.allergen_flags?.[a.key] ? 700 : 400,
                  }}
                >
                  {a.icon} {a.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Nutritional data */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.bold,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Nutritional Values per 100g (DAFF)
          </div>
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: T.radius.md,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: C.ink,
                color: T.surface,
                padding: "8px 14px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: T.text.xs,
                fontWeight: T.weight.bold,
                letterSpacing: "0.05em",
              }}
            >
              <span>NUTRITIONAL INFORMATION</span>
              <span>Per 100g</span>
            </div>
            {macros.map((m) =>
              m.val === undefined ? null : (
                <div
                  key={m.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${m.indent ? 4 : 8}px 14px`,
                    borderTop: `1px solid ${C.border}`,
                    background: m.indent ? "#FAFAFA" : C.surface,
                  }}
                >
                  <span
                    style={{
                      fontSize: m.indent ? 11 : 13,
                      color: m.indent ? C.inkLight : C.ink,
                      fontWeight: m.indent ? 400 : 500,
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontSize: T.text.smPlus,
                      fontWeight: T.weight.bold,
                      color: m.color || C.ink,
                    }}
                  >
                    {m.val?.toFixed(1)}
                    {m.unit}
                    {m.val2 !== undefined && (
                      <span
                        style={{
                          fontSize: T.text.xs,
                          fontWeight: T.weight.normal,
                          color: C.inkLight,
                          marginLeft: 4,
                        }}
                      >
                        / {m.val2?.toFixed(0)}
                        {m.unit2}
                      </span>
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Storage & handling */}
        {(ingredient.storage_notes || ingredient.handling_notes) && (
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontSize: T.text.xs,
                fontWeight: T.weight.bold,
                color: C.inkLight,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Storage & Handling
            </div>
            {ingredient.storage_notes && (
              <div
                style={{
                  background: C.blueBg,
                  border: `1px solid ${C.blue}20`,
                  borderRadius: T.radius.md,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: T.text.xs,
                    fontWeight: T.weight.bold,
                    color: C.blue,
                    marginBottom: 4,
                  }}
                >
                  📦 Storage
                </div>
                <div style={{ fontSize: T.text.smPlus, color: C.inkMid }}>
                  {ingredient.storage_notes}
                </div>
              </div>
            )}
            {ingredient.handling_notes && (
              <div
                style={{
                  background: ingredient.handling_notes.includes("HACCP")
                    ? C.redBg
                    : C.amberBg,
                  border: `1px solid ${ingredient.handling_notes.includes("HACCP") ? T.dangerBd : T.warningBd}`,
                  borderRadius: T.radius.md,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: T.text.xs,
                    fontWeight: T.weight.bold,
                    color: ingredient.handling_notes.includes("HACCP")
                      ? C.red
                      : C.amber,
                    marginBottom: 4,
                  }}
                >
                  ⚠️ Handling
                </div>
                <div style={{ fontSize: T.text.smPlus, color: C.inkMid }}>
                  {ingredient.handling_notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regulatory */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.bold,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Regulatory
          </div>
          <div style={{ display: "flex", gap: T.gap.sm, flexWrap: "wrap" }}>
            {ingredient.requires_fsca_approval && (
              <span
                style={{
                  background: C.redBg,
                  color: C.red,
                  border: `1px solid ${T.dangerBd}`,
                  borderRadius: T.radius.sm,
                  padding: "3px 10px",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.bold,
                }}
              >
                🏛️ FSCA Approval Required
              </span>
            )}
            {ingredient.is_controlled && (
              <span
                style={{
                  background: "#FFF7ED",
                  color: "#C2410C",
                  border: "1px solid #FED7AA",
                  borderRadius: T.radius.sm,
                  padding: "3px 10px",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.bold,
                }}
              >
                🔒 Controlled Additive
              </span>
            )}
            {ingredient.fsca_category && (
              <span
                style={{
                  background: C.purpleBg,
                  color: C.purple,
                  border: `1px solid ${C.purple}30`,
                  borderRadius: T.radius.sm,
                  padding: "3px 10px",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.semibold,
                }}
              >
                {ingredient.fsca_category.replace(/_/g, " ")}
              </span>
            )}
            {!ingredient.requires_fsca_approval &&
              !ingredient.is_controlled && (
                <span
                  style={{
                    background: C.accentBg,
                    color: C.accent,
                    border: `1px solid ${C.accent}30`,
                    borderRadius: T.radius.sm,
                    padding: "3px 10px",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.semibold,
                  }}
                >
                  ✅ No special regulatory approval
                </span>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function HQFoodIngredients() {
  const { tenantId } = useTenant(); // RULE 0G — inside component

  const [activeTab, setActiveTab] = useState("library");
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterAllergen, setFilterAllergen] = useState("");
  const [filterHaccp, setFilterHaccp] = useState("");
  const [filterTemp, setFilterTemp] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [viewMode, setViewMode] = useState("tile"); // WP-TABLE-UNIFY 2A.1
  const [pillFilter, setPillFilter] = useState({ worldId: null, groupId: null, subId: null }); // WP-TABLE-UNIFY 2A.2
  const [toast, setToast] = useState(null);

  // New ingredient form
  const emptyForm = {
    name: "",
    common_name: "",
    category: "grain_cereal",
    sub_category: "",
    default_unit: "kg",
    temperature_zone: "ambient",
    shelf_life_days: "",
    haccp_risk_level: "low",
    storage_notes: "",
    handling_notes: "",
    requires_fsca_approval: false,
    is_controlled: false,
    allergen_flags: Object.fromEntries(ALLERGENS.map((a) => [a.key, false])),
    nutrition_per_100g: {
      energy_kj: "",
      energy_kcal: "",
      protein_g: "",
      fat_total_g: "",
      fat_saturated_g: "",
      fat_trans_g: "",
      carbohydrate_g: "",
      sugars_g: "",
      dietary_fibre_g: "",
      sodium_mg: "",
    },
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch or seed ────────────────────────────────────────────────────────
  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("food_ingredients")
        .select("*")
        .or("is_seeded.eq.true,tenant_id.eq." + tenantId)
        .order("category")
        .order("name");
      if (error) throw error;
      setIngredients(data || []);
      setSeeded((data || []).some((i) => i.is_seeded));
    } catch (err) {
      console.error("HQFoodIngredients fetch:", err);
      showToast("Failed to load ingredient library", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // ── Seed the library ──────────────────────────────────────────────────────
  async function handleSeedLibrary() {
    if (
      !window.confirm(
        "Seed the platform ingredient library?\n\n" +
          SEED_INGREDIENTS.length +
          " ingredients will be added with full nutritional data, allergen flags, and HACCP risk levels.\n\n" +
          "This only needs to be done once.",
      )
    )
      return;

    setSaving(true);
    setSeedProgress(0);
    try {
      const BATCH = 20;
      for (let i = 0; i < SEED_INGREDIENTS.length; i += BATCH) {
        const batch = SEED_INGREDIENTS.slice(i, i + BATCH).map((ing) => ({
          ...ing,
          is_seeded: true,
          tenant_id: tenantId, // RULE 0F — use HQ tenant for seed
        }));
        const { error } = await supabase
          .from("food_ingredients")
          .upsert(batch, { onConflict: "name,is_seeded" });
        if (error) throw error;
        setSeedProgress(
          Math.round(((i + BATCH) / SEED_INGREDIENTS.length) * 100),
        );
      }
      showToast(
        "✅ " + SEED_INGREDIENTS.length + " ingredients seeded successfully",
      );
      fetchIngredients();
    } catch (err) {
      console.error("Seed error:", err);
      showToast("Seed failed: " + err.message, "error");
    } finally {
      setSaving(false);
      setSeedProgress(0);
    }
  }

  // ── Save custom ingredient ─────────────────────────────────────────────────
  async function handleSaveIngredient() {
    if (!form.name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    if (!form.category) {
      showToast("Category is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tenant_id: tenantId, // RULE 0F
        is_seeded: false,
        shelf_life_days: form.shelf_life_days
          ? parseInt(form.shelf_life_days)
          : null,
        nutrition_per_100g: Object.fromEntries(
          Object.entries(form.nutrition_per_100g)
            .filter(([, v]) => v !== "" && v !== null)
            .map(([k, v]) => [k, parseFloat(v)]),
        ),
      };
      const { error } = await supabase.from("food_ingredients").insert(payload);
      if (error) throw error;
      showToast(form.name + " added to your library");
      setForm(emptyForm);
      setActiveTab("library");
      fetchIngredients();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Filtered ingredients ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = ingredients;
    // Smart-search: plain words + FNB tokens (allergen:x, zone:y, expiry<N, etc.)
    if (searchQ) list = list.filter((i) => matchesSmartSearch(i, searchQ));
    // Pill nav drill-down
    if (pillFilter.worldId)
      list = list.filter((i) =>
        pillMatches(i, pillFilter.worldId, pillFilter.groupId, pillFilter.subId),
      );
    // Legacy selects (kept live until PR 2A.4 cleanup)
    if (filterCat) list = list.filter((i) => i.category === filterCat);
    if (filterAllergen)
      list = list.filter((i) => i.allergen_flags?.[filterAllergen]);
    if (filterHaccp)
      list = list.filter((i) => i.haccp_risk_level === filterHaccp);
    if (filterTemp)
      list = list.filter((i) => i.temperature_zone === filterTemp);
    return list;
  }, [
    ingredients,
    searchQ,
    pillFilter,
    filterCat,
    filterAllergen,
    filterHaccp,
    filterTemp,
  ]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = ingredients.length;
    const allergenCount = ingredients.filter((i) =>
      Object.values(i.allergen_flags || {}).some(Boolean),
    ).length;
    const criticalHaccp = ingredients.filter(
      (i) => i.haccp_risk_level === "critical",
    ).length;
    const refrigerated = ingredients.filter(
      (i) => i.temperature_zone !== "ambient",
    ).length;
    const controlled = ingredients.filter(
      (i) => i.is_controlled || i.requires_fsca_approval,
    ).length;
    const categories = new Set(ingredients.map((i) => i.category)).size;
    return {
      total,
      allergenCount,
      criticalHaccp,
      refrigerated,
      controlled,
      categories,
    };
  }, [ingredients]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const TABS = [
    { id: "library", label: `Library (${filtered.length})` },
    { id: "add", label: "+ Add Ingredient" },
    {
      id: "compare",
      label: `Nutrition Compare${compareList.length > 0 ? " (" + compareList.length + ")" : ""}`,
    },
    { id: "regulatory", label: "Regulatory Register" },
  ];

  const sBase = { fontFamily: "Inter, sans-serif", color: C.ink };

  return (
    <div style={sBase}>
      {/* WorkflowGuide MUST be first */}
      <WorkflowGuide tabId="hq-food-ingredients" />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "error" ? C.redBg : "#F0FDF4",
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
            color: toast.type === "error" ? C.red : "#166534",
            padding: "12px 20px",
            borderRadius: T.radius.md,
            fontWeight: T.weight.medium,
            fontSize: T.text.base,
            boxShadow: T.shadow.lg,
            maxWidth: 400,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: T.gap.md,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontWeight: T.weight.extrabold,
                fontSize: 24, // Hero page title — distinct from T.text scale, visual hierarchy
                letterSpacing: "-0.02em",
              }}
            >
              🍃 Ingredient Encyclopedia
              <InfoTooltip
                title="Claude G5 Food & Beverage Ingredient Library"
                body="A world-class ingredient reference database. 200+ pre-seeded SA ingredients with full nutritional data (DAFF), 14-allergen R638 flags, HACCP risk levels, and regulatory status. Foundation of the recipe engine, HACCP system, and nutritional label generator."
              />
            </h2>
            <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: T.text.base }}>
              {kpis.total} ingredients · {kpis.categories} categories · SA R638
              compliant
            </p>
          </div>
          {!seeded && !loading && (
            <button
              onClick={handleSeedLibrary}
              disabled={saving}
              style={{
                padding: "10px 20px",
                background: C.accent,
                color: T.surface,
                border: "none",
                borderRadius: T.radius.md,
                cursor: "pointer",
                fontWeight: T.weight.bold,
                fontSize: T.text.base,
                fontFamily: "inherit",
                boxShadow: "0 2px 8px rgba(45,106,79,0.3)", // Custom accent-tinted shadow, not in T.shadow.*
              }}
            >
              {saving
                ? `Seeding… ${seedProgress}%`
                : "🌱 Seed Platform Library"}
            </button>
          )}
        </div>
      </div>

      {/* KPI strip — WP-TABLE-UNIFY 2A.2 */}
      <FoodKPIStrip items={ingredients} />

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: T.gap.xs,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "9px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: T.text.base,
              fontFamily: "inherit",
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? C.accent : C.inkLight,
              borderBottom:
                activeTab === tab.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60, // Empty-state hero padding — intentional, larger than any T.pad value
            color: C.inkLight,
            fontSize: T.text.base,
          }}
        >
          Loading ingredient library…
        </div>
      )}

      {/* ── LIBRARY TAB ──────────────────────────────────────────────────── */}
      {!loading && activeTab === "library" && (
        <div>
          {/* Pill nav — WP-TABLE-UNIFY 2A.2 */}
          <div style={{ marginBottom: T.gap.md }}>
            <FoodPillNav
              worldId={pillFilter.worldId}
              groupId={pillFilter.groupId}
              subId={pillFilter.subId}
              onChange={setPillFilter}
            />
          </div>

          {/* Filters row — smart search replaces plain input; selects retained */}
          <div
            style={{
              display: "flex",
              gap: T.gap.sm,
              flexWrap: "wrap",
              marginBottom: 18,
              alignItems: "center",
            }}
          >
            <FoodSmartSearch value={searchQ} onChange={setSearchQ} />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: T.radius.smPlus,
                fontSize: T.text.smPlus,
                fontFamily: "inherit",
                background: C.surface,
                flex: 1,
                minWidth: 160,
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
            <select
              value={filterAllergen}
              onChange={(e) => setFilterAllergen(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: T.radius.smPlus,
                fontSize: T.text.smPlus,
                fontFamily: "inherit",
                background: C.surface,
                flex: 1,
                minWidth: 140,
              }}
            >
              <option value="">All Allergens</option>
              {ALLERGENS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.icon} Contains {a.label}
                </option>
              ))}
            </select>
            <select
              value={filterHaccp}
              onChange={(e) => setFilterHaccp(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: T.radius.smPlus,
                fontSize: T.text.smPlus,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All HACCP</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical CCP</option>
            </select>
            <select
              value={filterTemp}
              onChange={(e) => setFilterTemp(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: T.radius.smPlus,
                fontSize: T.text.smPlus,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All Temperatures</option>
              <option value="ambient">☀️ Ambient</option>
              <option value="refrigerated">❄️ Refrigerated</option>
              <option value="frozen">🧊 Frozen</option>
            </select>
            {(searchQ ||
              filterCat ||
              filterAllergen ||
              filterHaccp ||
              filterTemp ||
              pillFilter.worldId) && (
              <button
                onClick={() => {
                  setSearchQ("");
                  setFilterCat("");
                  setFilterAllergen("");
                  setFilterHaccp("");
                  setFilterTemp("");
                  setPillFilter({ worldId: null, groupId: null, subId: null });
                }}
                style={{
                  padding: "8px 12px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: T.radius.smPlus,
                  cursor: "pointer",
                  fontSize: T.text.smPlus,
                  fontFamily: "inherit",
                  color: C.inkMid,
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* No results */}
          {filtered.length === 0 && !seeded && (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: T.radius.mdPlus,
                padding: "32px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
              <div
                style={{
                  fontSize: T.text.lg,
                  fontWeight: T.weight.bold,
                  color: C.accent,
                  marginBottom: 8,
                }}
              >
                Library not yet seeded
              </div>
              <div style={{ fontSize: T.text.base, color: C.inkMid, marginBottom: 20 }}>
                Click "Seed Platform Library" to load {SEED_INGREDIENTS.length}+
                ingredients with full nutritional data, allergen flags, and
                HACCP risk levels.
              </div>
              <button
                onClick={handleSeedLibrary}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: C.accent,
                  color: T.surface,
                  border: "none",
                  borderRadius: T.radius.md,
                  cursor: "pointer",
                  fontWeight: T.weight.bold,
                  fontSize: T.text.base,
                  fontFamily: "inherit",
                }}
              >
                {saving ? `Seeding… ${seedProgress}%` : "🌱 Seed Now"}
              </button>
            </div>
          )}

          {/* View toggle + ingredient grid — PR 2A.1 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: T.gap.md }}>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === "tile" ? (
            <FoodTileView
              items={filtered}
              compareList={compareList}
              onSelect={setSelectedIngredient}
              HaccpBadge={HaccpBadge}
            />
          ) : (
            <FoodListView
              items={filtered}
              compareList={compareList}
              onSelect={setSelectedIngredient}
              getCategory={getCategory}
              getAllergenList={getAllergenList}
              AllergenBadge={AllergenBadge}
              HaccpBadge={HaccpBadge}
              TempBadge={TempBadge}
            />
          )}
        </div>
      )}

      {/* ── ADD INGREDIENT TAB ────────────────────────────────────────────── */}
      {!loading && activeTab === "add" && (
        <div style={{ maxWidth: 780 }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: T.radius.mdPlus,
              padding: 28, // Custom card inset, between T.pad.xl (24) and T.pad.xxl
            }}
          >
            <h3 style={{ margin: "0 0 24px", fontSize: T.text.lg, fontWeight: T.weight.bold }}>
              Add Custom Ingredient
            </h3>

            {/* Basic info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: T.gap.lg,
                marginBottom: 20,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Ingredient Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Baobab Powder (Raw)"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Common Name / Alias
                </label>
                <input
                  value={form.common_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, common_name: e.target.value }))
                  }
                  placeholder="e.g. Monkey Bread Powder"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Default Unit
                </label>
                <select
                  value={form.default_unit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, default_unit: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                >
                  {["kg", "g", "L", "ml", "pcs", "ea", "por"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Temperature Zone
                </label>
                <select
                  value={form.temperature_zone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, temperature_zone: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                >
                  <option value="ambient">☀️ Ambient</option>
                  <option value="refrigerated">❄️ Refrigerated (2–8°C)</option>
                  <option value="frozen">🧊 Frozen (-18°C)</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Shelf Life (days)
                </label>
                <input
                  type="number"
                  value={form.shelf_life_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shelf_life_days: e.target.value }))
                  }
                  placeholder="e.g. 365 (leave blank if no expiry)"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.base,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                />
              </div>
            </div>

            {/* HACCP */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.bold,
                  color: C.inkLight,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                HACCP Risk Level{" "}
                <InfoTooltip
                  title="HACCP Risk"
                  body="Critical = requires mandatory monitoring log per batch. High = enhanced vigilance. Medium = standard monitoring. Low = no special HACCP requirements."
                />
              </label>
              <div style={{ display: "flex", gap: T.gap.sm }}>
                {Object.entries(HACCP_COLORS).map(([k, s]) => (
                  <button
                    key={k}
                    onClick={() =>
                      setForm((f) => ({ ...f, haccp_risk_level: k }))
                    }
                    style={{
                      padding: "7px 14px",
                      background: form.haccp_risk_level === k ? s.color : C.bg,
                      color: form.haccp_risk_level === k ? T.surface : s.color,
                      border: `2px solid ${s.color}`,
                      borderRadius: T.radius.smPlus,
                      cursor: "pointer",
                      fontSize: T.text.sm,
                      fontWeight: T.weight.bold,
                      fontFamily: "inherit",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.bold,
                  color: C.inkLight,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Allergen Flags (SA R638 + EU 1169/2011)
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: T.gap.sm }}>
                {ALLERGENS.map((a) => {
                  const on = form.allergen_flags[a.key];
                  return (
                    <button
                      key={a.key}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          allergen_flags: { ...f.allergen_flags, [a.key]: !on },
                        }))
                      }
                      style={{
                        padding: "6px 12px",
                        background: on ? C.amberBg : C.bg,
                        color: on ? C.amber : C.inkLight,
                        border: `2px solid ${on ? T.warningBd : C.border}`,
                        borderRadius: T.radius.smPlus,
                        cursor: "pointer",
                        fontSize: T.text.sm,
                        fontWeight: on ? 700 : 400,
                        fontFamily: "inherit",
                      }}
                    >
                      {a.icon} {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nutrition per 100g */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: T.text.sm,
                  fontWeight: T.weight.bold,
                  color: C.inkLight,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Nutritional Values per 100g (optional but recommended)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: T.gap.sm,
                }}
              >
                {[
                  ["energy_kj", "Energy (kJ)"],
                  ["energy_kcal", "Energy (kcal)"],
                  ["protein_g", "Protein (g)"],
                  ["fat_total_g", "Total Fat (g)"],
                  ["fat_saturated_g", "Sat Fat (g)"],
                  ["fat_trans_g", "Trans Fat (g)"],
                  ["carbohydrate_g", "Carbs (g)"],
                  ["sugars_g", "Sugars (g)"],
                  ["dietary_fibre_g", "Fibre (g)"],
                  ["sodium_mg", "Sodium (mg)"],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label
                      style={{
                        display: "block",
                        fontSize: T.text.xxs,
                        color: C.inkLight,
                        fontWeight: T.weight.semibold,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.nutrition_per_100g[k] || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          nutrition_per_100g: {
                            ...f.nutrition_per_100g,
                            [k]: e.target.value,
                          },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "7px 8px",
                        border: `1px solid ${C.border}`,
                        borderRadius: T.radius.smPlus,
                        fontSize: T.text.sm,
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        background: C.surface,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Storage notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: T.gap.lg,
                marginBottom: 24,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Storage Notes
                </label>
                <textarea
                  value={form.storage_notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, storage_notes: e.target.value }))
                  }
                  placeholder="e.g. Store in cool, dry place. Protect from moisture."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.smPlus,
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: T.text.sm,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Handling & Safety Notes
                </label>
                <textarea
                  value={form.handling_notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, handling_notes: e.target.value }))
                  }
                  placeholder="e.g. HACCP CCP: Temperature must not exceed 8°C."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    fontSize: T.text.smPlus,
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: C.surface,
                  }}
                />
              </div>
            </div>

            {/* Regulatory toggles — gap: 20 intentional (between T.gap.lg=16 and T.gap.xl=24) */}
            <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: T.gap.sm,
                  cursor: "pointer",
                  fontSize: T.text.smPlus,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.requires_fsca_approval}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      requires_fsca_approval: e.target.checked,
                    }))
                  }
                />
                Requires FSCA Approval
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: T.gap.sm,
                  cursor: "pointer",
                  fontSize: T.text.smPlus,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_controlled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_controlled: e.target.checked }))
                  }
                />
                Controlled Additive (Schedule)
              </label>
            </div>

            {/* Actions */}
            <div
              style={{ display: "flex", gap: T.gap.md, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setForm(emptyForm)}
                style={{
                  padding: "10px 20px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: T.radius.smPlus,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: T.text.base,
                  color: C.inkMid,
                }}
              >
                Clear
              </button>
              <button
                onClick={handleSaveIngredient}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? C.border : C.accent,
                  color: T.surface,
                  border: "none",
                  borderRadius: T.radius.smPlus,
                  cursor: "pointer",
                  fontWeight: T.weight.bold,
                  fontSize: T.text.base,
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : "Add to Library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NUTRITION COMPARE TAB ────────────────────────────────────────── */}
      {!loading && activeTab === "compare" && (
        <div>
          {compareList.length === 0 ? (
            <div
              style={{
                background: C.blueBg,
                border: `1px solid ${C.blue}20`,
                borderRadius: T.radius.mdPlus,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
              <div
                style={{
                  fontSize: T.text.md,
                  fontWeight: T.weight.bold,
                  color: C.blue,
                  marginBottom: 8,
                }}
              >
                No ingredients selected for comparison
              </div>
              <div style={{ fontSize: T.text.smPlus, color: C.inkMid }}>
                Go to the Library tab and click "+ Compare" on up to 5
                ingredients.
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: T.text.base, fontWeight: T.weight.semibold, color: C.inkMid }}>
                  Comparing {compareList.length} ingredient
                  {compareList.length !== 1 ? "s" : ""} per 100g
                </div>
                <button
                  onClick={() => setCompareList([])}
                  style={{
                    padding: "7px 14px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.smPlus,
                    cursor: "pointer",
                    fontSize: T.text.smPlus,
                    fontFamily: "inherit",
                    color: C.inkMid,
                  }}
                >
                  Clear all
                </button>
              </div>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: T.radius.mdPlus,
                  overflow: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: T.text.sm,
                          color: C.inkLight,
                          fontWeight: T.weight.bold,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        Nutrient (per 100g)
                      </th>
                      {compareList.map((ing) => (
                        <th
                          key={ing.id}
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontSize: T.text.sm,
                            fontWeight: T.weight.bold,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <div style={{ color: C.ink }}>{ing.name}</div>
                          <button
                            onClick={() =>
                              setCompareList(
                                compareList.filter((c) => c.id !== ing.id),
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: C.inkLight,
                              cursor: "pointer",
                              fontSize: T.text.sm,
                              fontFamily: "inherit",
                              marginTop: 4,
                            }}
                          >
                            Remove ×
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["energy_kj", "Energy", "kJ"],
                      ["energy_kcal", "Energy", "kcal"],
                      ["protein_g", "Protein", "g"],
                      ["fat_total_g", "Total Fat", "g"],
                      ["fat_saturated_g", "Saturated Fat", "g"],
                      ["carbohydrate_g", "Carbohydrates", "g"],
                      ["sugars_g", "Sugars", "g"],
                      ["dietary_fibre_g", "Dietary Fibre", "g"],
                      ["sodium_mg", "Sodium", "mg"],
                    ].map(([key, label, unit], idx) => {
                      const vals = compareList.map(
                        (ing) => ing.nutrition_per_100g?.[key],
                      );
                      const maxVal = Math.max(...vals.filter((v) => v != null));
                      return (
                        <tr
                          key={key}
                          style={{
                            borderTop: `1px solid ${C.border}`,
                            background: idx % 2 === 0 ? C.surface : "#FCFCFB",
                          }}
                        >
                          <td
                            style={{
                              padding: "11px 16px",
                              fontSize: T.text.smPlus,
                              color: C.inkMid,
                              fontWeight: T.weight.medium,
                            }}
                          >
                            {label} ({unit})
                          </td>
                          {compareList.map((ing) => {
                            const val = ing.nutrition_per_100g?.[key];
                            const isMax =
                              val != null && val === maxVal && maxVal > 0;
                            return (
                              <td
                                key={ing.id}
                                style={{
                                  padding: "11px 14px",
                                  textAlign: "right",
                                  fontSize: T.text.smPlus,
                                  fontWeight: isMax ? 800 : 500,
                                  color: isMax ? C.accent : C.ink,
                                }}
                              >
                                {val != null
                                  ? `${typeof val === "number" ? val.toFixed(1) : val}${unit}`
                                  : "—"}
                                {isMax && (
                                  <span
                                    style={{
                                      fontSize: T.text.xxs,
                                      marginLeft: 4,
                                      color: C.accent,
                                    }}
                                  >
                                    ▲
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Allergens row */}
                    <tr
                      style={{
                        borderTop: `2px solid ${C.border}`,
                        background: C.amberBg,
                      }}
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: T.text.smPlus,
                          fontWeight: T.weight.bold,
                          color: C.amber,
                        }}
                      >
                        ⚠️ Allergens
                      </td>
                      {compareList.map((ing) => (
                        <td
                          key={ing.id}
                          style={{ padding: "11px 14px", textAlign: "right" }}
                        >
                          <AllergenBadge flags={ing.allergen_flags} compact />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REGULATORY REGISTER TAB ──────────────────────────────────────── */}
      {!loading && activeTab === "regulatory" && (
        <div>
          {/* Controlled additives */}
          <div style={{ marginBottom: 28 }}>
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: T.text.md,
                fontWeight: T.weight.bold,
                color: C.red,
              }}
            >
              🔒 Controlled Additives — Require FSCA Approval or Special
              Handling
            </h3>
            {(() => {
              const controlled = ingredients.filter(
                (i) => i.requires_fsca_approval || i.is_controlled,
              );
              if (controlled.length === 0)
                return (
                  <div style={{ color: C.inkLight, fontSize: T.text.base }}>
                    None in your library.
                  </div>
                );
              return (
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.mdPlus,
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.redBg }}>
                        {[
                          "Ingredient",
                          "E-Number",
                          "CAS Number",
                          "Status",
                          "HACCP",
                          "Notes",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "9px 14px",
                              textAlign: "left",
                              fontSize: T.text.xs,
                              color: C.red,
                              fontWeight: T.weight.bold,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {controlled.map((ing, idx) => (
                        <tr
                          key={ing.id}
                          style={{
                            borderTop: `1px solid ${C.border}`,
                            background: idx % 2 === 0 ? C.surface : "#FCFCFB",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedIngredient(ing)}
                        >
                          <td
                            style={{
                              padding: "10px 14px",
                              fontSize: T.text.smPlus,
                              fontWeight: T.weight.semibold,
                            }}
                          >
                            {ing.name}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontSize: T.text.sm,
                              fontFamily: "monospace",
                              color: C.inkMid,
                            }}
                          >
                            {ing.e_number || "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontSize: T.text.sm,
                              fontFamily: "monospace",
                              color: C.inkLight,
                            }}
                          >
                            {ing.cas_number || "—"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: T.gap.sm,
                                flexWrap: "wrap",
                              }}
                            >
                              {ing.requires_fsca_approval && (
                                <span
                                  style={{
                                    background: C.redBg,
                                    color: C.red,
                                    border: "1px solid #FECACA",
                                    borderRadius: T.radius.sm,
                                    padding: "2px 7px",
                                    fontSize: T.text.xxs,
                                    fontWeight: T.weight.bold,
                                  }}
                                >
                                  FSCA
                                </span>
                              )}
                              {ing.is_controlled && (
                                <span
                                  style={{
                                    background: "#FFF7ED",
                                    color: "#C2410C",
                                    border: "1px solid #FED7AA",
                                    borderRadius: T.radius.sm,
                                    padding: "2px 7px",
                                    fontSize: T.text.xxs,
                                    fontWeight: T.weight.bold,
                                  }}
                                >
                                  CONTROLLED
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <HaccpBadge level={ing.haccp_risk_level} />
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontSize: T.text.xs,
                              color: C.inkLight,
                              maxWidth: 200,
                            }}
                          >
                            {ing.handling_notes
                              ? ing.handling_notes.substring(0, 80) +
                                (ing.handling_notes.length > 80 ? "…" : "")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* High allergen risk */}
          <div style={{ marginBottom: 28 }}>
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: T.text.md,
                fontWeight: T.weight.bold,
                color: C.amber,
              }}
            >
              ⚠️ Allergen-Containing Ingredients — R638 Declaration Required
            </h3>
            {(() => {
              const flagged = ingredients.filter(
                (i) => getAllergenList(i.allergen_flags).length > 0,
              );
              if (flagged.length === 0)
                return (
                  <div style={{ color: C.inkLight, fontSize: T.text.base }}>
                    None in your library.
                  </div>
                );
              return (
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: T.radius.mdPlus,
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.amberBg }}>
                        {[
                          "Ingredient",
                          "Category",
                          "Allergens Present",
                          "Cross-Contam Risk",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "9px 14px",
                              textAlign: "left",
                              fontSize: T.text.xs,
                              color: C.amber,
                              fontWeight: T.weight.bold,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flagged.map((ing, idx) => {
                        const cat = getCategory(ing.category);
                        const allergenList = getAllergenList(
                          ing.allergen_flags,
                        );
                        return (
                          <tr
                            key={ing.id}
                            style={{
                              borderTop: `1px solid ${C.border}`,
                              background: idx % 2 === 0 ? C.surface : "#FCFCFB",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedIngredient(ing)}
                          >
                            <td
                              style={{
                                padding: "10px 14px",
                                fontSize: T.text.smPlus,
                                fontWeight: T.weight.semibold,
                              }}
                            >
                              {ing.name}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                style={{
                                  background: cat.color + "15",
                                  color: cat.color,
                                  borderRadius: T.radius.sm,
                                  padding: "2px 7px",
                                  fontSize: T.text.xs,
                                  fontWeight: T.weight.semibold,
                                }}
                              >
                                {cat.icon} {cat.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <AllergenBadge
                                flags={ing.allergen_flags}
                                compact
                              />
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                fontSize: T.text.xs,
                                color: C.inkMid,
                              }}
                            >
                              {ing.handling_notes
                                ? ing.handling_notes.substring(0, 60) + "…"
                                : allergenList.length > 1
                                  ? "Multi-allergen — dedicated cleaning required"
                                  : "Standard allergen protocols apply"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Ingredient detail drawer */}
      {selectedIngredient && (
        <>
          <div
            onClick={() => setSelectedIngredient(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)", // Modal backdrop scrim, not in T.overlay (add post-demo)
              zIndex: 999,
            }}
          />
          <IngredientDrawer
            ingredient={selectedIngredient}
            onClose={() => setSelectedIngredient(null)}
          />
        </>
      )}
    </div>
  );
}
