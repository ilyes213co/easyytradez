// ==============================
// types/nav.ts
// ==============================
export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};


// ==============================
// components/ui/UserAvatar.tsx
// ==============================
"use client";

type UserAvatarProps = {
  profile?: any;
  user?: any;
  size?: number;
};

export function UserAvatar({ profile, user, size = 32 }: UserAvatarProps) {
  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "M";

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email ?? "Marchand";

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={displayName}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white"
    >
      {initials}
    </div>
  );
}


// ==============================
// components/layout/NavItem.tsx
// ==============================
"use client";

import Link from "next/link";
import { NavItem as NavItemType } from "@/types/nav";

type Props = {
  item: NavItemType;
  active: boolean;
  onClick?: () => void;
};

export function NavItem({ item, active, onClick }: Props) {
  const isCreate = item.href === "/dashboard/create-store";

  const base =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all";

  const variant =
    isCreate && !active
      ? "text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 mt-1 mb-1"
      : active
      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
      : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]";

  return (
    <Link href={item.href} onClick={onClick} className={`${base} ${variant}`}>
      <span className={active || isCreate ? "text-indigo-400" : "text-white/30"}>
        {item.icon}
      </span>

      {item.label}

      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}


// ==============================
// components/layout/Sidebar.tsx
// ==============================
"use client";

import { usePathname, useRouter } from "next/navigation";
import { NavItem } from "./NavItem";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NavItem as NavItemType } from "@/types/nav";

type SidebarProps = {
  navItems: NavItemType[];
  user: any;
  profile: any;
  onSignOut: () => Promise<void>;
  onClose?: () => void;
};

export function Sidebar({
  navItems,
  user,
  profile,
  onSignOut,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    await onSignOut();
    router.push("/login");
  };

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email ?? "Marchand";

  return (
    <aside className="flex flex-col h-full bg-[#0d0d14] border-r border-white/[0.06] w-64 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <span className="font-semibold text-white text-sm tracking-tight">
          Marchand
        </span>

        {onClose && (
          <button
            aria-label="Fermer menu"
            onClick={onClose}
            className="ml-auto text-white/30 hover:text-white/60 lg:hidden"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item.href, item.exact)}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.06] p-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <UserAvatar profile={profile} user={user} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">
              {displayName}
            </p>
            <p className="text-xs text-white/30 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}


// ==============================
// app/dashboard/layout.tsx
// ==============================
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/components/auth/AuthProvider";
import { NavItem } from "@/types/nav";

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    exact: true,
    icon: <span>🏠</span>,
  },
  {
    href: "/dashboard/create-store",
    label: "Créer une boutique",
    icon: <span>➕</span>,
  },
  {
    href: "/dashboard/store",
    label: "Ma boutique",
    icon: <span>🏪</span>,
  },
  {
    href: "/dashboard/products",
    label: "Produits",
    icon: <span>📦</span>,
  },
  {
    href: "/dashboard/orders",
    label: "Commandes",
    icon: <span>🧾</span>,
  },
  {
    href: "/dashboard/stats",
    label: "Statistiques",
    icon: <span>📊</span>,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: <span>📈</span>,
  },
  {
    href: "/dashboard/delivery",
    label: "Livraison",
    icon: <span>🚚</span>,
  },
  {
    href: "/dashboard/settings",
    label: "Paramètres",
    icon: <span>⚙️</span>,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const currentPage =
    NAV_ITEMS.find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    )?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          navItems={NAV_ITEMS}
          user={user}
          profile={profile}
          onSignOut={signOut}
        />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 flex flex-col">
            <Sidebar
              navItems={NAV_ITEMS}
              user={user}
              profile={profile}
              onSignOut={signOut}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex items-center justify-between h-14 px-4 bg-[#0d0d14] border-b border-white/[0.06] lg:hidden">
          <button
            aria-label="Ouvrir menu"
            onClick={() => setSidebarOpen(true)}
            className="text-white/40 hover:text-white/70"
          >
            ☰
          </button>

          <span className="text-sm font-semibold text-white/80">
            {currentPage}
          </span>

          <div className="w-8" />
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-semibold text-white/80">
              {currentPage}
            </h2>
            <p className="text-xs text-white/30 mt-0.5">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}