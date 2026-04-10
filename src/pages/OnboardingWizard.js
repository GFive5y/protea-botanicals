// src/pages/OnboardingWizard.js
// WP-STOREFRONT-WIZARD Phase 1
// Route: /onboarding
// 7-step shell — Step 1 fully built, Steps 2–7 placeholder panels.
// Two-column 50/50 desktop, mobile collapses preview to bottom strip.

import { useCallback, useEffect, useRef, useState } from "react";
import StorefrontPreview from "../components/wizard/StorefrontPreview";
import "../styles/wizard.css";

const STEPS = [
  { id: "brand", title: "Brand identity", subtitle: "Tell us about your business" },
  { id: "products", title: "Products", subtitle: "Add your first items" },
  { id: "loyalty", title: "Loyalty programme", subtitle: "Reward your customers" },
  { id: "payments", title: "Payments", subtitle: "Connect your payout account" },
  { id: "tax", title: "Tax & compliance", subtitle: "VAT and business details" },
  { id: "domain", title: "Domain", subtitle: "Pick your storefront URL" },
  { id: "review", title: "Review & launch", subtitle: "Go live in one click" },
];

const MIN_NAME = 2;
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_LOGO_TYPES = ["image/svg+xml", "image/png", "image/jpeg"];

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState({
    name: "",
    slug: "",
    logoFile: null,
    logoUrl: null,
    tagline: "",
    eyebrow: "",
  });
  const [logoError, setLogoError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const logoUrlRef = useRef(null);

  // Autofocus name on mount
  useEffect(() => {
    if (stepIndex === 0 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [stepIndex]);

  // Revoke object URL on unmount or replace
  useEffect(() => {
    return () => {
      if (logoUrlRef.current) {
        URL.revokeObjectURL(logoUrlRef.current);
        logoUrlRef.current = null;
      }
    };
  }, []);

  const handleNameChange = useCallback(
    (e) => {
      const next = e.target.value;
      setWizardData((prev) => ({
        ...prev,
        name: next,
        slug: slugify(next),
      }));
    },
    [],
  );

  const acceptLogoFile = useCallback((file) => {
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Logo must be SVG, PNG, or JPG");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 2MB or smaller");
      return;
    }
    setLogoError(null);
    if (logoUrlRef.current) {
      URL.revokeObjectURL(logoUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    logoUrlRef.current = url;
    setWizardData((prev) => ({ ...prev, logoFile: file, logoUrl: url }));
  }, []);

  const handleFilePick = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      acceptLogoFile(file);
    },
    [acceptLogoFile],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      acceptLogoFile(file);
    },
    [acceptLogoFile],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const clearLogo = useCallback(() => {
    if (logoUrlRef.current) {
      URL.revokeObjectURL(logoUrlRef.current);
      logoUrlRef.current = null;
    }
    setLogoError(null);
    setWizardData((prev) => ({ ...prev, logoFile: null, logoUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isStep1Valid = wizardData.name.trim().length >= MIN_NAME;

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;
  const currentStep = STEPS[stepIndex];

  return (
    <div className="wz-root">
      <div className="wz-shell">
        {/* ── LEFT: form pane ─────────────────────────────────────── */}
        <section className="wz-pane-form" aria-label="Onboarding form">
          <div
            className="wz-progress"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="Onboarding progress"
          >
            <div
              className="wz-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <header className="wz-step-header">
            <h1 className="wz-display">{currentStep.title}</h1>
            <p className="wz-body" style={{ color: "var(--wz-text-secondary)" }}>
              {currentStep.subtitle}
            </p>
          </header>

          {stepIndex === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div>
                <label className="wz-label" htmlFor="wz-name">
                  What's your business name?
                </label>
                <input
                  ref={nameInputRef}
                  id="wz-name"
                  className="wz-input"
                  type="text"
                  value={wizardData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Vozel Vapes"
                  autoComplete="organization"
                  spellCheck="false"
                  maxLength={64}
                />
              </div>

              <div>
                <label className="wz-label">Logo</label>
                <div
                  className={`wz-dropzone${isDragOver ? " is-dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload logo"
                >
                  <div className="wz-dropzone-text">
                    Drop your logo here, or click to browse
                  </div>
                  <div className="wz-dropzone-hint">SVG, PNG, JPG · 2MB max</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                    onChange={handleFilePick}
                    style={{ display: "none" }}
                  />
                </div>
                {logoError && (
                  <div className="wz-dropzone-error" role="alert">
                    {logoError}
                  </div>
                )}
                {wizardData.logoUrl && (
                  <div className="wz-logo-thumb">
                    <img src={wizardData.logoUrl} alt="" />
                    <span className="wz-logo-thumb-name">
                      {wizardData.logoFile?.name || "logo"}
                    </span>
                    <button
                      type="button"
                      className="wz-logo-thumb-clear"
                      onClick={clearLogo}
                      aria-label="Remove logo"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="wz-cta"
                onClick={goNext}
                disabled={!isStep1Valid}
              >
                Continue →
              </button>
            </div>
          )}

          {stepIndex > 0 && (
            <div className="wz-placeholder">
              <div className="wz-heading" style={{ marginBottom: "var(--wz-space-2)" }}>
                Step {stepIndex + 1}: {currentStep.title}
              </div>
              <p className="wz-caption" style={{ margin: "0 auto" }}>
                This step lands in a later phase of WP-STOREFRONT-WIZARD.
              </p>
            </div>
          )}
        </section>

        {/* ── RIGHT: live preview pane ────────────────────────────── */}
        <section className="wz-pane-preview" aria-label="Live preview">
          <StorefrontPreview wizardData={wizardData} />
        </section>
      </div>
    </div>
  );
}

