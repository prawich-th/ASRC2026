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

  const isAbstractDetail =
    pathname.startsWith("/admin/abstracts/") &&
    pathname !== "/admin/abstracts/all";

  return (
    <nav className={styles.subnav} aria-label="Abstract administration">
      {abstractPages.map((page) => {
        const isActive =
          page.href === "/admin/abstracts"
            ? pathname === page.href
            : pathname === page.href || isAbstractDetail;

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
