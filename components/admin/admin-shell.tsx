"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./admin-shell.module.scss";

type StaffRole = "staff" | "academic_staff" | "super_admin";

function isStaffRole(role: string | undefined): role is StaffRole {
  return role === "staff" || role === "academic_staff" || role === "super_admin";
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || user === undefined) {
    return <LoadingScreen what="administration" />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingScreen what="sign in" />;
  }

  if (!isStaffRole(user.role)) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.state}>
          <div>
            <h1>Access restricted</h1>
            <p>Your account does not have access to the administration system.</p>
            <Link href="/">Return to the website</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canManageContent = user.role === "staff" || user.role === "super_admin";
  const canReviewAbstracts =
    user.role === "academic_staff" || user.role === "super_admin";
  const roleLabel = user.role.replace("_", " ");

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Administration.</h1>
          <p>
            {roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} workspace
          </p>
        </div>
      </section>
      <main className={styles.main}>
        <nav className={styles.nav} aria-label="Administration sections">
          {user.role === "super_admin" ? (
            <Link aria-current={pathname === "/admin/users" ? "page" : undefined} href="/admin/users">
              Users
            </Link>
          ) : null}
          {canReviewAbstracts ? (
            <Link
              aria-current={pathname.startsWith("/admin/abstracts") ? "page" : undefined}
              href="/admin/abstracts"
            >
              Abstracts
            </Link>
          ) : null}
          {canManageContent ? (
            <>
              <Link
                aria-current={pathname.startsWith("/admin/announcements") ? "page" : undefined}
                href="/admin/announcements"
              >
                Announcements
              </Link>
              <Link
                aria-current={pathname.startsWith("/admin/key-dates") ? "page" : undefined}
                href="/admin/key-dates"
              >
                Key dates
              </Link>
            </>
          ) : null}
        </nav>
        <div className={styles.content}>{children}</div>
      </main>
      <Footer />
    </div>
  );
}
