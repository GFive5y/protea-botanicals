// src/pages/OnboardingWizard.js
// WP-STOREFRONT-WIZARD Phase 2
// Route: /onboarding (auth-gated, post-login only)
//
// Phase 2 adds: route guard, back navigation, slug uniqueness check
// (with stub-tenant creation), dynamic --wz-brand injection, and
// Steps 2–5 (brand colour, industry, template, first products).
// Steps 6–7 remain placeholders for later phases.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import StorefrontPreview from "../components/wizard/StorefrontPreview";
import "../styles/wizard.css";

// ─── Step config ──────────────────────────────────────────────────────
const STEPS = [
  { id: "brand-name",  title: "Brand identity",   subtitle: "Tell us about your business" },
  { id: "brand-color", title: "Choose your brand colour", subtitle: "Pick a primary that reflects you" },
  { id: "industry",    title: "What do you sell?", subtitle: "We'll tune the storefront language" },
  { id: "template",    title: "Storefront layout", subtitle: "Pick a starting design" },
  { id: "products",    title: "First products",    subtitle: "Add a few items, or seed demo data" },
  { id: "domain",      title: "Domain",            subtitle: "Pick your storefront URL" },
  { id: "review",      title: "Review & launch",   subtitle: "Go live in one click" },
];

const MIN_NAME = 2;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/svg+xml", "image/png", "image/jpeg"];
const MAX_USER_PRODUCTS = 5;
const DEFAULT_BRAND = "#2D5BE3";

// 8 preset swatches (Vozel blue first as default)
const COLOR_PRESETS = [
  "#2D5BE3", // Vozel blue
  "#1D9E75", // teal
  "#E24B4A", // coral red
  "#EF9F27", // amber
  "#534AB7", // purple
  "#1A1A18", // near black
  "#D85A30", // burnt orange
  "#0F6E56", // forest green
];

// Industry tiles (UI labelling — note nicotine_vape maps to general_retail in DB)
const INDUSTRY_TILES = [
  {
    id: "general_retail",
    dbProfile: "general_retail",
    title: "General retail",
    desc: "Standard products & SKUs",
    example: "Variant · Size · Format",
  },
  {
    id: "nicotine_vape",
    dbProfile: "general_retail", // UI label only — DB stays general_retail
    title: "Vape & nicotine",
    desc: "E-liquids, devices, pods",
    example: "Strength · Flavour · Format",
  },
  {
    id: "food_beverage",
    dbProfile: "food_beverage",
    title: "Food & beverage",
    desc: "Ingredients, allergens, recipes",
    example: "Allergens · Weight · Portion",
  },
  {
    id: "cannabis_retail",
    dbProfile: "cannabis_retail",
    title: "Cannabis retail",
    desc: "Strains, THC/CBD, compliance",
    example: "Strain · THC · CBD",
  },
];

// Template options (Phase 2 records the choice — Phase 3 swaps real templates)
const TEMPLATE_OPTIONS = [
  {
    id: "minimal",
    title: "Minimal",
    desc: "Single column, lots of whitespace",
  },
  {
    id: "bold",
    title: "Bold",
    desc: "Large hero image, 2-column grid",
  },
  {
    id: "editorial",
    title: "Editorial",
    desc: "Text-forward, left-aligned hero",
  },
];

// Demo seed products for general_retail / nicotine_vape skip path
const DEMO_SEED_GENERAL = [
  { sku: "DEMO-001", name: "Sample E-liquid 30ml",     price: 199, category: "finished_product" },
  { sku: "DEMO-002", name: "Sample Device Kit",        price: 449, category: "hardware" },
  { sku: "DEMO-003", name: "Sample E-liquid 60ml",     price: 169, category: "finished_product" },
  { sku: "DEMO-004", name: "Sample Replacement Pods",  price:  89, category: "accessory" },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isValidHex(s) {
  return /^#[0-9A-Fa-f]{6}$/.test(s || "");
}

// Inject the active brand colour into the .wz-root CSS variable so all
// color-mix() derivatives cascade automatically.
function applyBrandColor(color) {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".wz-root");
  if (root) root.style.setProperty("--wz-brand", color);
}

