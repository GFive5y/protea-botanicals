// src/constants/industryProfiles.js
// WP-IND: Industry profile definitions — drives UI adaptation across the platform
// Read this before touching any component that shows cannabis-specific fields.

export const INDUSTRY_PROFILES = {
  cannabis_retail: {
    label: "Cannabis Retail",
    icon: "🌿",
    description:
      "Cannabis shop — vape, flower, edibles, concentrates, lifestyle products",
    showCannabisFields: "format_driven",
    showMedicalFields: false,
    requiresCOA: false,
    requiresBatchExpiry: true,
    showStrains: "format_driven",
    showQRAuth: true,
    docDigestion: ["supplier_invoice", "coa"],
    inventoryCategories: "all",
    complianceLevel: "standard",
  },
  cannabis_dispensary: {
    label: "Cannabis Dispensary",
    icon: "⚕️",
    description:
      "Licensed medical cannabis dispensary — full SAHPRA track & trace",
    showCannabisFields: "always",
    showMedicalFields: true,
    requiresCOA: true,
    requiresBatchExpiry: true,
    showStrains: "always",
    showQRAuth: true,
    docDigestion: ["supplier_invoice", "coa", "section_21"],
    inventoryCategories: "all",
    complianceLevel: "medical",
  },
  general_retail: {
    label: "General Retail",
    icon: "🛍️",
    description:
      "Any non-cannabis retailer — clothing, accessories, supplements",
    showCannabisFields: "never",
    showMedicalFields: false,
    requiresCOA: false,
    requiresBatchExpiry: false,
    showStrains: "never",
    showQRAuth: false,
    docDigestion: ["supplier_invoice"],
    inventoryCategories: "non_cannabis",
    complianceLevel: "none",
  },
  food_beverage: {
    label: "Food & Beverage",
    icon: "☕",
    description: "Cafes, juice bars, beverage brands, food producers",
    showCannabisFields: "never",
    showMedicalFields: false,
    requiresCOA: false,
    requiresBatchExpiry: true,
    showStrains: "never",
    showQRAuth: false,
    docDigestion: ["supplier_invoice", "food_safety"],
    inventoryCategories: "non_cannabis",
    complianceLevel: "food",
  },
  mixed_retail: {
    label: "Mixed Retail",
    icon: "🏪",
    description:
      "Cannabis + general products — coffee, clothing, snacks alongside vape",
    showCannabisFields: "format_driven",
    showMedicalFields: false,
    requiresCOA: false,
    requiresBatchExpiry: false,
    showStrains: "format_driven",
    showQRAuth: "format_driven",
    docDigestion: ["supplier_invoice", "coa"],
    inventoryCategories: "all",
    complianceLevel: "standard",
  },
};

/**
 * Should a cannabis-specific field be shown for this tenant + product combination?
 *
 * @param {string} profile - tenant's industry_profile from useTenant()
 * @param {boolean} isCannabisFormat - whether the selected product format has is_cannabis=true
 * @returns {boolean}
 *
 * Usage:
 *   const { industryProfile } = useTenant();
 *   if (showCannabisField(industryProfile, fmt.is_cannabis)) { ... }
 */
export function showCannabisField(profile, isCannabisFormat) {
  const rule =
    INDUSTRY_PROFILES[profile]?.showCannabisFields ?? "format_driven";
  if (rule === "always") return true;
  if (rule === "never") return false;
  return isCannabisFormat === true; // "format_driven"
}

/**
 * Should medical-specific fields be shown for this tenant?
 * Requires BOTH profile=cannabis_dispensary AND feature_medical=true
 */
export function showMedicalField(profile, featureMedical) {
  return (
    INDUSTRY_PROFILES[profile]?.showMedicalFields === true &&
    featureMedical === true
  );
}

/**
 * Non-cannabis inventory categories — used to filter category dropdowns
 * for profiles that never show cannabis products
 */
export const NON_CANNABIS_CATEGORIES = [
  "finished_product",
  "raw_material",
  "packaging",
  "accessory",
  "service",
  "medical_consumable",
];

export const CANNABIS_ONLY_CATEGORIES = ["terpene", "concentrate", "flower"];
