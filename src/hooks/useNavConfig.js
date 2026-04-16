import { useContext } from "react";
import {
  ArrowLeftRight, Award, Banknote, BarChart2, BarChart3, Bell, BookMarked, BookOpen, Building, Building2, Calculator, Calendar, CalendarCheck, CalendarOff, ClipboardList, Clock, CreditCard, DollarSign, Factory, FileBarChart, FileText, Files, Gem, Globe, Home, Landmark, Layers, LayoutGrid, Leaf, LineChart, Mail, MapPin, MessageSquare, Monitor, Network, Package, PlusCircle, QrCode, Receipt, Scale, Search, Settings, Shield, ShieldCheck, ShieldOff, ShoppingBag, Stethoscope, Store, Tag, Thermometer, TrendingUp, Truck, UserCircle, Users, Wallet, Warehouse,
} from 'lucide-react';
import { useLocation } from "react-router-dom";
import { RoleContext } from "../App";
import { useTenant } from "../services/tenantService";

// ─── HQ: all HQDashboard tabs — operational flow order ───────────────────────
const HQ_PAGES = [
  // ── Operations ──────────────────────────────────────────────────────────────
  { group: "Operations", Icon: Home, label: "Overview", path: "/hq" },
  {
    group: "Operations",
    Icon: Network,
    label: "Supply chain",
    path: "/hq?tab=supply-chain",
  },
  {
    group: "Operations",
    Icon: Globe,
    label: "Suppliers",
    path: "/hq?tab=suppliers",
  },
  {
    group: "Operations",
    Icon: ClipboardList,
    label: "Purchasing",
    path: "/hq?tab=procurement",
  },
  {
    group: "Operations",
    Icon: Factory,
    label: "Production",
    path: "/hq?tab=hq-production",
  },
  {
    group: "Operations",
    Icon: Package,
    label: "HQ Stock",
    path: "/hq?tab=hq-stock",
  },
  {
    group: "Operations",
    Icon: TrendingUp,
    label: "Daily Trading",
    path: "/hq?tab=hq-trading",
  },
  {
    group: "Operations",
    Icon: Monitor,
    label: "POS Till",
    path: "/hq?tab=hq-pos",
  },
  { group: "Operations", Icon: Banknote, label: "Cash-Up", path: "/hq?tab=hq-eod" },
  {
    group: "Operations",
    Icon: ArrowLeftRight,
    label: "Transfers",
    path: "/hq?tab=hq-transfers",
  },
  {
    group: "Operations",
    Icon: Truck,
    label: "Distribution",
    path: "/hq?tab=distribution",
  },
  // ── Food & Beverage ──────────────────────────────────────────────────────────
  {
    group: "Food & Beverage",
    Icon: Leaf,
    label: "Ingredients",
    path: "/hq?tab=hq-ingredients",
  },
  {
    group: "Food & Beverage",
    Icon: BookOpen,
    label: "Recipes",
    path: "/hq?tab=hq-recipes",
  },
  {
    group: "Food & Beverage",
    Icon: Shield,
    label: "HACCP",
    path: "/hq?tab=hq-haccp",
  },
  {
    group: "Food & Beverage",
    Icon: ShieldCheck,
    label: "Food Safety",
    path: "/hq?tab=hq-food-safety",
  },
  {
    group: "Food & Beverage",
    Icon: Tag,
    label: "Nutrition Labels",
    path: "/hq?tab=hq-nutrition",
  },
  {
    group: "Food & Beverage",
    Icon: Thermometer,
    label: "Cold Chain",
    path: "/hq?tab=hq-cold-chain",
  },
  {
    group: "Food & Beverage",
    Icon: Search,
    label: "Recall & Trace",
    path: "/hq?tab=hq-recall",
  },
  {
    group: "Food & Beverage",
    Icon: BarChart2,
    label: "Food Intelligence",
    path: "/hq?tab=hq-food-intelligence",
  },
  // ── Finance ──────────────────────────────────────────────────────────────────
  { group: "Financials", Icon: DollarSign, label: "Pricing", path: "/hq?tab=pricing" },
  { group: "Financials", Icon: Calculator, label: "Costing", path: "/hq?tab=costing" },
  { group: "Financials", Icon: FileBarChart, label: "P&L", path: "/hq?tab=pl" },
  {
    group: "Financials",
    Icon: Scale,
    label: "Balance Sheet",
    path: "/hq?tab=balance-sheet",
  },
  { group: "Financials", Icon: Receipt, label: "Invoices", path: "/hq?tab=invoices" },
  { group: "Financials", Icon: BookMarked, label: "Journals", path: "/hq?tab=journals" },
  { group: "Financials", Icon: Landmark, label: "Bank Recon", path: "/hq?tab=bank-recon" },
  { group: "Financials", Icon: Building2, label: "Fixed Assets", path: "/hq?tab=fixed-assets" },
  { group: "Financials", Icon: Receipt, label: "Expenses", path: "/hq?tab=expenses" },
  { group: "Financials", Icon: LineChart, label: "Forecast", path: "/hq?tab=forecast" },
  { group: "Financials", Icon: Building, label: "VAT", path: "/hq?tab=vat" },
  { group: "Financials", Icon: CalendarCheck, label: "Year-End Close", path: "/hq?tab=year-end-close" },
  // ── Intelligence ─────────────────────────────────────────────────────────────
  {
    group: "Analytics",
    Icon: BarChart3,
    label: "Analytics",
    path: "/hq?tab=analytics",
  },
  {
    group: "Analytics",
    Icon: MapPin,
    label: "Geo Analytics",
    path: "/hq?tab=geo-analytics",
  },
  {
    group: "Analytics",
    Icon: Award,
    label: "Retailer health",
    path: "/hq?tab=retailer-health",
  },
  {
    group: "Analytics",
    Icon: Bell,
    label: "Reorder",
    path: "/hq?tab=reorder",
  },
  // ── Platform ─────────────────────────────────────────────────────────────────
  { group: "Platform", Icon: Store, label: "Tenants", path: "/hq?tab=tenants" },
  { group: "Platform", Icon: LayoutGrid, label: "Group Portal", path: "/group-portal" },
  {
    group: "Platform",
    Icon: Stethoscope,
    label: "Medical",
    path: "/hq?tab=medical",
  },
  {
    group: "Platform",
    Icon: Warehouse,
    label: "Wholesale Orders",
    path: "/hq?tab=wholesale-orders",
  },
  { group: "Platform", Icon: Gem, label: "Loyalty", path: "/hq?tab=loyalty" },
  { group: "Platform", Icon: ShieldOff, label: "Fraud", path: "/hq?tab=fraud" },
  {
    group: "Platform",
    Icon: Files,
    label: "Documents",
    path: "/hq?tab=documents",
  },
  {
    group: "Platform",
    Icon: Mail,
    label: "Email Logs",
    path: "/hq?tab=email-logs",
  },
  // ── People ───────────────────────────────────────────────────────────────────
  {
    group: "People",
    Icon: Users,
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
  { group: "People", Icon: ShoppingBag, label: "Shops", path: "/hq?tab=shops" },
];

// ─── Admin: all 13 AdminDashboard tabs — grouped operational order ────────────
const ADMIN_PAGES = [
  { group: "Operations", Icon: Home, label: "Overview", path: "/admin" },
  {
    group: "Operations",
    Icon: Layers,
    label: "Batches",
    path: "/admin?tab=batches",
  },
  { group: "Operations", Icon: Package, label: "Stock", path: "/admin?tab=stock" },
  {
    group: "Operations",
    Icon: Truck,
    label: "Shipments",
    path: "/admin?tab=shipments",
  },
  {
    group: "Customers",
    Icon: UserCircle,
    label: "Customers",
    path: "/admin?tab=customers",
  },
  { group: "Customers", Icon: MessageSquare, label: "Comms", path: "/admin?tab=comms" },
  {
    group: "Customers",
    Icon: Bell,
    label: "Notifications",
    path: "/admin?tab=notifications",
  },
  {
    group: "Customers",
    Icon: QrCode,
    label: "QR Codes",
    path: "/admin?tab=qr_codes",
  },
  {
    group: "Customers",
    Icon: PlusCircle,
    label: "Generate QR",
    path: "/admin?tab=qr_codes&sub=generate",
  },
  {
    group: "Analytics",
    Icon: BarChart3,
    label: "Analytics",
    path: "/admin?tab=analytics",
  },
  {
    group: "Analytics",
    Icon: ShieldCheck,
    label: "Security",
    path: "/admin?tab=security",
  },
  {
    group: "Analytics",
    Icon: Users,
    label: "Users",
    path: "/admin?tab=users",
  },
  {
    group: "Platform",
    Icon: Files,
    label: "Documents",
    path: "/admin?tab=documents",
  },
  {
    group: "Platform",
    Icon: Users,
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
  { Icon: Home, label: "Overview", path: "/hr" },
  { Icon: Users, label: "Staff", path: "/hr?tab=staff" },
  { Icon: CalendarOff, label: "Leave", path: "/hr?tab=leave" },
  { Icon: Clock, label: "Timesheets", path: "/hr?tab=timesheets" },
  { Icon: FileText, label: "Contracts", path: "/hr?tab=contracts" },
  { Icon: MessageSquare, label: "Comms", path: "/hr?tab=comms" },
  { Icon: Scale, label: "Disciplinary", path: "/hr?tab=disciplinary" },
  { Icon: Calendar, label: "Calendar", path: "/hr?tab=calendar" },
  { Icon: Wallet, label: "Loans", path: "/hr?tab=loans" },
  { Icon: TrendingUp, label: "Performance", path: "/hr?tab=performance" },
  { Icon: CreditCard, label: "Payroll", path: "/hr?tab=payroll" },
  { Icon: Settings, label: "Settings", path: "/hr?tab=settings" },
];

// ─── Staff: 4 portal tabs ─────────────────────────────────────────────────────
const STAFF_PAGES = [
  { Icon: UserCircle, label: "My profile", path: "/staff" },
  { Icon: CalendarOff, label: "Leave", path: "/staff?tab=leave" },
  { Icon: Clock, label: "Timesheets", path: "/staff?tab=timesheets" },
  { Icon: MessageSquare, label: "Messages", path: "/staff?tab=messages" },
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
      title: "NuAi HQ",
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
