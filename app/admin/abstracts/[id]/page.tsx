"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyAbstractReviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    router.replace(`/admin/abstracts?selected=${encodeURIComponent(id)}`);
  }, [id, router]);

  return <p>Opening the abstract review queue…</p>;
}
