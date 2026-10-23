"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import { errorMessage } from "@/components/mail/format";
import mailStyles from "@/components/mail/mail.module.scss";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

/**
 * Super admins set a staff member's committee position (used in mail
 * signatures) and choose which shared inboxes they can use.
 */
export default function MailInboxAssignments({
  userId,
  staffPosition,
}: {
  userId: Id<"users">;
  staffPosition?: string;
}) {
  const inboxes = useQuery(api.mail.listUserInboxes, { userId });
  const setMembership = useMutation(api.mail.setInboxMembership);
  const savePosition = useMutation(api.adminUsers.setStaffPosition);
  const [working, setWorking] = useState<Id<"mailInboxes"> | null>(null);
  const [position, setPosition] = useState(staffPosition ?? "");
  const [savingPosition, setSavingPosition] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const positionChanged = position.trim() !== (staffPosition ?? "");

  async function submitPosition(event: React.FormEvent) {
    event.preventDefault();
    setSavingPosition(true);
    setError("");
    setNotice("");
    try {
      await savePosition({ userId, staffPosition: position });
      setNotice("Position saved.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not save the position."));
    } finally {
      setSavingPosition(false);
    }
  }

  async function toggle(inboxId: Id<"mailInboxes">, assigned: boolean) {
    setWorking(inboxId);
    setError("");
    try {
      await setMembership({ userId, inboxId, assigned });
    } catch (caught) {
      setError(errorMessage(caught, "Could not update inbox access."));
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h2>Staff</h2>
          <p>Committee position and the shared inboxes this person can read and send from. Super admins can open every inbox.</p>
        </div>
      </div>
      <form className={mailStyles.positionForm} onSubmit={(event) => void submitPosition(event)}>
        <label>
          Committee position
          <input
            className={styles.field}
            type="text"
            maxLength={80}
            value={position}
            placeholder="e.g. Website Lead"
            onChange={(event) => {
              setPosition(event.target.value);
              setNotice("");
            }}
          />
        </label>
        <Button className="green" type="submit" disabled={savingPosition || !positionChanged}>
          {savingPosition ? "Saving…" : "Save position"}
        </Button>
      </form>
      <p className={styles.helperText}>Shown under their name in email signatures.</p>
      <h3 className={mailStyles.subheading}>Mail inboxes</h3>
      {inboxes === undefined ? null : inboxes.length === 0 ? (
        <p className={styles.helperText}>
          No inboxes are set up yet. Run <code>mailActions:ensureInboxes</code> on the deployment.
        </p>
      ) : (
        <ul className={mailStyles.assignmentList}>
          {inboxes.map((inbox) => (
            <li key={inbox._id}>
              <label>
                <input
                  type="checkbox"
                  checked={inbox.assigned}
                  disabled={working === inbox._id}
                  onChange={(event) => void toggle(inbox._id, event.target.checked)}
                />
                <span>
                  {inbox.name}
                  <small>{inbox.address}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.success}>{notice}</p> : null}
    </section>
  );
}
