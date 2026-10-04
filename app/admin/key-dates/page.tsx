"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";

type Tone = "green" | "orange" | "red";

function KeyDateRow({
  item,
  position,
}: {
  item: Doc<"keyDates">;
  position: number;
}) {
  const update = useMutation(api.keyDates.update);
  const setPublishedMutation = useMutation(api.keyDates.setPublished);
  const remove = useMutation(api.keyDates.remove);
  const [displayDate, setDisplayDate] = useState(item.displayDate);
  const [title, setTitle] = useState(item.title);
  const [tone, setTone] = useState<Tone>(item.tone);
  const [published, setPublished] = useState(item.published);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const dirty =
    displayDate !== item.displayDate ||
    title !== item.title ||
    tone !== item.tone ||
    published !== item.published;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await update({
        keyDateId: item._id,
        displayDate,
        title,
        tone,
      });
      if (published !== item.published) {
        await setPublishedMutation({ keyDateId: item._id, published });
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save key date.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!window.confirm("Delete this key date?")) return;
    await remove({ keyDateId: item._id });
  }

  return (
    <li
      ref={setNodeRef}
      className={`${styles.sortableRow} ${isDragging ? styles.dragging : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        ref={setActivatorNodeRef}
        className={styles.dragHandle}
        type="button"
        aria-label={`Reorder ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <i className="bx bx-grid-vertical" aria-hidden="true" />
      </button>
      <span className={`${styles.sortablePosition} ${styles[tone]}`}>
        {position}
      </span>
      <div className={styles.sortableFields}>
        <label>
          Date text
          <input
            className={styles.field}
            value={displayDate}
            onChange={(event) => setDisplayDate(event.target.value)}
          />
        </label>
        <label>
          Event title
          <input
            className={styles.field}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Tone
          <select
            className={styles.select}
            value={tone}
            onChange={(event) => setTone(event.target.value as Tone)}
          >
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="red">Red</option>
          </select>
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          Published
        </label>
      </div>
      <div className={styles.actions}>
        <Button
          className="green"
          disabled={saving || !dirty}
          type="button"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          className="destructive"
          type="button"
          onClick={() => void deleteItem()}
        >
          Delete
        </Button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </li>
  );
}

export default function AdminKeyDatesPage() {
  const keyDates = useQuery(api.keyDates.listAdmin);
  const create = useMutation(api.keyDates.create);
  const reorder = useMutation(api.keyDates.reorder).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.keyDates.listAdmin, {});
      if (!current) return;
      const byId = new Map(current.map((item) => [item._id, item]));
      const reordered = args.keyDateIds.flatMap((id, index) => {
        const item = byId.get(id);
        return item ? [{ ...item, sortOrder: index }] : [];
      });
      localStore.setQuery(api.keyDates.listAdmin, {}, reordered);
    },
  );
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await create({
        displayDate: String(form.get("displayDate") ?? ""),
        title: String(form.get("title") ?? ""),
        tone: String(form.get("tone") ?? "green") as Tone,
        published: form.has("published"),
      });
      formElement.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add key date.",
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!keyDates || !over || active.id === over.id) return;
    const ids = keyDates.map((item) => item._id);
    const from = ids.indexOf(active.id as Id<"keyDates">);
    const to = ids.indexOf(over.id as Id<"keyDates">);
    if (from === -1 || to === -1) return;
    setError("");
    try {
      await reorder({ keyDateIds: arrayMove(ids, from, to) });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the new order.",
      );
    }
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h1>Key dates</h1>
            <p>
              Control the ordered conference timeline shown on the homepage.
            </p>
          </div>
        </div>
        <form className={styles.formGrid} onSubmit={add}>
          <label>
            Date text
            <input
              required
              name="displayDate"
              className={styles.field}
              placeholder="10 March 2027"
            />
          </label>
          <label>
            Event title
            <input required name="title" className={styles.field} />
          </label>
          <label>
            Tone
            <select name="tone" className={styles.select}>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label>
            <input name="published" type="checkbox" defaultChecked /> Published
          </label>
          <div className={styles.actions}>
            <Button className="green" type="submit">
              Add key date
            </Button>
          </div>
        </form>
        <p className={styles.helperText}>
          New key dates are added to the end of the timeline.
        </p>
      </section>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h2>Timeline order</h2>
            <p>
              Drag a row by its handle to reorder. Keyboard: focus the handle,
              press Space, use the arrow keys, then Space again. The order saves
              automatically.
            </p>
          </div>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        {keyDates === undefined ? (
          <LoadingScreen variant="inline" what="key dates" />
        ) : keyDates.length === 0 ? (
          <p className={styles.empty}>No key dates yet.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => void handleDragEnd(event)}
          >
            <SortableContext
              items={keyDates.map((item) => item._id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className={styles.sortableList}>
                {keyDates.map((item, index) => (
                  <KeyDateRow key={item._id} item={item} position={index + 1} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
