// src/pages/OnboardingWizard.js
// WP-STOREFRONT-WIZARD Phase 3
// Route: /onboarding (auth-gated, post-login only)
//
// Phase 3 adds:
//   - Slug-check outcome D (already-launched → block re-running)
//   - isResuming banner from Step 2 onwards
//   - Step 6: loyalty preset cards (upserts loyalty_config)
//   - Step 7: launch flow (logo upload → sign-qr → wizard_complete)
//             with success state (live URL + QR + downloads)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";
import StorefrontPreview from "../components/wizard/StorefrontPreview";
import "../styles/wizard.css";

// APP_URL is the canonical production base — never localhost in DB writes
// or QR payloads. Hardcoded per Phase 3 spec.
const APP_URL = "https://nuai-gfive5ys-projects.vercel.app";

// ─── Step config ──────────────────────────────────────────────────────
const STEPS = [
  { id: "brand-name",  title: "Brand identity",            subtitle: "Tell us about your business" },
  { id: "brand-color", title: "Choose your brand colour",  subtitle: "Pick a primary that reflects you" },
  { id: "industry",    title: "What do you sell?",         subtitle: "We'll tune the storefront language" },
  { id: "template",    title: "Storefront layout",         subtitle: "Pick a starting design" },
  { id: "products",    title: "First products",            subtitle: "Add a few items, or seed demo data" },
  { id: "loyalty",     title: "Loyalty programme",         subtitle: "Reward your customers" },
  { id: "launch",      title: "Ready to launch",           subtitle: "One click and you're live" },
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

// Loyalty presets — Step 6.
// Per spec: pts_per_r100_online + retail, threshold_silver/gold, pts_qr_scan.
// Other loyalty_config columns are intentionally untouched.
const LOYALTY_PRESETS = [
  {
    id: "starter",
    title: "Starter",
    welcome: 50,
    rules: "10 pts per R100 · Silver at 500 pts",
    payload: {
      pts_per_r100_online: 10,
      pts_per_r100_retail: 10,
      threshold_silver: 500,
      threshold_gold: 1500,
      pts_qr_scan: 50,
    },
  },
  {
    id: "standard",
    title: "Standard",
    welcome: 100,
    rules: "10 pts per R100 · Silver at 500 · Gold at 1500",
    payload: {
      pts_per_r100_online: 10,
      pts_per_r100_retail: 10,
      threshold_silver: 500,
      threshold_gold: 1500,
      pts_qr_scan: 100,
    },
  },
  {
    id: "generous",
    title: "Generous",
    welcome: 200,
    rules: "15 pts per R100 · Silver at 300 · Gold at 1000",
    payload: {
      pts_per_r100_online: 15,
      pts_per_r100_retail: 15,
      threshold_silver: 300,
      threshold_gold: 1000,
      pts_qr_scan: 200,
    },
  },
];
const DEFAULT_LOYALTY = "standard";

// Generate a random promo-style code as a fallback if sign-qr declines
// the welcome payload. Mirrors AdminQRCodes' genPromoCode shape.
function genWelcomeCode(slug) {
  const safe = (slug || "shop").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WELCOME-${safe}-${rand}`;
}

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
    logoUrl: null,            // local object URL OR uploaded public URL
    logoUploadedUrl: null,    // post-upload public URL (Phase 3)
    tagline: "",
    eyebrow: "",
    brandColor: DEFAULT_BRAND,
    industryTileId: null,
    industryProfile: null, // DB value
    terminologyProfile: "general_retail",
    template: null,
    products: [], // [{name, price}, ...] used for preview + Step 5 list
    existingProducts: [], // products already in inventory_items for this tenant
    loyaltyPresetId: DEFAULT_LOYALTY,
    loyaltyWelcomePoints:
      LOYALTY_PRESETS.find((p) => p.id === DEFAULT_LOYALTY)?.welcome || 100,
    qrCode: null,             // bare welcome QR code returned by sign-qr / fallback
    launchedUrl: null,        // public live URL after launch
    isResuming: false,
  });

  // Phase 3 — already-launched state (slug-check outcome D) + banner dismiss
  const [alreadyLaunched, setAlreadyLaunched] = useState(false);
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);

  // Step 7 — sequential launch progress
  // Each entry: 'pending' | 'active' | 'done'
  const [launchProgress, setLaunchProgress] = useState({
    save: "pending",
    qr: "pending",
    live: "pending",
  });
  const [launchError, setLaunchError] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Hidden QR ref for PNG download (mirrors AdminQRCodes pattern).
  const qrSvgRef = useRef(null);

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

      // Is the current user a member of this tenant? user_profiles.tenant_id
      // is the canonical link in this codebase (no created_by on tenants).
      let isOwnTenant = false;
      if (session?.user?.id) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("tenant_id")
          .eq("id", session.user.id)
          .maybeSingle();
        isOwnTenant = prof?.tenant_id === existing.id;
      }

      // ── Outcome D (Phase 3): already-launched → block re-running ──
      // Slug matches a tenant the current user belongs to AND it has
      // wizard_complete: true → route to the launched-state screen.
      if (isComplete && isOwnTenant) {
        setAlreadyLaunched(true);
        setWizardData((prev) => ({
          ...prev,
          tenantId: existing.id,
          name: existing.name || name,
          slug: existing.slug || derivedSlug,
        }));
        return;
      }

      // ── Outcome C: match + complete (someone else's) → reject ────
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

      // Resume the exact tile the user originally picked. terminology_profile
      // is written to branding_config on Step 3 — that is the source of truth.
      // Fallback to industry_profile (DB column) only if the JSON field is absent.
      const restoredTile =
        cfg.terminology_profile ||
        existing.industry_profile ||
        "general_retail";

      setWizardData((prev) => ({
        ...prev,
        tenantId: existing.id,
        name: existing.name || name,
        slug: existing.slug || derivedSlug,
        brandColor: loadedBrand,
        template: cfg.template || prev.template,
        industryProfile: existing.industry_profile || null,
        industryTileId: restoredTile,
        terminologyProfile: restoredTile,
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
  }, [wizardData.name, session]);

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
      // Read branding_config so we can merge terminology_profile without
      // clobbering keys written by other steps (primary_color, template, etc).
      const { data: t } = await supabase
        .from("tenants")
        .select("branding_config")
        .eq("id", wizardData.tenantId)
        .single();
      const merged = {
        ...(t?.branding_config || {}),
        terminology_profile: wizardData.industryTileId,
      };
      const { error: uErr } = await supabase
        .from("tenants")
        .update({
          industry_profile: wizardData.industryProfile,
          branding_config: merged,
        })
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
        const toInsert = (wizardData.products || []).map((p, i) => ({
          tenant_id: wizardData.tenantId,
          name: p.name,
          sell_price: p.price,
          category: "finished_product",
          is_active: true,
          // Auto-generate SKU — inventory_items.sku is NOT NULL
          sku: `WZ-${(p.name || "PROD").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6) || "PROD"}-${String(i + 1).padStart(2, "0")}`,
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

  // ── Step 6 handlers — loyalty preset ───────────────────────────────
  const pickLoyalty = useCallback((preset) => {
    setWizardData((prev) => ({
      ...prev,
      loyaltyPresetId: preset.id,
      loyaltyWelcomePoints: preset.welcome,
    }));
  }, []);

  const handleStep6Continue = useCallback(async () => {
    if (!wizardData.tenantId) {
      setStepError("Tenant context lost. Go back to Step 1.");
      return;
    }
    const preset = LOYALTY_PRESETS.find((p) => p.id === wizardData.loyaltyPresetId);
    if (!preset) {
      setStepError("Pick a loyalty preset first.");
      return;
    }
    setSavingStep(true);
    setStepError(null);
    try {
      // upsert by tenant_id — Vozel Vapes already has a row, new tenants don't.
      const { error: upErr } = await supabase
        .from("loyalty_config")
        .upsert(
          {
            tenant_id: wizardData.tenantId,
            ...preset.payload,
          },
          { onConflict: "tenant_id" },
        );
      if (upErr) throw upErr;
      setStepIndex(6);
    } catch (e) {
      setStepError(e.message || "Could not save loyalty programme.");
    } finally {
      setSavingStep(false);
    }
  }, [wizardData.tenantId, wizardData.loyaltyPresetId]);

  // ── Step 7 handlers — launch ───────────────────────────────────────

  // Best-effort logo upload to Supabase Storage. Returns the public URL,
  // or null on failure (logged inline, never blocks launch).
  const uploadLogo = useCallback(async () => {
    if (!wizardData.logoFile || !wizardData.tenantId) return null;
    try {
      const file = wizardData.logoFile;
      const ext =
        (file.name?.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "png";
      const path = `${wizardData.tenantId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("storefront-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("storefront-assets")
        .getPublicUrl(path);
      return pub?.publicUrl || null;
    } catch (e) {
      setLogoUploadError(e.message || "Logo upload failed");
      return null;
    }
  }, [wizardData.logoFile, wizardData.tenantId]);

  // Generate the welcome QR. Best-effort sign-qr call (deployed v39 may
  // accept the rich payload; the repo file is the v1 stub per LL-193).
  // Always inserts a qr_codes row so the scan route resolves either way.
  const generateWelcomeQr = useCallback(async () => {
    const preset = LOYALTY_PRESETS.find((p) => p.id === wizardData.loyaltyPresetId);
    const points = preset?.payload?.pts_qr_scan ?? 100;

    const scanActions = [
      {
        action: "award_points",
        points,
        one_time: false,
        cooldown_hrs: 24,
      },
      {
        action: "custom_message",
        headline: `Welcome to ${wizardData.name}`,
        body: `You've earned ${points} loyalty points. Scan again in 24 hours for more.`,
        cta: "Shop Now",
        cta_url: `/shop/${wizardData.slug}`,
      },
      {
        action: "redirect",
        url: `/shop/${wizardData.slug}`,
        delay_ms: 4000,
      },
    ];

    // Try sign-qr EF first (deployed v39 form per Phase 3 spec).
    let returnedCode = null;
    try {
      const { data: efRes } = await supabase.functions.invoke("sign-qr", {
        body: {
          type: "sign",
          tenantId: wizardData.tenantId,
          qr_type: "welcome",
          points_value: points,
          max_scans: null,
          cooldown_hrs: 24,
          campaign_name: `${wizardData.name} — Welcome`,
          source_label: "wizard",
          scan_actions: scanActions,
        },
      });
      returnedCode = efRes?.qr_code || efRes?.signed_qr || null;
    } catch (_efErr) {
      // Swallow — fall back to local generation below. Deployed v39 may
      // not handle the welcome shape; v1 stub definitely doesn't.
    }

    const qrCode = returnedCode || genWelcomeCode(wizardData.slug);

    // Insert / upsert the qr_codes row so /scan/:code resolves correctly.
    // Mirrors the AdminQRCodes promo path (insert without sign-qr).
    const { error: insErr } = await supabase.from("qr_codes").insert({
      qr_code: qrCode,
      qr_type: "welcome",
      tenant_id: wizardData.tenantId,
      campaign_name: `${wizardData.name} — Welcome`,
      scan_actions: scanActions,
      points_value: points,
      is_active: true,
      claimed: false,
      scan_count: 0,
      hmac_signed: false,
      max_scans: null,
      cooldown_hrs: 24,
      source_label: "wizard",
    });
    // Best-effort: if the EF already inserted (rare), this will collide
    // on a unique constraint — swallow and use the returned code anyway.
    if (insErr && !/duplicate|unique/i.test(insErr.message || "")) {
      throw insErr;
    }
    return qrCode;
  }, [
    wizardData.tenantId,
    wizardData.name,
    wizardData.slug,
    wizardData.loyaltyPresetId,
  ]);

  const handleLaunch = useCallback(async () => {
    if (!wizardData.tenantId) {
      setLaunchError("Tenant context lost. Go back to Step 1.");
      return;
    }
    setLaunching(true);
    setLaunchError(null);
    setLogoUploadError(null);
    setLaunchProgress({ save: "active", qr: "pending", live: "pending" });

    try {
      // ── 1. Save (logo upload + branding/wizard_complete) ──────────
      const uploadedUrl = await uploadLogo();

      // Query live stats for hero stat keys (best-effort — non-blocking).
      // LL-216: these populate stat_1/3/4_value for non-cannabis storefronts.
      let productCount = 0;
      let categoryCount = 0;
      let minPrice = 0;
      try {
        const [countRes, catRes, priceRes] = await Promise.all([
          supabase
            .from("inventory_items")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", wizardData.tenantId)
            .eq("is_active", true),
          supabase
            .from("inventory_items")
            .select("category")
            .eq("tenant_id", wizardData.tenantId)
            .eq("is_active", true),
          supabase
            .from("inventory_items")
            .select("sell_price")
            .eq("tenant_id", wizardData.tenantId)
            .eq("is_active", true)
            .gt("sell_price", 0)
            .order("sell_price", { ascending: true })
            .limit(1),
        ]);
        productCount = countRes.count || 0;
        categoryCount = catRes.data
          ? new Set(catRes.data.map((r) => r.category)).size
          : 0;
        minPrice = priceRes.data?.[0]?.sell_price || 0;
      } catch (_statErr) {
        // Non-blocking — stat keys omitted if query fails
      }

      // Read current branding_config so we don't clobber adjacent keys.
      const { data: tRow } = await supabase
        .from("tenants")
        .select("branding_config")
        .eq("id", wizardData.tenantId)
        .single();
      const mergedBranding = {
        ...(tRow?.branding_config || {}),
        // ── Wizard keys ─────────────────────────────────────────────
        wizard_complete: true,
        launched_at: new Date().toISOString(),
        logo_url: uploadedUrl ?? tRow?.branding_config?.logo_url ?? null,
        // ── Legacy shop keys (required by Shop.js + ClientHeader) ───
        // LL-216: both key sets must exist for every wizard-launched tenant.
        brand_name: wizardData.name,
        shop_name: wizardData.name,
        accent_color: wizardData.brandColor,
        btn_bg: wizardData.brandColor,
        btn_text: "#FFFFFF",
        hero_eyebrow: `${wizardData.name} · Online Store`,
        hero_tagline: wizardData.tagline || "Shop now",
        nav_logo_text: wizardData.name,
        ...(productCount > 0 && { stat_1_value: String(productCount) }),
        stat_1_label: "Products",
        stat_2_value: "100%",
        stat_2_label: "Verified",
        ...(categoryCount > 0 && { stat_3_value: String(categoryCount) }),
        stat_3_label: "Categories",
        ...(minPrice > 0 && { stat_4_value: `R${Math.floor(minPrice)}+` }),
        stat_4_label: "From",
      };
      const { error: brandErr } = await supabase
        .from("tenants")
        .update({ branding_config: mergedBranding })
        .eq("id", wizardData.tenantId);
      if (brandErr) throw brandErr;
      setLaunchProgress({ save: "done", qr: "active", live: "pending" });

      // ── 2. Welcome QR (sign-qr best-effort + qr_codes insert) ─────
      const qrCode = await generateWelcomeQr();
      setLaunchProgress({ save: "done", qr: "done", live: "active" });

      // ── 3. Flip is_active true → tenant is live ───────────────────
      const { error: liveErr } = await supabase
        .from("tenants")
        .update({ is_active: true })
        .eq("id", wizardData.tenantId);
      if (liveErr) throw liveErr;
      setLaunchProgress({ save: "done", qr: "done", live: "done" });

      const liveUrl = `${APP_URL}/shop/${wizardData.slug}`;
      setWizardData((prev) => ({
        ...prev,
        qrCode,
        launchedUrl: liveUrl,
        logoUploadedUrl: uploadedUrl,
      }));
      setLaunched(true);
    } catch (e) {
      setLaunchError(e.message || "Launch failed.");
    } finally {
      setLaunching(false);
    }
  }, [wizardData.tenantId, wizardData.slug, wizardData.name, wizardData.brandColor, wizardData.tagline, uploadLogo, generateWelcomeQr]);

  // Copy live URL to clipboard
  const copyLiveUrl = useCallback(() => {
    if (!wizardData.launchedUrl) return;
    navigator.clipboard.writeText(wizardData.launchedUrl).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  }, [wizardData.launchedUrl]);

  // Download QR as PNG (mirrors AdminQRCodes pattern: SVG → canvas → toDataURL)
  const downloadQrPng = useCallback(() => {
    const svg = qrSvgRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `welcome-qr-${wizardData.slug || "shop"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }, [wizardData.slug]);

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
      loyaltyWelcomePoints: wizardData.loyaltyWelcomePoints,
    }),
    [wizardData],
  );

  // Step 7 derived — checklist values
  const selectedLoyaltyPreset = LOYALTY_PRESETS.find(
    (p) => p.id === wizardData.loyaltyPresetId,
  );
  const selectedIndustryLabel =
    INDUSTRY_TILES.find((t) => t.id === wizardData.industryTileId)?.title ||
    "Not set";
  const selectedTemplateLabel =
    TEMPLATE_OPTIONS.find((t) => t.id === wizardData.template)?.title ||
    "Not set";
  const productCount =
    wizardData.existingProducts.length || (wizardData.products || []).length;

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

  // ── Outcome D: already-launched ────────────────────────────────────
  if (alreadyLaunched) {
    return (
      <div className="wz-root">
        <div className="wz-launched">
          <div className="wz-launched-icon" aria-hidden="true">
            ✓
          </div>
          <h1 className="wz-display">Your shop is already live.</h1>
          <p
            className="wz-body"
            style={{ color: "var(--wz-text-secondary)" }}
          >
            {wizardData.name} was launched earlier. You can manage everything
            from your dashboard.
          </p>
          <Link to="/tenant-portal" className="wz-cta" style={{ maxWidth: 280, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            Go to your dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="wz-root">
      <div className="wz-shell">
        {/* ── LEFT: form pane ─────────────────────────────────────── */}
        <section className="wz-pane-form" aria-label="Onboarding form">
          {stepIndex > 0 && !launched && (
            <button type="button" className="wz-back" onClick={goBack}>
              ← Back
            </button>
          )}

          {/* Resume banner — Step 2 onwards, until dismissed */}
          {stepIndex > 0 &&
            wizardData.isResuming &&
            !resumeBannerDismissed &&
            !launched && (
              <div className="wz-resume-banner" role="status">
                <span className="wz-resume-banner-icon" aria-hidden="true">
                  ↻
                </span>
                <span>Continuing where you left off</span>
                <button
                  type="button"
                  className="wz-resume-banner-dismiss"
                  onClick={() => setResumeBannerDismissed(true)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
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

          {/* ── STEP 6: Loyalty programme ──────────────────────── */}
          {stepIndex === 5 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div className="wz-loyalty-stack">
                {LOYALTY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`wz-loyalty-card${
                      wizardData.loyaltyPresetId === preset.id ? " is-selected" : ""
                    }`}
                    onClick={() => pickLoyalty(preset)}
                  >
                    <div className="wz-loyalty-card-head">
                      <div className="wz-loyalty-card-title">{preset.title}</div>
                      <div className="wz-loyalty-card-pts">
                        Welcome scan: {preset.welcome} pts
                      </div>
                    </div>
                    <div className="wz-loyalty-card-rules">{preset.rules}</div>
                  </button>
                ))}
              </div>

              {selectedLoyaltyPreset && (
                <div className="wz-loyalty-summary">
                  <strong>{selectedLoyaltyPreset.title}</strong> · Welcome
                  scan awards{" "}
                  <strong>{selectedLoyaltyPreset.welcome} points</strong>
                  {" · "}
                  {selectedLoyaltyPreset.payload.pts_per_r100_online} pts per R100 spent
                  {selectedLoyaltyPreset.payload.threshold_silver
                    ? ` · Silver tier at ${selectedLoyaltyPreset.payload.threshold_silver} pts`
                    : ""}
                  {selectedLoyaltyPreset.payload.threshold_gold
                    ? ` · Gold tier at ${selectedLoyaltyPreset.payload.threshold_gold} pts`
                    : ""}
                  . Advanced settings live in your dashboard.
                </div>
              )}

              {stepError && (
                <div className="wz-error-text" role="alert">
                  {stepError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleStep6Continue}
                disabled={savingStep || !wizardData.loyaltyPresetId}
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

          {/* ── STEP 7: Launch ─────────────────────────────────── */}
          {stepIndex === 6 && !launched && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--wz-space-4)",
              }}
            >
              <div className="wz-checklist">
                <div className="wz-check-row">
                  <span className="wz-check-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="wz-check-label">Brand:</span>
                    <span className="wz-check-value">
                      {wizardData.name || "Not set"} ({wizardData.brandColor})
                    </span>
                  </span>
                </div>
                <div className="wz-check-row">
                  <span className="wz-check-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="wz-check-label">Industry:</span>
                    <span className="wz-check-value">{selectedIndustryLabel}</span>
                  </span>
                </div>
                <div className="wz-check-row">
                  <span className="wz-check-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="wz-check-label">Template:</span>
                    <span className="wz-check-value">{selectedTemplateLabel}</span>
                  </span>
                </div>
                <div className="wz-check-row">
                  <span className="wz-check-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="wz-check-label">Products:</span>
                    <span className="wz-check-value">
                      {productCount} {productCount === 1 ? "product" : "products"}
                    </span>
                  </span>
                </div>
                <div className="wz-check-row">
                  <span className="wz-check-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="wz-check-label">Loyalty:</span>
                    <span className="wz-check-value">
                      {selectedLoyaltyPreset?.title || "Standard"} programme
                    </span>
                  </span>
                </div>
              </div>

              {launching && (
                <div className="wz-launch-progress" aria-live="polite">
                  <div
                    className={`wz-launch-step is-${launchProgress.save}`}
                  >
                    <span className="wz-launch-step-mark" aria-hidden="true">
                      {launchProgress.save === "done" ? "✓" : "1"}
                    </span>
                    Saving your brand…
                  </div>
                  <div
                    className={`wz-launch-step is-${launchProgress.qr}`}
                  >
                    <span className="wz-launch-step-mark" aria-hidden="true">
                      {launchProgress.qr === "done" ? "✓" : "2"}
                    </span>
                    Creating your QR…
                  </div>
                  <div
                    className={`wz-launch-step is-${launchProgress.live}`}
                  >
                    <span className="wz-launch-step-mark" aria-hidden="true">
                      {launchProgress.live === "done" ? "✓" : "3"}
                    </span>
                    Going live…
                  </div>
                </div>
              )}

              {logoUploadError && (
                <div className="wz-error-text" role="status">
                  Logo upload failed: {logoUploadError}. Continuing without logo.
                </div>
              )}
              {launchError && (
                <div className="wz-error-text" role="alert">
                  {launchError}
                </div>
              )}

              <button
                type="button"
                className="wz-cta"
                onClick={handleLaunch}
                disabled={launching}
              >
                {launching ? (
                  <>
                    <span className="wz-spinner" aria-hidden="true" />
                    Launching…
                  </>
                ) : wizardData.isResuming ? (
                  "Resume launch →"
                ) : (
                  "Launch my shop →"
                )}
              </button>
            </div>
          )}

          {/* ── SUCCESS state — after launch completes ─────────── */}
          {stepIndex === 6 && launched && wizardData.launchedUrl && (
            <div className="wz-success">
              <div className="wz-success-icon" aria-hidden="true">
                ✓
              </div>
              <h2 className="wz-success-title">
                {wizardData.isResuming
                  ? `Welcome back — ${wizardData.name} is live`
                  : "Your shop is live"}
              </h2>

              <div className="wz-success-url">
                <a
                  className="wz-success-url-link"
                  href={wizardData.launchedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {wizardData.launchedUrl}
                </a>
                <button
                  type="button"
                  className="wz-success-copy"
                  onClick={copyLiveUrl}
                >
                  {copiedUrl ? "Copied" : "Copy"}
                </button>
              </div>

              {wizardData.qrCode && (
                <div className="wz-success-qr" ref={qrSvgRef}>
                  <QRCodeSVG
                    value={`${APP_URL}/scan/${wizardData.qrCode}`}
                    size={200}
                    level="H"
                    includeMargin
                    bgColor="#fff"
                    fgColor={wizardData.brandColor || "#1A1A18"}
                  />
                </div>
              )}

              <div className="wz-success-actions">
                {wizardData.qrCode && (
                  <button
                    type="button"
                    className="wz-secondary-cta"
                    onClick={downloadQrPng}
                  >
                    Download QR (PNG)
                  </button>
                )}
                <Link
                  to="/tenant-portal"
                  className="wz-cta"
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Go to your dashboard →
                </Link>
              </div>
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
