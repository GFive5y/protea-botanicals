import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { RoleContext } from "../App";
import { useTenant } from "../services/tenantService";

// ─── HQ: all HQDashboard tabs — operational flow order ───────────────────────
const HQ_PAGES = [
  // ── Operations ──────────────────────────────────────────────────────────────
  { group: "Operations", icon: "⌂", label: "Overview", path: "/hq" },
  {
    group: "Operations",
    icon: "⬡",
    label: "Supply chain",
    path: "/hq?tab=supply-chain",
  },
  {
    group: "Operations",
    icon: "🌍",
    label: "Suppliers",
    path: "/hq?tab=suppliers",
  },
  {
    group: "Operations",
    icon: "◈",
    label: "Procurement",
    path: "/hq?tab=procurement",
  },
  {
    group: "Operations",
    icon: "⚙",
    label: "Production",
    path: "/hq?tab=hq-production",
  },
  {
    group: "Operations",
    icon: "=",
    label: "HQ Stock",
    path: "/hq?tab=hq-stock",
  },
  {
    group: "Operations",
    icon: "📊",
    label: "Daily Trading",
    path: "/hq?tab=hq-trading",
  },
  {
    group: "Operations",
    icon: "🛒",
    label: "POS Till",
    path: "/hq?tab=hq-pos",
  },
  { group: "Operations", icon: "💰", label: "Cash-Up", path: "/hq?tab=hq-eod" },
  {
    group: "Operations",
    icon: "=",
    label: "Transfers",
    path: "/hq?tab=hq-transfers",
  },
  {
    group: "Operations",
    icon: "⬤",
    label: "Distribution",
    path: "/hq?tab=distribution",
  },
  // ── Food & Beverage ──────────────────────────────────────────────────────────
  {
    group: "Food & Beverage",
    icon: "🍃",
    label: "Ingredients",
    path: "/hq?tab=hq-ingredients",
  },
  {
    group: "Food & Beverage",
    icon: "📖",
    label: "Recipes",
    path: "/hq?tab=hq-recipes",
  },
  {
    group: "Food & Beverage",
    icon: "🛡️",
    label: "HACCP",
    path: "/hq?tab=hq-haccp",
  },
  {
    group: "Food & Beverage",
    icon: "📋",
    label: "Food Safety",
    path: "/hq?tab=hq-food-safety",
  },
  {
    group: "Food & Beverage",
    icon: "🏷️",
    label: "Nutrition Labels",
    path: "/hq?tab=hq-nutrition",
  },
  {
    group: "Food & Beverage",
    icon: "🌡️",
    label: "Cold Chain",
    path: "/hq?tab=hq-cold-chain",
  },
  {
    group: "Food & Beverage",
    icon: "🔍",
    label: "Recall & Trace",
    path: "/hq?tab=hq-recall",
  },
  {
    group: "Food & Beverage",
    icon: "📊",
    label: "Food Intelligence",
    path: "/hq?tab=hq-food-intelligence",
  },
  // ── Finance ──────────────────────────────────────────────────────────────────
  { group: "Finance", icon: "◉", label: "Pricing", path: "/hq?tab=pricing" },
  { group: "Finance", icon: "🧮", label: "Costing", path: "/hq?tab=costing" },
  { group: "Finance", icon: "≡", label: "P&L", path: "/hq?tab=pl" },
  {
    group: "Finance",
    icon: "⚖️",
    label: "Balance Sheet",
    path: "/hq?tab=balance-sheet",
  },
  { group: "Finance", icon: "🧾", label: "Invoices", path: "/hq?tab=invoices" },
  { group: "Finance", icon: "📒", label: "Journals", path: "/hq?tab=journals" },
  { group: "Finance", icon: "🏦", label: "Bank Recon", path: "/hq?tab=bank-recon" },
  { group: "Finance", icon: "🏗️", label: "Fixed Assets", path: "/hq?tab=fixed-assets" },
  { group: "Finance", icon: "💸", label: "Expenses", path: "/hq?tab=expenses" },
  { group: "Finance", icon: "🔮", label: "Forecast", path: "/hq?tab=forecast" },
  { group: "Finance", icon: "🏛️", label: "VAT", path: "/hq?tab=vat" },
  { group: "Finance", icon: "📅", label: "Year-End Close", path: "/hq?tab=year-end-close" },
  // ── Intelligence ─────────────────────────────────────────────────────────────
  {
    group: "Intelligence",
    icon: "▲",
    label: "Analytics",
    path: "/hq?tab=analytics",
  },
  {
    group: "Intelligence",
    icon: "🏆",
    label: "Retailer health",
    path: "/hq?tab=retailer-health",
  },
  {
    group: "Intelligence",
    icon: "🔔",
    label: "Reorder",
    path: "/hq?tab=reorder",
  },
  // ── Platform ─────────────────────────────────────────────────────────────────
  { group: "Platform", icon: "ðŸ¢", label: "Tenants", path: "/hq?tab=tenants" },
  {
    group: "Platform",
    icon: "âš•ï¸",
    label: "Medical",
    path: "/hq?tab=medical",
  },
  {
    group: "Platform",
    icon: "🏭",
    label: "Wholesale Orders",
    path: "/hq?tab=wholesale-orders",
  },
  { group: "Platform", icon: "💎", label: "Loyalty", path: "/hq?tab=loyalty" },
  { group: "Platform", icon: "🛡", label: "Fraud", path: "/hq?tab=fraud" },
  {
    group: "Platform",
    icon: "◎",
    label: "Documents",
    path: "/hq?tab=documents",
  },
  // ── People ───────────────────────────────────────────────────────────────────
  {
    group: "People",
    icon: "♟",
    label: "HR",
    path: "/hr",
    sub: [
      { label: "Overview", path: "/hr" },
      { label: "Staff", path: "/hr?tab=staff" },
      { label: "Leave", path: "/hr?tab=leave" },
      { label: "Timesheets", path: "/hr?tab=timesheets" },
      { label: "Contracts", path: "/hr?tab=contracts" },
      { label: "Comms", path: "/hr?tab=comms" },
      { label: "Disciplinary", path: "/hr?tab=disciplinary" },
      { label: "Calendar", path: "/hr?tab=calendar" },
      { label: "Loans", path: "/hr?tab=loans" },
      { label: "Performance", path: "/hr?tab=performance" },
      { label: "Payroll", path: "/hr?tab=payroll" },
      { label: "Settings", path: "/hr?tab=settings" },
    ],
  },
  { group: "People", icon: "🏪", label: "Shops", path: "/hq?tab=shops" },
];

