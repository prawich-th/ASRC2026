"use client";

import AbstractReviewPanel from "@/components/admin/abstract-review-panel";
import styles from "@/components/admin/admin.module.scss";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminAbstractPage() {
  const { id } = useParams<{ id: string }>();
  const abstractId = id as Id<"abstracts">;

  return (
    <div className={styles.stack}>
      <p className={styles.backLink}>
        <Link href="/admin/abstracts/all">← All abstracts</Link>
      </p>
      <AbstractReviewPanel abstractId={abstractId} />
    </div>
  );
}
