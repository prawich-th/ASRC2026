"use client";

import Button from "@/components/form/button";
import styles from "./header.module.scss";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";

const NAV_LINKS = [
  { href: "/academics", label: "Academics" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/about-us", label: "About us" },
  { href: "/contact", label: "Contact" },
] as const;

export default function Header() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const accountRef = useRef<HTMLDivElement>(null);

  const user = useQuery(api.users.me);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  // The shared header survives navigation; menus belong to the current page.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setAccountOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeMenusOnLink(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("a")) {
      setMenuOpen(false);
      setAccountOpen(false);
    }
  }

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (
        !signingOut &&
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !signingOut) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, signingOut]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setAccountOpen(false);
      setMenuOpen(false);
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  const accountLabel = user
    ? user.firstName
      ? `${user.prefix ?? ""}${user.firstName.trim()}${user.suffix ? ` ${user.suffix}` : ""}`
      : user.email
    : null;

  const accountItems = user ? (
    <>
      {user.role ? (
        <Link className={styles.menuItem} role="menuitem" href="/admin">
          Administration
        </Link>
      ) : null}
      <Link className={styles.menuItem} role="menuitem" href="/profile">
        Profile
      </Link>
      <button
        className={`${styles.menuItem} ${styles.signOut}`}
        type="button"
        role="menuitem"
        disabled={signingOut}
        onClick={() => {
          void handleSignOut();
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </>
  ) : null;

  // Sign-in has its own full-page branding.
  if (pathname === "/login") {
    return null;
  }

  return (
    <header
      className={`${styles.header} ${scrolled || menuOpen ? styles.scrolled : ""}`}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.logos} aria-label="ASRC 2027 home">
          <img src="/thammasat.png" alt="Thammasat University" />
          <img src="/cicm.png" alt="CICM" />
          <img src="/smo.png" alt="SMO CICM" />
          <img src="/asrc.png" alt="ASRC" />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          {user === undefined ? (
            <span className={styles.accountPlaceholder} aria-hidden="true" />
          ) : user ? (
            <div className={styles.account} ref={accountRef}>
              <Button
                className="primary sm"
                type="button"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
              >
                {accountLabel}
              </Button>
              {accountOpen ? (
                <div
                  className={styles.popup}
                  role="menu"
                  aria-label="Account"
                  onClick={closeMenusOnLink}
                >
                  {accountItems}
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/login" className={styles.buttonLink}>
              <Button className="primary sm" tabIndex={-1}>
                Log in or register
              </Button>
            </Link>
          )}
        </nav>

        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i
            className={`bx ${menuOpen ? "bx-x" : "bx-menu"}`}
            aria-hidden="true"
          />
          <span className={styles.visuallyHidden}>
            {menuOpen ? "Close menu" : "Open menu"}
          </span>
        </button>
      </div>

      {menuOpen ? (
        <div
          className={styles.mobileMenu}
          id="site-menu"
          onClick={closeMenusOnLink}
        >
          <nav aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                className={styles.menuItem}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.mobileAccount}>
            {user ? (
              <>
                <p className={styles.accountName}>{accountLabel}</p>
                {accountItems}
              </>
            ) : user === null ? (
              <Link href="/login" className={styles.buttonLink}>
                <Button className="primary" tabIndex={-1}>
                  Log in or register
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
