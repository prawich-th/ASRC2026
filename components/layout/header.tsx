"use client";

import Button from "@/components/form/button";
import styles from "./header.module.scss";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";

export default function Header() {
  const isPhone = useMediaQuery({ query: "(max-width: 600px)" });
  const { signOut } = useAuthActions();
  const router = useRouter();
  const accountRef = useRef<HTMLDivElement>(null);

  const user = useQuery(api.users.me);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  function goToProfile() {
    setAccountOpen(false);
    router.push("/profile");
  }

  function goToAdmin() {
    setAccountOpen(false);
    router.push("/admin");
  }

  if (!isMounted) {
    return (
      <header className={styles.header} style={{ height: "4rem" }}></header>
    );
  }

  return (
    <header className={styles.header}>
      {isPhone ? (
        <Link href="/">
          <div className={styles.phone + " " + styles.left}>
            <img
              className={styles.logo}
              src="/thammasat.png"
              alt="Thammasat University"
            />
            <img className={styles.logo} src="/cicm.png" alt="CICM" />
            <img className={styles.logo} src="/smo.png" alt="logo" />
            <img className={styles.logo} src="/asrc.png" alt="logo" />
          </div>
        </Link>
      ) : (
        <>
          <Link href="/">
            <div className={styles.left}>
              <img
                className={styles.logo}
                src="/thammasat.png"
                alt="Thammasat University"
              />
              <img className={styles.logo} src="/cicm.png" alt="CICM" />
              <img className={styles.logo} src="/smo.png" alt="logo" />
              <img className={styles.logo} src="/asrc.png" alt="logo" />
            </div>
          </Link>
          <div className={styles.right}>
            <span>
              <Link href="/academics">Academics</Link>
            </span>
            <span>
              <Link href="/guidelines">Guidelines</Link>
            </span>
            <span>
              <Link href="/about-us">About Us</Link>
            </span>
            {user ? (
              <div className={styles.account} ref={accountRef}>
                <Button
                  className={"primary"}
                  type="button"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  {user.firstName
                    ? `${user.prefix ?? ""}${user.firstName.trim()}${user.suffix ? ` ${user.suffix}` : ""}`
                    : user.email}
                </Button>
                {accountOpen ? (
                  <div
                    className={styles.popup}
                    role="menu"
                    aria-label="Account"
                  >
                    {user.role ? (
                      <Button
                        className={"action"}
                        type="button"
                        role="menuitem"
                        disabled={signingOut}
                        onClick={goToAdmin}
                      >
                        Administration
                      </Button>
                    ) : null}
                    <Button
                      className={"green"}
                      type="button"
                      role="menuitem"
                      disabled={signingOut}
                      onClick={goToProfile}
                    >
                      Profile
                    </Button>
                    <Button
                      className={"destructive"}
                      type="button"
                      role="menuitem"
                      disabled={signingOut}
                      onClick={() => {
                        void handleSignOut();
                      }}
                    >
                      {signingOut ? "Signing out…" : "Sign Out"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/login">
                <Button className={"primary"}>Login / Register</Button>
              </Link>
            )}
          </div>
        </>
      )}
    </header>
  );
}
