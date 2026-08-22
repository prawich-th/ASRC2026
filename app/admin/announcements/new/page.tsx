"use client";

import AnnouncementEditor, {
  AnnouncementEditorValue,
} from "@/components/admin/announcement-editor";
import styles from "@/components/admin/admin.module.scss";
import { api } from "@/convex/_generated/api";
import { parseAnnouncementTags } from "@/lib/announcementDisplay";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const create = useMutation(api.announcements.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(value: AnnouncementEditorValue) {
    setSaving(true);
    setError("");
    try {
      const announcement = await create({
        title: value.title,
        slug: value.slug,
        summary: value.summary,
        body: value.body,
        tags: parseAnnouncementTags(value.tagNames),
        authorName: value.authorName,
        authorTitle: value.authorTitle,
        departmentName: value.departmentName,
        departmentEmail: value.departmentEmail,
      });
      router.replace(`/admin/announcements/${announcement._id}/edit`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create announcement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>New announcement</h1>
          <p>Save a draft before publishing it to the public site.</p>
        </div>
      </div>
      <AnnouncementEditor saving={saving} error={error} onSave={save} />
    </div>
  );
}