// ─── Admin: all 13 AdminDashboard tabs — grouped operational order ────────────
const ADMIN_PAGES = [
  { group: "Operations", icon: "⌂", label: "Overview", path: "/admin" },
  {
    group: "Operations",
    icon: "🌿",
    label: "Batches",
    path: "/admin?tab=batches",
  },
  { group: "Operations", icon: "📦", label: "Stock", path: "/admin?tab=stock" },
  {
    group: "Operations",
    icon: "🚚",
    label: "Shipments",
    path: "/admin?tab=shipments",
  },
  {
    group: "Customers",
    icon: "◉",
    label: "Customers",
    path: "/admin?tab=customers",
  },
  { group: "Customers", icon: "✉", label: "Comms", path: "/admin?tab=comms" },
  {
    group: "Customers",
    icon: "🔔",
    label: "Notifications",
    path: "/admin?tab=notifications",
  },
  {
    group: "Customers",
    icon: "◈",
    label: "QR Codes",
    path: "/admin?tab=qr_codes",
  },
  {
    group: "Intelligence",
    icon: "▲",
    label: "Analytics",
    path: "/admin?tab=analytics",
  },
  {
    group: "Intelligence",
    icon: "🛡",
    label: "Security",
    path: "/admin?tab=security",
  },
  {
    group: "Intelligence",
    icon: "👥",
    label: "Users",
    path: "/admin?tab=users",
  },
  {
    group: "Platform",
    icon: "📄",
    label: "Documents",
    path: "/admin?tab=documents",
  },
  {
    group: "Platform",
    icon: "♟",
    label: "HR",
    path: "/hr",
    sub: [
      { label: "Overview", path: "/hr" },
      { label: "Staff", path: "/hr?tab=staff" },
      { label: "Leave", path: "/hr?tab=leave" },
      { label: "Timesheets", path: "/hr?tab=timesheets" },
      { label: "Contracts", path: "/hr?tab=contracts" },
      { label: "Comms", path: "/hr?tab=comms" },
      { label: "Disciplinary", path: "/hr?tab=disciplinary" },
      { label: "Calendar", path: "/hr?tab=calendar" },
      { label: "Loans", path: "/hr?tab=loans" },
      { label: "Performance", path: "/hr?tab=performance" },
      { label: "Payroll", path: "/hr?tab=payroll" },
      { label: "Settings", path: "/hr?tab=settings" },
    ],
  },
];

