"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const router = useRouter();
  const user = useQuery(api.users.me);

  useEffect(() => {
    if (user?.role === "super_admin") {
      router.replace("/admin/users");
    } else if (user?.role === "academic_staff") {
      router.replace("/admin/abstracts");
    } else if (user?.role === "staff") {
      router.replace("/admin/announcements");
    }
  }, [router, user]);

  return <p>Opening your administration workspace…</p>;
}
