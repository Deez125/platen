import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  Palette,
  Plug,
  ShieldAlert,
  Tag,
  User,
  Users,
} from "lucide-react";

export type SettingsNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Render the link in destructive (red) styling — e.g. the danger zone. */
  danger?: boolean;
  /** Minimum role to access this item. Undefined = everyone (personal). */
  minRole?: "admin" | "owner";
};

export type SettingsNavSection = {
  label: string;
  items: SettingsNavItem[];
};

export const settingsSections: SettingsNavSection[] = [
  {
    label: "Personal",
    items: [
      { label: "Account", href: "/settings", icon: User },
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "General", href: "/settings/organization", icon: Building2, minRole: "admin" },
      { label: "Branding", href: "/settings/branding", icon: Palette, minRole: "admin" },
      { label: "Team", href: "/settings/team", icon: Users, minRole: "admin" },
      { label: "Pricing rules", href: "/settings/pricing-rules", icon: Tag, minRole: "admin" },
      {
        label: "Document templates",
        href: "/settings/document-templates",
        icon: FileText,
        minRole: "admin",
      },
      { label: "Integrations", href: "/settings/integrations", icon: Plug, minRole: "admin" },
      { label: "Billing", href: "/settings/billing", icon: CreditCard, minRole: "owner" },
      {
        label: "Danger zone",
        href: "/settings/danger-zone",
        icon: ShieldAlert,
        danger: true,
        minRole: "owner",
      },
    ],
  },
];
