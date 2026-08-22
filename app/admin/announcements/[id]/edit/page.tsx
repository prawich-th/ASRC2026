"use client";

import AnnouncementEditor, {
  AnnouncementEditorValue,
} from "@/components/admin/announcement-editor";
import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  announcementTagsToInput,
  parseAnnouncementTags,
} from "@/lib/announcementDisplay";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function EditAnnouncementPage() {
  const { id } = useParams<{ id: string }>();
  const announcementId = id as Id<"announcements">;
  const announcement = useQuery(api.announcements.getAdminById, {
    announcementId,
  });
  const update = useMutation(api.announcements.update);
  const publish = useMutation(api.announcements.publish);
  const unpublish = useMutation(api.announcements.unpublish);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(value: AnnouncementEditorValue) {
    setSaving(true);
    setError("");
    try {
      await update({
        announcementId,
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication() {
    if (!announcement) return;
    setSaving(true);
    setError("");
    try {
      if (announcement.status === "published") {
        await unpublish({ announcementId });
      } else {
        await publish({ announcementId });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update publication.");
    } finally {
      setSaving(false);
    }
  }

  if (announcement === undefined) {
    return <LoadingScreen variant="inline" what="announcement" />;
  }
  if (announcement === null) {
    return <p className={styles.empty}>Announcement not found.</p>;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>Edit announcement</h1>
          <p>
            Current status: <strong>{announcement.status}</strong>
          </p>
        </div>
        <Button
          className={announcement.status === "published" ? "action" : "green"}
          type="button"
          onClick={() => void togglePublication()}
          disabled={saving}
        >
          {announcement.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </div>
      <AnnouncementEditor
        initialValue={{
          title: announcement.title,
          slug: announcement.slug,
          summary: announcement.summary,
          body: announcement.body,
          tagNames: announcementTagsToInput(announcement.tags),
          authorName: announcement.authorName ?? "",
          authorTitle: announcement.authorTitle ?? "",
          departmentName: announcement.departmentName ?? "",
          departmentEmail: announcement.departmentEmail ?? "",
        }}
        saving={saving}
        error={error}
        onSave={save}
      />
    </div>
  );
}