// ─── HR: all 12 HRDashboard tabs ─────────────────────────────────────────────
const HR_PAGES = [
  { icon: "⌂", label: "Overview", path: "/hr" },
  { icon: "👥", label: "Staff", path: "/hr?tab=staff" },
  { icon: "◎", label: "Leave", path: "/hr?tab=leave" },
  { icon: "⬤", label: "Timesheets", path: "/hr?tab=timesheets" },
  { icon: "📄", label: "Contracts", path: "/hr?tab=contracts" },
  { icon: "✉", label: "Comms", path: "/hr?tab=comms" },
  { icon: "⚖", label: "Disciplinary", path: "/hr?tab=disciplinary" },
  { icon: "📅", label: "Calendar", path: "/hr?tab=calendar" },
  { icon: "💰", label: "Loans", path: "/hr?tab=loans" },
  { icon: "📊", label: "Performance", path: "/hr?tab=performance" },
  { icon: "💳", label: "Payroll", path: "/hr?tab=payroll" },
  { icon: "⚙", label: "Settings", path: "/hr?tab=settings" },
];

// ─── Staff: 4 portal tabs ─────────────────────────────────────────────────────
const STAFF_PAGES = [
  { icon: "◉", label: "My profile", path: "/staff" },
  { icon: "◎", label: "Leave", path: "/staff?tab=leave" },
  { icon: "⬤", label: "Timesheets", path: "/staff?tab=timesheets" },
  { icon: "✉", label: "Messages", path: "/staff?tab=messages" },
];

export function useNavConfig() {
  const { role, userEmail, loading: roleLoading } = useContext(RoleContext);
  const { isHQ, loading: tenantLoading } = useTenant();
  const location = useLocation();

  if (roleLoading || tenantLoading) return null;
  if (!role) return null;

  const initials = getInitialsFromEmail(userEmail);
  const displayName = userEmail || "User";

  const path = location.pathname;
  const onAdmin = path.startsWith("/admin");
  const onHR = path.startsWith("/hr");
  const onStaff = path.startsWith("/staff");

  if (isHQ) {
    if (onAdmin) {
      return {
        pages: ADMIN_PAGES,
        title: "Admin Portal",
        subtitle: "HQ — Admin view",
        initials,
        bubbleName: displayName,
        bubbleRole: "Super Admin · HQ",
        showDesktopBanner: false,
      };
    }
    if (onHR) {
      return {
        pages: HR_PAGES,
        title: "HR Dashboard",
        subtitle: "HQ — HR view",
        initials,
        bubbleName: displayName,
        bubbleRole: "Super Admin · HQ",
        showDesktopBanner: false,
      };
    }
    if (onStaff) {
      return {
        pages: STAFF_PAGES,
        title: "Staff Portal",
        subtitle: "HQ — Staff view",
        initials,
        bubbleName: displayName,
        bubbleRole: "Super Admin · HQ",
        showDesktopBanner: false,
      };
    }
    return {
      pages: HQ_PAGES,
      title: "Protea HQ",
      subtitle: "Super Admin",
      initials,
      bubbleName: displayName,
      bubbleRole: "Super Admin · HQ",
      showDesktopBanner: false,
    };
  }

  if (role === "hr") {
    if (onAdmin) {
      return {
        pages: ADMIN_PAGES,
        title: "Admin Portal",
        subtitle: "HR Manager",
        initials,
        bubbleName: displayName,
        bubbleRole: "HR Manager",
        showDesktopBanner: false,
      };
    }
    return {
      pages: HR_PAGES,
      title: "HR Dashboard",
      subtitle: "HR Manager",
      initials,
      bubbleName: displayName,
      bubbleRole: "HR Manager",
      showDesktopBanner: false,
    };
  }

  if (role === "admin") {
    if (onHR) {
      return {
        pages: HR_PAGES,
        title: "HR Dashboard",
        subtitle: "Store Admin",
        initials,
        bubbleName: displayName,
        bubbleRole: "Store Admin",
        showDesktopBanner: false,
      };
    }
    return {
      pages: ADMIN_PAGES,
      title: "Admin Portal",
      subtitle: "Store Admin",
      initials,
      bubbleName: displayName,
      bubbleRole: "Store Admin",
      showDesktopBanner: true,
    };
  }

  return {
    pages: STAFF_PAGES,
    title: "My Portal",
    subtitle: "Staff member",
    initials,
    bubbleName: displayName,
    bubbleRole: "Staff member",
    showDesktopBanner: false,
  };
}

function getInitialsFromEmail(email) {
  if (!email) return "??";
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return prefix.slice(0, 2).toUpperCase();
}
