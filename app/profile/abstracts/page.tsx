"use client";

import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import {
  getAbstractStatusLabel,
  getAbstractStatusTone,
  getCategoryLabel,
} from "@/lib/abstractDisplay";
import { useQuery } from "convex/react";
import Link from "next/link";
import styles from "../profile.module.scss";

export default function MyAbstractsPage() {
  const abstracts = useQuery(api.abstracts.listMine);

  return (
    <div className={styles.inner}>
      <div className={styles.pageHeader}>
        <div>
          <h1>My abstracts</h1>
          <p>Drafts, submissions and review decisions for your abstracts.</p>
        </div>
        <Link href="/abstracts/submit">
          <Button className="primary" type="button">
            Submit New
          </Button>
        </Link>
      </div>

      <section className={styles.card}>
        {abstracts === undefined ? (
          <LoadingScreen variant="inline" what="your abstracts" />
        ) : abstracts.length === 0 ? (
          <p className={styles.emptyState}>
            You have not created any abstracts yet.
          </p>
        ) : (
          <ul className={styles.abstractList}>
            {abstracts.map((abstract) => {
              const tone = getAbstractStatusTone(abstract.status);
              return (
                <li key={abstract._id} className={styles.abstractItem}>
                  <div className={`${styles.status} ${styles[tone]}`}>
                    {getAbstractStatusLabel(abstract.status)}
                  </div>
                  <div className={styles.content}>
                    <span className={styles.category}>
                      {getCategoryLabel(abstract.category)}
                    </span>
                    <h3>{abstract.title}</h3>
                  </div>
                  <Link
                    href={`/abstracts/${abstract._id}`}
                    className={styles.chevron}
                    aria-label={`View ${abstract.title}`}
                  >
                    <i className="bx bx-chevron-right" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
