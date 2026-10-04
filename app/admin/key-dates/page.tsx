"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import { FormEvent, useState } from "react";

type Tone = "green" | "orange" | "red";

function KeyDateRow({ item }: { item: Doc<"keyDates"> }) {
  const update = useMutation(api.keyDates.update);
  const setPublishedMutation = useMutation(api.keyDates.setPublished);
  const remove = useMutation(api.keyDates.remove);
  const [displayDate, setDisplayDate] = useState(item.displayDate);
  const [title, setTitle] = useState(item.title);
  const [tone, setTone] = useState<Tone>(item.tone);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [published, setPublished] = useState(item.published);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await update({
        keyDateId: item._id,
        displayDate,
        title,
        tone,
        sortOrder: Number(sortOrder),
      });
      if (published !== item.published) {
        await setPublishedMutation({ keyDateId: item._id, published });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!window.confirm("Delete this key date?")) return;
    await remove({ keyDateId: item._id });
  }

  return (
    <tr>
      <td><input className={styles.field} value={displayDate} onChange={(event) => setDisplayDate(event.target.value)} /></td>
      <td><input className={styles.field} value={title} onChange={(event) => setTitle(event.target.value)} /></td>
      <td>
        <select className={styles.select} value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
          <option value="green">Green</option>
          <option value="orange">Orange</option>
          <option value="red">Red</option>
        </select>
      </td>
      <td><input className={styles.field} min="0" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></td>
      <td><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /></td>
      <td>
        <div className={styles.actions}>
          <Button className="green" disabled={saving} type="button" onClick={() => void save()}>Save</Button>
          <Button className="destructive" type="button" onClick={() => void deleteItem()}>Delete</Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminKeyDatesPage() {
  const keyDates = usePaginatedQuery(
    api.keyDates.listAdmin,
    {},
    { initialNumItems: 100 },
  );
  const create = useMutation(api.keyDates.create);
  const [error, setError] = useState("");

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await create({
        displayDate: String(form.get("displayDate") ?? ""),
        title: String(form.get("title") ?? ""),
        tone: String(form.get("tone") ?? "green") as Tone,
        sortOrder: Number(form.get("sortOrder") ?? 0),
        published: form.has("published"),
      });
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add key date.");
    }
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h1>Key dates</h1>
            <p>Control the ordered conference timeline shown on the homepage.</p>
          </div>
        </div>
        <form className={styles.formGrid} onSubmit={add}>
          <label>Date text<input required name="displayDate" className={styles.field} placeholder="10 March 2027" /></label>
          <label>Event title<input required name="title" className={styles.field} /></label>
          <label>Tone<select name="tone" className={styles.select}><option value="green">Green</option><option value="orange">Orange</option><option value="red">Red</option></select></label>
          <label>Order<input name="sortOrder" type="number" min="0" defaultValue="0" className={styles.field} /></label>
          <label><input name="published" type="checkbox" defaultChecked /> Published</label>
          <div className={styles.actions}><Button className="green" type="submit">Add key date</Button></div>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
      <section className={styles.card}>
        {keyDates.status === "LoadingFirstPage" ? (
          <LoadingScreen variant="inline" what="key dates" />
        ) : keyDates.results.length === 0 ? (
          <p className={styles.empty}>No key dates yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Event</th><th>Tone</th><th>Order</th><th>Published</th><th>Actions</th></tr></thead>
              <tbody>{keyDates.results.map((item) => <KeyDateRow key={item._id} item={item} />)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
