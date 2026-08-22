"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import Button from "@/components/form/button";

export default function UserAction() {
  const user = useQuery(api.users.me);
  return (
    <div>
      {user ? (
        <Link href="/profile">
          <Button className={"primary"}>My Profile</Button>
        </Link>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </div>
  );
}
