// src/components/wizard/StorefrontPreview.js
// WP-STOREFRONT-WIZARD Phase 2 — live preview right pane.
// Receives wizardData and reacts to brandColor (for prop fallback),
// terminologyProfile, template, and products.

import { useMemo } from "react";

const PLACEHOLDER_PRODUCTS = [
  { name: "Product One", price: 0 },
  { name: "Product Two", price: 0 },
  { name: "Product Three", price: 0 },
  { name: "Product Four", price: 0 },
];

// Terminology labels per industry profile.
// Used as the second/third/fourth subline on each product card.
const TERMINOLOGY_LABELS = {
  general_retail:  "Variant · Size · Format",
  nicotine_vape:   "Nicotine strength · Flavour · Format",
  food_beverage:   "Allergens · Weight · Portion size",
  cannabis_retail: "Strain type · THC · CBD",
};

function getInitials(name) {
  if (!name) return "VV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPrice(p) {
  const n = Number(p) || 0;
  return `R ${n.toFixed(2)}`;
}

export default function StorefrontPreview({ wizardData }) {
  const name = wizardData?.name?.trim() || "Your Business";
  const tagline =
    wizardData?.tagline?.trim() || "Welcome to your new storefront";
  const eyebrow = wizardData?.eyebrow?.trim() || "Now Open";
  const logoUrl = wizardData?.logoUrl || null;
  const slug = wizardData?.slug || "your-store";
  const template = wizardData?.template || "minimal";
  const terminologyProfile =
    wizardData?.terminologyProfile || "general_retail";

  // Real products if present, otherwise placeholders.
  const products = useMemo(() => {
    const list = wizardData?.products;
    if (Array.isArray(list) && list.length > 0) {
      return list.slice(0, 4).map((p) => ({
        name: p.name || "Product",
        price: p.price ?? p.sell_price ?? 0,
      }));
    }
    return PLACEHOLDER_PRODUCTS;
  }, [wizardData?.products]);

  const initials = useMemo(() => getInitials(name), [name]);
  const facetLabel =
    TERMINOLOGY_LABELS[terminologyProfile] || TERMINOLOGY_LABELS.general_retail;

  // Layout variants — driven by template choice.
  const showLargeHero = template === "bold";
  const isEditorial = template === "editorial";
  const gridColumns = template === "minimal" ? 1 : 2;

  return (
    <div className="wz-preview-frame" aria-label="Live storefront preview">
      <div className="wz-preview-chrome">
        <span className="wz-preview-dot r" />
        <span className="wz-preview-dot y" />
        <span className="wz-preview-dot g" />
        <div className="wz-preview-url">nuai.app/{slug}</div>
      </div>

      <div className="wz-preview-body">
        <div className="wz-preview-header">
          <div className="wz-preview-logo" aria-hidden="true">
            {logoUrl ? <img src={logoUrl} alt="" /> : initials}
          </div>
          <div className="wz-preview-name">{name}</div>
        </div>

        <nav className="wz-preview-nav" aria-hidden="true">
          <span className="wz-preview-nav-item is-active">Home</span>
          <span className="wz-preview-nav-item">Shop</span>
          <span className="wz-preview-nav-item">Loyalty</span>
          <span className="wz-preview-nav-item">Account</span>
        </nav>

        <div
          className="wz-preview-hero"
          style={{
            padding: showLargeHero
              ? "var(--wz-space-7) var(--wz-space-4)"
              : isEditorial
              ? "var(--wz-space-5) var(--wz-space-4)"
              : "var(--wz-space-5) var(--wz-space-4)",
            textAlign: isEditorial ? "left" : "left",
          }}
        >
          <div className="wz-preview-hero-eyebrow">{eyebrow}</div>
          <h2
            className="wz-preview-hero-title"
            style={{
              fontSize: showLargeHero ? "28px" : isEditorial ? "24px" : "22px",
              maxWidth: isEditorial ? "30ch" : undefined,
            }}
          >
            {tagline}
          </h2>
          {isEditorial && (
            <p
              style={{
                marginTop: "var(--wz-space-2)",
                fontSize: "13px",
                color: "var(--wz-text-secondary)",
                maxWidth: "40ch",
              }}
            >
              A considered selection. Hand-picked. Quietly brilliant.
            </p>
          )}
        </div>

        <div
          className="wz-preview-grid"
          style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
        >
          {products.map((p, i) => (
            <div className="wz-preview-card" key={`${p.name}-${i}`}>
              <div className="wz-preview-card-img" />
              <div className="wz-preview-card-body">
                <div className="wz-preview-card-title">{p.name}</div>
                <div className="wz-preview-card-price">
                  {formatPrice(p.price)}
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                    color: "var(--wz-text-tertiary)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {facetLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="wz-preview-loyalty">
          <div className="wz-preview-loyalty-badge" aria-hidden="true">
            ★
          </div>
          <div className="wz-preview-loyalty-text">
            {wizardData?.loyaltyWelcomePoints
              ? `Earn ${wizardData.loyaltyWelcomePoints} points on your first scan`
              : "Earn points with every purchase"}
          </div>
        </div>
      </div>
    </div>
  );
}
