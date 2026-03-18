import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { RoleContext } from "../App";
import { useTenant } from "../services/tenantService";

// ─── HQ: all 16 HQDashboard tabs ─────────────────────────────────────────────
const HQ_PAGES = [
  { icon: "⌂", label: "Overview", path: "/hq" },
  { icon: "⬡", label: "Supply chain", path: "/hq?tab=supply-chain" },
  { icon: "⬤", label: "Distribution", path: "/hq?tab=distribution" },
  { icon: "🏪", label: "Shops", path: "/hq?tab=shops" },
  { icon: "▲", label: "Analytics", path: "/hq?tab=analytics" },
  { icon: "🏆", label: "Retailer health", path: "/hq?tab=retailer-health" },
  { icon: "🌍", label: "Suppliers", path: "/hq?tab=suppliers" },
  { icon: "◈", label: "Procurement", path: "/hq?tab=procurement" },
  { icon: "🧮", label: "Costing", path: "/hq?tab=costing" },
  { icon: "◉", label: "Pricing", path: "/hq?tab=pricing" },
  { icon: "≡", label: "P&L", path: "/hq?tab=pl" },
  { icon: "🔔", label: "Reorder", path: "/hq?tab=reorder" },
  { icon: "◎", label: "Documents", path: "/hq?tab=documents" },
  { icon: "⚙", label: "HQ Production", path: "/hq?tab=hq-production" },
  { icon: "💎", label: "Loyalty", path: "/hq?tab=loyalty" },
  { icon: "🛡", label: "Fraud", path: "/hq?tab=fraud" },
  {
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

// ─── Admin: all 13 AdminDashboard tabs ───────────────────────────────────────
const ADMIN_PAGES = [
  { icon: "⌂", label: "Overview", path: "/admin" },
  { icon: "🌿", label: "Batches", path: "/admin?tab=batches" },
  { icon: "🚚", label: "Shipments", path: "/admin?tab=shipments" },
  { icon: "◈", label: "QR Codes", path: "/admin?tab=qr_codes" },
  { icon: "👥", label: "Users", path: "/admin?tab=users" },
  { icon: "◉", label: "Customers", path: "/admin?tab=customers" },
  { icon: "✉", label: "Comms", path: "/admin?tab=comms" },
  { icon: "🛡", label: "Security", path: "/admin?tab=security" },
  { icon: "🔔", label: "Notifications", path: "/admin?tab=notifications" },
  { icon: "▲", label: "Analytics", path: "/admin?tab=analytics" },
  { icon: "📦", label: "Stock", path: "/admin?tab=stock" },
  { icon: "📄", label: "Documents", path: "/admin?tab=documents" },
  { icon: "⬡", label: "Wholesale", path: "/wholesale" },
  {
    icon: "♟",
    label: "HR",
    path: "/hr",
    sub: [
      { label: "Staff overview", path: "/hr" },
      { label: "Leave approvals", path: "/hr?tab=leave" },
      { label: "Timesheets", path: "/hr?tab=timesheets" },
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

  // ── Route-aware config ──
  // Determine which section the user is currently in
  const path = location.pathname;
  const onAdmin = path.startsWith("/admin");
  const onHR = path.startsWith("/hr");
  const onStaff = path.startsWith("/staff");
  // onHQ = anything else for HQ/hr users

  // HQ users get route-specific nav so ALL sections remain accessible
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
    // Default: /hq and everything else
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

  // HR role (non-HQ)
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

  // Admin role
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

  // Staff / customer / retailer
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