// ─── Component ────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  // ── Auth gate (Gap 3) ──────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Wizard state ───────────────────────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState({
    tenantId: null,
    name: "",
    slug: "",
    logoFile: null,
    logoUrl: null,
    tagline: "",
    eyebrow: "",
    brandColor: DEFAULT_BRAND,
    industryTileId: null,
    industryProfile: null, // DB value
    terminologyProfile: "general_retail",
    template: null,
    products: [], // [{name, price}, ...] used for preview + Step 5 list
    existingProducts: [], // products already in inventory_items for this tenant
    isResuming: false,
  });

  // Step 1 form
  const [logoError, setLogoError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [slugSuggestions, setSlugSuggestions] = useState([]);

  // Step 2 form
  const [hexInput, setHexInput] = useState(DEFAULT_BRAND);
  const [hexError, setHexError] = useState(null);

  // Step 5 form
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  // Saving / step transition state
  const [savingStep, setSavingStep] = useState(false);
  const [stepError, setStepError] = useState(null);

  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const logoUrlRef = useRef(null);

  // Autofocus name on mount
  useEffect(() => {
    if (stepIndex === 0 && nameInputRef.current && authChecked && session) {
      nameInputRef.current.focus();
    }
  }, [stepIndex, authChecked, session]);

  // Object URL cleanup
  useEffect(() => {
    return () => {
      if (logoUrlRef.current) {
        URL.revokeObjectURL(logoUrlRef.current);
        logoUrlRef.current = null;
      }
    };
  }, []);

  // Re-apply brand colour any time it changes in state (covers back/forward)
  useEffect(() => {
    if (wizardData.brandColor) applyBrandColor(wizardData.brandColor);
  }, [wizardData.brandColor]);

  // ── Step 1 handlers ────────────────────────────────────────────────
  const handleNameChange = useCallback((e) => {
    const next = e.target.value;
    setSlugError(null);
    setSlugSuggestions([]);
    setWizardData((prev) => ({
      ...prev,
      name: next,
      slug: slugify(next),
    }));
  }, []);

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
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    const url = URL.createObjectURL(file);
    logoUrlRef.current = url;
    setWizardData((prev) => ({ ...prev, logoFile: file, logoUrl: url }));
  }, []);

  const handleFilePick = useCallback(
    (e) => acceptLogoFile(e.target.files?.[0]),
    [acceptLogoFile],
  );
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      acceptLogoFile(e.dataTransfer?.files?.[0]);
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

  // Pick a suggested name (from outcome C chips)
  const pickSuggestion = useCallback((suggestedName) => {
    setSlugError(null);
    setSlugSuggestions([]);
    setWizardData((prev) => ({
      ...prev,
      name: suggestedName,
      slug: slugify(suggestedName),
    }));
    nameInputRef.current?.focus();
  }, []);

  // Step 1 Continue: slug uniqueness check + create/load tenant
  const handleStep1Continue = useCallback(async () => {
    const name = wizardData.name.trim();
    if (name.length < MIN_NAME) return;
    const derivedSlug = slugify(name);
    if (!derivedSlug) {
      setSlugError("Please use letters, numbers, or spaces in your name.");
      return;
    }

    setSlugChecking(true);
    setSlugError(null);
    setSlugSuggestions([]);

    try {
      const { data: existing, error: qErr } = await supabase
        .from("tenants")
        .select("id, name, slug, branding_config, industry_profile")
        .eq("slug", derivedSlug)
        .maybeSingle();

      if (qErr) throw qErr;

      // ── Outcome A: no match → create stub tenant ────────────────
      if (!existing) {
        const { data: created, error: insErr } = await supabase
          .from("tenants")
          .insert({
            name,
            slug: derivedSlug,
            is_active: false,
            branding_config: { wizard_complete: false, primary_color: DEFAULT_BRAND },
          })
          .select("id, branding_config, industry_profile")
          .single();
        if (insErr) throw insErr;

        setWizardData((prev) => ({
          ...prev,
          tenantId: created.id,
          isResuming: false,
          existingProducts: [],
          brandColor: DEFAULT_BRAND,
        }));
        applyBrandColor(DEFAULT_BRAND);
        setStepIndex(1);
        return;
      }

      const cfg = existing.branding_config || {};
      const isComplete = cfg.wizard_complete === true;

      // ── Outcome C: match + complete → reject ────────────────────
      if (isComplete) {
        setSlugError("That shop URL is already taken.");
        setSlugSuggestions([`${name} SA`, `${name} JHB`]);
        return;
      }

      // ── Outcome B: match + incomplete → resume ──────────────────
      // Load existing products for Step 5 path branching.
      const { data: invRows } = await supabase
        .from("inventory_items")
        .select("id, name, sell_price, sku")
        .eq("tenant_id", existing.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      const loadedBrand = isValidHex(cfg.primary_color)
        ? cfg.primary_color
        : DEFAULT_BRAND;

      // Map existing industry_profile to a UI tile id (best guess).
      const tileFromDb =
        INDUSTRY_TILES.find((t) => t.dbProfile === existing.industry_profile)
          ?.id || null;

      setWizardData((prev) => ({
        ...prev,
        tenantId: existing.id,
        name: existing.name || name,
        slug: existing.slug || derivedSlug,
        brandColor: loadedBrand,
        template: cfg.template || prev.template,
        industryProfile: existing.industry_profile || null,
        industryTileId: tileFromDb,
        terminologyProfile: existing.industry_profile || "general_retail",
        existingProducts: invRows || [],
        products: (invRows || []).map((r) => ({
          name: r.name,
          price: r.sell_price,
        })),
        isResuming: true,
      }));
      setHexInput(loadedBrand);
      applyBrandColor(loadedBrand);
      setStepIndex(1);
    } catch (e) {
      setSlugError(e.message || "Could not check that shop URL. Try again.");
    } finally {
      setSlugChecking(false);
    }
  }, [wizardData.name]);

  // ── Step 2 handlers ────────────────────────────────────────────────
  const pickPreset = useCallback((color) => {
    setHexError(null);
    setHexInput(color);
    setWizardData((prev) => ({ ...prev, brandColor: color }));
    applyBrandColor(color);
  }, []);

  const handleHexChange = useCallback((e) => {
    const next = e.target.value.toUpperCase();
    setHexInput(next);
    if (isValidHex(next)) {
      setHexError(null);
      setWizardData((prev) => ({ ...prev, brandColor: next }));
      applyBrandColor(next);
    } else if (next.length >= 7) {
      setHexError("Use a 6-digit hex like #2D5BE3");
    }
  }, []);

  const handleStep2Continue = useCallback(async () => {
    if (!isValidHex(wizardData.brandColor)) {
      setHexError("Pick a valid colour first");
      return;
    }
    if (!wizardData.tenantId) {
      setStepError("Tenant context lost. Go back to Step 1.");
      return;
    }
    setSavingStep(true);
    setStepError(null);
    try {
      // Read current branding_config so we don't clobber other keys.
      const { data: t } = await supabase
        .from("tenants")
        .select("branding_config")
        .eq("id", wizardData.tenantId)
        .single();
      const merged = {
        ...(t?.branding_config || {}),
        primary_color: wizardData.brandColor,
        wizard_complete: false,
      };
      const { error: uErr } = await supabase
        .from("tenants")
        .update({ branding_config: merged })
        .eq("id", wizardData.tenantId);
      if (uErr) throw uErr;
      setStepIndex(2);
    } catch (e) {
      setStepError(e.message || "Could not save brand colour.");
    } finally {
      setSavingStep(false);
    }
  }, [wizardData.brandColor, wizardData.tenantId]);

  // ── Step 3 handlers ────────────────────────────────────────────────
  const pickIndustry = useCallback((tile) => {
    setWizardData((prev) => ({
      ...prev,
      industryTileId: tile.id,
      industryProfile: tile.dbProfile,
      // terminology uses the UI tile id so nicotine_vape gets vape labels
      terminologyProfile: tile.id,
    }));
  }, []);

  const handleStep3Continue = useCallback(async () => {
    if (!wizardData.industryTileId) return;
    if (!wizardData.tenantId) {
      setStepError("Tenant context lost. Go back to Step 1.");
      return;
    }
    setSavingStep(true);
    setStepError(null);
    try {
      const { error: uErr } = await supabase
        .from("tenants")
        .update({ industry_profile: wizardData.industryProfile })
        .eq("id", wizardData.tenantId);
      if (uErr) throw uErr;
      setStepIndex(3);
    } catch (e) {
      setStepError(e.message || "Could not save industry.");
    } finally {
      setSavingStep(false);
    }
  }, [
    wizardData.industryTileId,
    wizardData.industryProfile,
    wizardData.tenantId,
  ]);

  // ── Step 4 handlers ────────────────────────────────────────────────
  const pickTemplate = useCallback((id) => {
    setWizardData((prev) => ({ ...prev, template: id }));
  }, []);

  const handleStep4Continue = useCallback(async () => {
    if (!wizardData.template) return;
    if (!wizardData.tenantId) {
      setStepError("Tenant context lost. Go back to Step 1.");
      return;
    }
    setSavingStep(true);
    setStepError(null);
    try {
      const { data: t } = await supabase
        .from("tenants")
        .select("branding_config")
        .eq("id", wizardData.tenantId)
        .single();
      const merged = {
        ...(t?.branding_config || {}),
        template: wizardData.template,
      };
      const { error: uErr } = await supabase
        .from("tenants")
        .update({ branding_config: merged })
        .eq("id", wizardData.tenantId);
      if (uErr) throw uErr;
      setStepIndex(4);
    } catch (e) {
      setStepError(e.message || "Could not save template.");
    } finally {
      setSavingStep(false);
    }
  }, [wizardData.template, wizardData.tenantId]);

  // ── Step 5 handlers ────────────────────────────────────────────────
  const addLocalProduct = useCallback(() => {
    const name = newProductName.trim();
    const priceNum = parseFloat(newProductPrice);
    if (!name) return;
    if (!Number.isFinite(priceNum) || priceNum < 0) return;
    setWizardData((prev) => {
      if ((prev.products?.length || 0) >= MAX_USER_PRODUCTS) return prev;
      return {
        ...prev,
        products: [...(prev.products || []), { name, price: priceNum }],
      };
    });
    setNewProductName("");
    setNewProductPrice("");
  }, [newProductName, newProductPrice]);

  const removeLocalProduct = useCallback((idx) => {
    setWizardData((prev) => ({
      ...prev,
      products: (prev.products || []).filter((_, i) => i !== idx),
    }));
  }, []);

  const handleStep5Continue = useCallback(async () => {
    if (!wizardData.tenantId) {
      setStepError("Tenant context lost. Go back to Step 1.");
      return;
    }
    setSavingStep(true);
    setStepError(null);
    try {
      // If existing products are in the DB (Vozel Vapes path), nothing to write.
      if (wizardData.existingProducts.length === 0) {
        const toInsert = (wizardData.products || []).map((p) => ({
          tenant_id: wizardData.tenantId,
          name: p.name,
          sell_price: p.price,
          category: "finished_product",
          is_active: true,
        }));
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from("inventory_items")
            .insert(toInsert);
          if (insErr) throw insErr;
        }
      }
      setStepIndex(5);
    } catch (e) {
      setStepError(e.message || "Could not save products.");
    } finally {
      setSavingStep(false);
    }
  }, [wizardData.tenantId, wizardData.existingProducts, wizardData.products]);

  const handleStep5Skip = useCallback(async () => {
    if (!wizardData.tenantId) return;
    setSavingStep(true);
    setStepError(null);
    try {
      // Only seed if no existing products (otherwise skip is meaningless).
      if (wizardData.existingProducts.length === 0) {
        const toInsert = DEMO_SEED_GENERAL.map((p) => ({
          tenant_id: wizardData.tenantId,
          name: p.name,
          sell_price: p.price,
          category: p.category,
          sku: p.sku,
          tags: ["demo", "seed"],
          is_active: true,
        }));
        const { error: insErr } = await supabase
          .from("inventory_items")
          .insert(toInsert);
        if (insErr) throw insErr;

        // Reflect seed in preview state for the next steps.
        setWizardData((prev) => ({
          ...prev,
          products: DEMO_SEED_GENERAL.map((p) => ({
            name: p.name,
            price: p.price,
          })),
        }));
      }
      setStepIndex(5);
    } catch (e) {
      setStepError(e.message || "Could not seed demo products.");
    } finally {
      setSavingStep(false);
    }
  }, [wizardData.tenantId, wizardData.existingProducts]);

  // ── Back navigation ────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setStepError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // ── Derived ────────────────────────────────────────────────────────
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;
  const currentStep = STEPS[stepIndex];
  const isStep1Valid = wizardData.name.trim().length >= MIN_NAME;
  const canStep5Continue =
    wizardData.existingProducts.length > 0 ||
    (wizardData.products || []).length > 0;

  const productAddDisabled =
    !newProductName.trim() ||
    !Number.isFinite(parseFloat(newProductPrice)) ||
    (wizardData.products?.length || 0) >= MAX_USER_PRODUCTS;

  // Memoised preview-facing slice — keeps StorefrontPreview reference stable.
  const previewData = useMemo(
    () => ({
      name: wizardData.name,
      slug: wizardData.slug,
      logoUrl: wizardData.logoUrl,
      tagline: wizardData.tagline,
      eyebrow: wizardData.eyebrow,
      brandColor: wizardData.brandColor,
      template: wizardData.template,
      terminologyProfile: wizardData.terminologyProfile,
      products: wizardData.products,
    }),
    [wizardData],
  );

  // ── Auth-gate render ───────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="wz-root">
        <div className="wz-fullscreen">Loading…</div>
      </div>
    );
  }
  if (!session) {
    // Codebase convention: /account?return=... — see App.js RequireAuth.
    return <Navigate to="/account?return=/onboarding" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="wz-root">
      <div className="wz-shell">
        {/* ── LEFT: form pane ─────────────────────────────────────── */}
        <section className="wz-pane-form" aria-label="Onboarding form">
          {stepIndex > 0 && (
            <button type="button" className="wz-back" onClick={goBack}>
              ← Back
            </button>
          )}

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
            <p
              className="wz-body"
              style={{ color: "var(--wz-text-secondary)" }}
            >
              {currentStep.subtitle}
            </p>
          </header>

          {/* ── STEP 1: Brand identity ─────────────────────────── */}
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
                  disabled={slugChecking}
                />
                {slugError && (
                  <div className="wz-error-text" role="alert">
                    {slugError}
                  </div>
                )}
                {slugSuggestions.length > 0 && (
                  <div className="wz-suggest">
                    {slugSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="wz-suggest-chip"
                        onClick={() => pickSuggestion(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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
                  <div className="wz-dropzone-hint">
                    SVG, PNG, JPG · 2MB max
                  </div>
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
                onClick={handleStep1Continue}
                disabled={!isStep1Valid || slugChecking}
              >
                {slugChecking ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Checking…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          )}

          {/* ── STEP 2: Brand colour ───────────────────────────── */}
          {stepIndex === 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div>
                <label className="wz-label">Pick a preset</label>
                <div className="wz-color-grid">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`wz-color-swatch${
                        wizardData.brandColor.toUpperCase() === c.toUpperCase()
                          ? " is-selected"
                          : ""
                      }`}
                      style={{ background: c }}
                      onClick={() => pickPreset(c)}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="wz-label" htmlFor="wz-hex">
                  Or enter a custom hex
                </label>
                <div className="wz-hex-row">
                  <input
                    id="wz-hex"
                    className="wz-hex-input"
                    type="text"
                    value={hexInput}
                    onChange={handleHexChange}
                    placeholder="#2D5BE3"
                    spellCheck="false"
                    maxLength={7}
                  />
                  <div
                    className="wz-hex-preview"
                    style={{
                      background: isValidHex(hexInput) ? hexInput : "#ECEAE3",
                    }}
                    aria-hidden="true"
                  />
                </div>
                {hexError && (
                  <div className="wz-error-text" role="alert">
                    {hexError}
                  </div>
                )}
              </div>

              {stepError && (
                <div className="wz-error-text" role="alert">
                  {stepError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleStep2Continue}
                disabled={savingStep || !isValidHex(wizardData.brandColor)}
              >
                {savingStep ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          )}

          {/* ── STEP 3: Industry ───────────────────────────────── */}
          {stepIndex === 2 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div className="wz-tile-grid">
                {INDUSTRY_TILES.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    className={`wz-tile${
                      wizardData.industryTileId === tile.id ? " is-selected" : ""
                    }`}
                    onClick={() => pickIndustry(tile)}
                  >
                    <div className="wz-tile-title">{tile.title}</div>
                    <div className="wz-tile-desc">{tile.desc}</div>
                    <div className="wz-tile-example">{tile.example}</div>
                  </button>
                ))}
              </div>

              {stepError && (
                <div className="wz-error-text" role="alert">
                  {stepError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleStep3Continue}
                disabled={savingStep || !wizardData.industryTileId}
              >
                {savingStep ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          )}

          {/* ── STEP 4: Template ───────────────────────────────── */}
          {stepIndex === 3 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div className="wz-template-grid">
                {TEMPLATE_OPTIONS.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`wz-template-card${
                      wizardData.template === tpl.id ? " is-selected" : ""
                    }`}
                    onClick={() => pickTemplate(tpl.id)}
                  >
                    {/* Mini visual layout — drawn with CSS boxes */}
                    {tpl.id === "minimal" && (
                      <div className="wz-template-mock">
                        <div className="bar brand short" />
                        <div className="bar med" />
                        <div className="hero" style={{ height: 18 }} />
                        <div className="col" />
                      </div>
                    )}
                    {tpl.id === "bold" && (
                      <div className="wz-template-mock">
                        <div className="hero-tall" />
                        <div className="row">
                          <div className="col" />
                          <div className="col" />
                        </div>
                      </div>
                    )}
                    {tpl.id === "editorial" && (
                      <div className="wz-template-mock">
                        <div className="row">
                          <div
                            className="stack"
                            style={{ flex: 1, justifyContent: "center" }}
                          >
                            <div className="bar short" />
                            <div className="bar med" />
                            <div className="bar short" />
                          </div>
                          <div className="col" style={{ flex: 1.4 }} />
                        </div>
                      </div>
                    )}
                    <div className="wz-template-card-title">{tpl.title}</div>
                    <div className="wz-template-card-desc">{tpl.desc}</div>
                  </button>
                ))}
              </div>

              {stepError && (
                <div className="wz-error-text" role="alert">
                  {stepError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleStep4Continue}
                disabled={savingStep || !wizardData.template}
              >
                {savingStep ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          )}

          {/* ── STEP 5: First products ─────────────────────────── */}
          {stepIndex === 4 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              {wizardData.existingProducts.length > 0 ? (
                // ── Vozel Vapes path: read-only existing products ──
                <>
                  <div className="wz-help-text">
                    We found {wizardData.existingProducts.length} item
                    {wizardData.existingProducts.length === 1 ? "" : "s"} in
                    your catalogue. Add more in your dashboard.
                  </div>
                  <div className="wz-product-list">
                    {wizardData.existingProducts.map((p) => (
                      <div key={p.id} className="wz-product-row">
                        {p.sku && (
                          <span className="wz-product-row-sku">{p.sku}</span>
                        )}
                        <span className="wz-product-row-name">{p.name}</span>
                        <span className="wz-product-row-price">
                          R {Number(p.sell_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                // ── New tenant path: add form + skip ───────────────
                <>
                  <div className="wz-help-text">
                    Add up to {MAX_USER_PRODUCTS} starter products. You can edit
                    or add more from the dashboard later.
                  </div>

                  {(wizardData.products || []).length > 0 && (
                    <div className="wz-product-list">
                      {wizardData.products.map((p, i) => (
                        <div key={`${p.name}-${i}`} className="wz-product-row">
                          <span className="wz-product-row-name">{p.name}</span>
                          <span className="wz-product-row-price">
                            R {Number(p.price || 0).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            className="wz-product-row-remove"
                            onClick={() => removeLocalProduct(i)}
                            aria-label={`Remove ${p.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="wz-product-add">
                    <div>
                      <label className="wz-label" htmlFor="wz-prod-name">
                        Product name
                      </label>
                      <input
                        id="wz-prod-name"
                        className="wz-input"
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="e.g. Cloud9 Nic Salt"
                        maxLength={80}
                      />
                    </div>
                    <div>
                      <label className="wz-label" htmlFor="wz-prod-price">
                        Price (R)
                      </label>
                      <input
                        id="wz-prod-price"
                        className="wz-input"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        placeholder="220"
                      />
                    </div>
                    <button
                      type="button"
                      className="wz-add-btn"
                      onClick={addLocalProduct}
                      disabled={productAddDisabled}
                    >
                      + Add
                    </button>
                  </div>

                  <button
                    type="button"
                    className="wz-skip-link"
                    onClick={handleStep5Skip}
                    disabled={savingStep}
                  >
                    Skip — add products later
                  </button>
                </>
              )}

              {stepError && (
                <div className="wz-error-text" role="alert">
                  {stepError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleStep5Continue}
                disabled={savingStep || !canStep5Continue}
              >
                {savingStep ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          )}

          {/* ── STEPS 6–7: placeholders ────────────────────────── */}
          {stepIndex > 4 && (
            <div className="wz-placeholder">
              <div
                className="wz-heading"
                style={{ marginBottom: "var(--wz-space-2)" }}
              >
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
          <StorefrontPreview wizardData={previewData} />
        </section>
      </div>
    </div>
  );
}
