"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import Button from "@/components/form/button";
import styles from "./home.module.scss";

export default function UserAction() {
  const user = useQuery(api.users.me);
  if (user === undefined) {
    return null;
  }

  return (
    <Link href={user ? "/profile" : "/login"} className={styles.buttonLink}>
      <Button className="secondary" tabIndex={-1}>
        {user ? "My profile" : "Log in"}
      </Button>
    </Link>
  );
}
