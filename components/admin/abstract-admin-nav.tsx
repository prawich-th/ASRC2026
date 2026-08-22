"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.scss";

const abstractPages = [
  { href: "/admin/abstracts", label: "Review queue" },
  { href: "/admin/abstracts/all", label: "All abstracts" },
] as const;

export default function AbstractAdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.subnav} aria-label="Abstract administration">
      {abstractPages.map((page) => {
        const isAbstractDetail =
          pathname.startsWith("/admin/abstracts/") &&
          pathname !== "/admin/abstracts/all";
        const isActive =
          page.href === "/admin/abstracts"
            ? pathname === page.href
            : page.href === "/admin/abstracts/all"
              ? pathname === page.href || isAbstractDetail
              : pathname.startsWith(page.href);

        return (
          <Link
            key={page.href}
            aria-current={isActive ? "page" : undefined}
            href={page.href}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
