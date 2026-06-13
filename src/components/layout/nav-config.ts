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
      { label: "Branding", href: "/settings/branding", icon: Palette },
      {
        label: "Templates",
        href: "/settings/document-templates",
        icon: FilePlus,
      },
      {
        label: "Pricing rules",
        href: "/settings/pricing-rules",
        icon: Tag,
      },
      { label: "Integrations", href: "/settings/integrations", icon: Plug },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
