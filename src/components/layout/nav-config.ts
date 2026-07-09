import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FilePlus,
  FileText,
  FolderOpen,
  Image,
  Inbox,
  LayoutDashboard,
  Package,
  Palette,
  Plug,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavChild[];
  /** Navigates + hovers, but never shows the active highlight — used for the
   *  settings sub-pages so only "Settings" stays highlighted (never two). */
  noActive?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Inbox", href: "/inbox", icon: Inbox },
      { label: "Quotes", href: "/quotes", icon: FileText },
      {
        label: "Jobs",
        href: "/jobs",
        icon: Package,
        children: [
          { label: "Scheduled", href: "/jobs?status=scheduled" },
          { label: "In production", href: "/jobs?status=in_production" },
          { label: "Completed", href: "/jobs?status=delivered" },
        ],
      },
      { label: "Production", href: "/production", icon: ClipboardList },
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Catalog", href: "/catalog", icon: ShoppingCart },
      { label: "Artwork", href: "/artwork", icon: Image },
      { label: "Reports", href: "/reports", icon: FolderOpen },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Branding", href: "/settings/branding", icon: Palette, noActive: true },
      {
        label: "Templates",
        href: "/settings/document-templates",
        icon: FilePlus,
        noActive: true,
      },
      {
        label: "Pricing rules",
        href: "/settings/pricing-rules",
        icon: Tag,
        noActive: true,
      },
      { label: "Integrations", href: "/settings/integrations", icon: Plug, noActive: true },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
