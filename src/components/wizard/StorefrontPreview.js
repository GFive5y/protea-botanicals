// src/components/wizard/StorefrontPreview.js
// WP-STOREFRONT-WIZARD Phase 1 — live preview right pane.
// Renders a simplified consumer shop frame that updates reactively
// from the wizardData prop. Uses --wz-brand for accent colour.

import { useMemo } from "react";

const PLACEHOLDER_PRODUCTS = [
  "Product One",
  "Product Two",
  "Product Three",
  "Product Four",
];

function getInitials(name) {
  if (!name) return "VV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function StorefrontPreview({ wizardData }) {
  const name = wizardData?.name?.trim() || "Your Business";
  const tagline =
    wizardData?.tagline?.trim() || "Welcome to your new storefront";
  const eyebrow = wizardData?.eyebrow?.trim() || "Now Open";
  const logoUrl = wizardData?.logoUrl || null;
  const slug = wizardData?.slug || "your-store";

  const initials = useMemo(() => getInitials(name), [name]);

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

        <div className="wz-preview-hero">
          <div className="wz-preview-hero-eyebrow">{eyebrow}</div>
          <h2 className="wz-preview-hero-title">{tagline}</h2>
        </div>

        <div className="wz-preview-grid">
          {PLACEHOLDER_PRODUCTS.map((label) => (
            <div className="wz-preview-card" key={label}>
              <div className="wz-preview-card-img" />
              <div className="wz-preview-card-body">
                <div className="wz-preview-card-title">{label}</div>
                <div className="wz-preview-card-price">R 0.00</div>
              </div>
            </div>
          ))}
        </div>

        <div className="wz-preview-loyalty">
          <div className="wz-preview-loyalty-badge" aria-hidden="true">
            ★
          </div>
          <div className="wz-preview-loyalty-text">
            Earn points with every purchase
          </div>
        </div>
      </div>
    </div>
  );
}
