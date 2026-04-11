// src/components/group/_helpers/industryBadge.js
// WP-ANALYTICS-1 Step 2 — shared industry_profile → badge map
//
// Extracted from NetworkDashboard.js so every group portal analytics
// surface (NetworkDashboard, StoreComparison, future CombinedPL) shows
// the same badges for the same industry profile. Before extraction this
// constant was duplicated, which is how drift starts.
//
// Maps tenants.industry_profile → { bg, fg, label } using WP-DS-6
// semantic tokens. Dispensary uses T.info (clinical blue) per WP-DS-3;
// no new tokens required.

import { T } from "../../../styles/tokens";

export const INDUSTRY_BADGE = {
  cannabis_retail: {
    bg: T.accentLight,
    fg: T.accentText,
    label: "Cannabis Retail",
  },
  cannabis_dispensary: {
    bg: T.infoLight,
    fg: T.infoText,
    label: "Medical Dispensary",
  },
  food_beverage: {
    bg: T.warningLight,
    fg: T.warningText,
    label: "Food & Beverage",
  },
  general_retail: {
    bg: T.neutralLight,
    fg: T.neutralText,
    label: "General Retail",
  },
};
