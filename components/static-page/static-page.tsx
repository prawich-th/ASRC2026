import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import Footer from "@/components/layout/footer";
import Section, {
  type SectionRing,
  sectionStyles,
} from "@/components/layout/section";
import styles from "./static-page.module.scss";

type StaticPageProps = {
  title: string;
  eyebrow?: string;
  /** Lead paragraph shown under the title. */
  intro?: ReactNode;
  ring?: SectionRing;
  /** Long-form text people read as a document: shown on a white sheet. */
  document?: boolean;
  /**
   * Give every h2 topic its own section band. Grounds alternate, the h2
   * becomes the section title, and anything before the first h2 joins the
   * page head as its intro.
   */
  split?: boolean;
  children: ReactNode;
};

// Section rings rotate orange, green, grey, switching side and height.
const RING_ROTATION: SectionRing[] = [
  { color: "orange", side: "right", level: "high" },
  { color: "green", side: "left", level: "low" },
  { color: "gray", side: "right" },
];

type Heading = ReactElement<{ children?: ReactNode }>;
type Topic = { heading?: Heading; body: ReactNode[] };

function isHeading(node: ReactNode): node is Heading {
  return isValidElement(node) && node.type === "h2";
}

function isList(node: ReactNode) {
  return isValidElement(node) && (node.type === "ul" || node.type === "ol");
}

function splitTopics(children: ReactNode) {
  const lead: ReactNode[] = [];
  const topics: Topic[] = [];
  for (const child of Children.toArray(children)) {
    if (isHeading(child)) {
      topics.push({ heading: child, body: [] });
    } else if (topics.length > 0) {
      topics[topics.length - 1].body.push(child);
    } else {
      lead.push(child);
    }
  }
  // Only the first opening paragraph is the intro; any more open the page as
  // an untitled first topic so the head stays one short lead.
  if (lead.length > 1) {
    topics.unshift({ body: lead.slice(1) });
  }
  return { lead: lead.slice(0, 1), topics };
}

/**
 * Sections under about 240px tall carry no ring. Without measuring, treat a
 * topic as tall enough when it has a list or at least three blocks.
 */
function isTallEnough(topic: Topic) {
  return topic.body.length >= 3 || topic.body.some(isList);
}

export default function StaticPage({
  title,
  eyebrow,
  intro,
  ring = { color: "orange", side: "right", level: "high" },
  document = false,
  split = false,
  children,
}: StaticPageProps) {
  const { lead, topics } = split
    ? splitTopics(children)
    : { lead: [], topics: [] };
  const articleClass = `${styles.article} ${document ? styles.sheet : ""}`;
  let ringIndex = 0;

  return (
    <div className={sectionStyles.page}>
      <main>
        <Section innerClassName={styles.head}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h1>{title}.</h1>
            {intro ? <p className={styles.intro}>{intro}</p> : null}
            {lead.length > 0 ? (
              <div className={styles.lead}>{lead}</div>
            ) : null}
          </div>
        </Section>
        {split ? (
          topics.map((topic, index) => {
            const topicRing = isTallEnough(topic)
              ? RING_ROTATION[ringIndex++ % RING_ROTATION.length]
              : undefined;
            return (
              <Section key={index} ring={topicRing}>
                {topic.heading ? (
                  <h2>{topic.heading.props.children}.</h2>
                ) : null}
                <article className={`${articleClass} ${styles.topic}`}>
                  {topic.body}
                </article>
              </Section>
            );
          })
        ) : (
          <Section ring={ring}>
            <article className={articleClass}>{children}</article>
          </Section>
        )}
      </main>
      <Footer />
    </div>
  );
}
