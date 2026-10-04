"use client";

import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { getRoleLabel } from "@/lib/adminRoles";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./dashboard-shell.module.scss";

type StaffRole = "staff" | "academic_staff" | "super_admin";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  isActive: (pathname: string) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function isStaffRole(role: string | undefined): role is StaffRole {
  return (
    role === "staff" || role === "academic_staff" || role === "super_admin"
  );
}

function exact(href: string) {
  return (pathname: string) => pathname === href;
}

function startsWith(href: string) {
  return (pathname: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
}

function buildNavGroups(role: StaffRole | undefined): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "My account",
      items: [
        {
          href: "/profile",
          label: "Profile",
          icon: "bx-user",
          isActive: exact("/profile"),
        },
        {
          href: "/profile/abstracts",
          label: "My abstracts",
          icon: "bx-file",
          isActive: exact("/profile/abstracts"),
        },
        {
          href: "/abstracts/submit",
          label: "Submit an abstract",
          icon: "bx-plus-circle",
          isActive: exact("/abstracts/submit"),
        },
      ],
    },
  ];

  if (!role) {
    return groups;
  }

  const admin: NavItem[] = [];
  if (role === "super_admin") {
    admin.push({
      href: "/admin/users",
      label: "Users",
      icon: "bx-group",
      isActive: startsWith("/admin/users"),
    });
  }
  if (role === "academic_staff" || role === "super_admin") {
    admin.push(
      {
        href: "/admin/abstracts",
        label: "Review queue",
        icon: "bx-clipboard-detail",
        isActive: exact("/admin/abstracts"),
      },
      {
        href: "/admin/abstracts/all",
        label: "All abstracts",
        icon: "bx-list-ul",
        isActive: (pathname) => pathname.startsWith("/admin/abstracts/"),
      },
    );
  }
  if (role === "staff" || role === "super_admin") {
    admin.push(
      {
        href: "/admin/announcements",
        label: "Announcements",
        icon: "bx-bell",
        isActive: startsWith("/admin/announcements"),
      },
      {
        href: "/admin/key-dates",
        label: "Key dates",
        icon: "bx-calendar",
        isActive: startsWith("/admin/key-dates"),
      },
    );
  }
  groups.push({ label: "Administration", items: admin });
  return groups;
}

const COLLAPSED_STORAGE_KEY = "asrc.dashboard.sidebarCollapsed";

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the toggle still works.
  }
}

function getInitials(user: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}): string {
  const parts = [user.firstName, user.lastName].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  if (parts.length === 0) {
    parts.push(...(user.name ?? user.email ?? "User").trim().split(/\s+/));
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function DashboardShell({
  children,
  staffOnly = false,
}: {
  children: React.ReactNode;
  /** Restrict the page to staff roles (administration pages). */
  staffOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const [menuOpen, setMenuOpen] = useState(false);
  // The sidebar only renders after auth resolves on the client, so reading
  // storage during the first render cannot cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && readCollapsedPreference(),
  );
  const [menuPath, setMenuPath] = useState(pathname);

  // Close the mobile menu after navigating to another section.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      writeCollapsedPreference(!current);
      return !current;
    });
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || user === undefined) {
    return <LoadingScreen what="your dashboard" />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingScreen what="sign in" />;
  }

  const role = isStaffRole(user.role) ? user.role : undefined;
  const groups = buildNavGroups(role);
  const activeItem = groups
    .flatMap((group) => group.items)
    .find((item) => item.isActive(pathname));
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email ||
    "Your account";

  return (
    <div className={styles.page}>
      <Header />
      <div className={`${styles.layout} ${collapsed ? styles.collapsed : ""}`}>
        <aside className={styles.sidebar}>
          <button
            className={styles.collapseToggle}
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="dashboard-nav"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            <i
              className={`bx ${collapsed ? "bx-chevrons-right" : "bx-chevrons-left"}`}
              aria-hidden="true"
            />
          </button>
          <div
            className={styles.identity}
            title={collapsed ? displayName : undefined}
          >
            {user.image ? (
              // Convex storage URLs can be signed and should load directly.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.avatar} src={user.image} alt="" />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {getInitials(user)}
              </span>
            )}
            <div className={styles.identityText}>
              <strong>{displayName}</strong>
              <span>{getRoleLabel(role)}</span>
            </div>
          </div>

          <button
            className={styles.menuToggle}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="dashboard-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span>
              <i
                className={`bx ${activeItem?.icon ?? "bx-menu"}`}
                aria-hidden="true"
              />
              {activeItem?.label ?? "Menu"}
            </span>
            <i
              className={`bx ${menuOpen ? "bx-chevron-up" : "bx-chevron-down"}`}
              aria-hidden="true"
            />
          </button>

          <nav
            id="dashboard-nav"
            className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}
            aria-label="Dashboard"
          >
            {groups.map((group) => (
              <div key={group.label} className={styles.group}>
                <p className={styles.groupLabel}>{group.label}</p>
                <ul>
                  {group.items.map((item) => {
                    const active = item === activeItem;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={styles.link}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? item.label : undefined}
                        >
                          <i className={`bx ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className={styles.group}>
              <ul>
                <li>
                  <Link
                    href="/"
                    className={styles.link}
                    title={collapsed ? "Back to website" : undefined}
                  >
                    <i className="bx bx-home" aria-hidden="true" />
                    <span>Back to website</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <main className={styles.content}>
          {staffOnly && !role ? (
            <div className={styles.restricted}>
              <i className="bx bx-lock" aria-hidden="true" />
              <h1>Access restricted</h1>
              <p>
                Your account does not have access to the administration system.
              </p>
              <Link href="/profile">Go to your profile</Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
