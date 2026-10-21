import Footer from "@/components/layout/footer";
import type { Viewport } from "next";
import styles from "./home.module.scss";
import Button from "@/components/form/button";
import Link from "next/link";
import Countdown from "@/components/countdown";
import {
  HomeAnnouncements,
  HomeKeyDatesInline,
  HomeKeyDatesSection,
  HomeNextDate,
} from "./home-content";
import UserAction from "./useraction";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { bangkokToday } from "@/lib/keyDates";
import Section, { sectionStyles } from "@/components/layout/section";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfaf6",
};

const VENUE_QUERY = "อาคารเรียนและปฏิบัติการรวม มหาวิทยาลัยธรรมศาสตร์";

const LINK_CARDS = [
  {
    href: "/abstracts/submit",
    title: "Abstract submission",
    icon: "bx-clipboard-detail",
    tone: "green",
    ring: "ringBottom",
  },
  {
    href: "/guidelines",
    title: "Submission guidelines",
    icon: "bx-pen-alt",
    tone: "orange",
    ring: "ringTop",
  },
  {
    href: "/contact",
    title: "Contact us",
    icon: "bx-message",
    tone: "gray",
    ring: "ringBottomRight",
  },
] as const;

export default async function Home() {
  const preloadedKeyDates = await preloadQuery(api.keyDates.listPublished);
  const today = bangkokToday();

  return (
    <div className={sectionStyles.page}>
      {/* Every section is a direct child of <main> so grounds can alternate
          paper / paper-sunk by position, even when a thin section merges away. */}
      <main>
        <section className={styles.hero}>
          {/* Back to front: gray, orange, green. */}
          <div className={styles.heroRings} aria-hidden="true">
            <span className={`${styles.ring} ${styles.heroGray}`} />
            <span className={`${styles.ring} ${styles.heroOrange}`} />
            <span className={`${styles.ring} ${styles.heroGreen}`} />
          </div>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>
                Annual Student Research Conference 2027
              </p>
              <h1 className={styles.display}>
                Medical Interdisciplinary Advancement:
              </h1>
              <p className={styles.lead}>
                Bridging Knowledge, Innovation, and Patient Care
              </p>

              <Countdown />
              <HomeNextDate preloadedKeyDates={preloadedKeyDates} today={today} />

              <div className={styles.heroActions}>
                <Link href="/abstracts/submit" className={styles.buttonLink}>
                  <Button className="primary" tabIndex={-1}>
                    Submit an abstract
                  </Button>
                </Link>
                <UserAction />
              </div>
            </div>
            <img className={styles.dome} src="/home/dome.png" alt="" />
            {/* Keyline for the dome: drop the PNG's faint anti-alias pixels
                (alpha threshold) so nothing hazes, grow the strokes by 2px,
                and fill that in paper behind the drawing. No blur. */}
            <svg className={styles.svgDefs} aria-hidden="true" focusable="false">
              <filter id="dome-keyline" colorInterpolationFilters="sRGB">
                <feComponentTransfer in="SourceAlpha" result="solid">
                  <feFuncA type="discrete" tableValues="0 1 1 1" />
                </feComponentTransfer>
                <feMorphology
                  in="solid"
                  operator="dilate"
                  radius="2"
                  result="grown"
                />
                <feFlood floodColor="#fbfaf6" />
                <feComposite in2="grown" operator="in" result="keyline" />
                <feMerge>
                  <feMergeNode in="keyline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </svg>
          </div>
        </section>

        <Section strip>
          <p className={styles.dateStrip}>
            <strong>10 March 2027</strong>
            <span>
              Chulabhorn International College of Medicine, Thammasat University
            </span>
          </p>
        </Section>

        <Section>
          <div className={styles.linkCards}>
            {LINK_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`${styles.linkCard} ${styles[card.tone]} ${styles[card.ring]}`}
              >
                <span
                  className={`${styles.ring} ${styles.linkCardRing}`}
                  aria-hidden="true"
                />
                <i className={`bx ${card.icon}`} aria-hidden="true" />
                <h3>{card.title}</h3>
              </Link>
            ))}
          </div>
        </Section>

        {/* Its own band; a timeline too short to stand alone joins it. */}
        <Section>
          <HomeAnnouncements />
          <HomeKeyDatesInline />
        </Section>

        <HomeKeyDatesSection />

        <Section
          ring={{ color: "green", side: "left", level: "low" }}
          innerClassName={styles.welcome}
        >
          <h2>
            Welcome
            <br />
            message.
          </h2>
          <div className={styles.welcomeBody}>
            <p>Dear Students, Faculty Members, Researchers, and Guests,</p>
            <p>
              On behalf of the Chulabhorn International College of Medicine,
              Thammasat University, we are delighted to welcome you to ASRC
              2027. Research plays an essential role in the advancement of
              medicine. However, some of the most significant developments in
              healthcare emerge when knowledge from different disciplines comes
              together.
            </p>
            <p>
              Under this year&apos;s theme, “Medical Interdisciplinary
              Advancement: Bridging Knowledge, Innovation, and Patient Care,”
              ASRC 2027 invites students to explore research beyond conventional
              boundaries and consider how medicine can interact with science,
              technology, engineering, public health, behavioural sciences, and
              other disciplines.
            </p>
            <p>
              Through research presentations, academic discussions, and
              opportunities for collaboration, we hope ASRC will serve as a
              platform where young researchers can share their ideas, learn from
              one another, and develop the skills necessary to contribute
              meaningfully to the future of healthcare. We look forward to
              welcoming you to ASRC 2027 and celebrating the curiosity,
              creativity, and research achievements of our academic community.
            </p>
            <p className={styles.signoff}>
              <strong>Assistant Professor Peerapong Kitipawong, M.D.</strong>
              <span>Dean, Chulabhorn International College of Medicine</span>
            </p>
          </div>
        </Section>

        <Section ring={{ color: "gray", side: "right" }}>
          <h2>Venue.</h2>
          <div className={styles.venueGrid}>
            <div className={styles.venueMap}>
              <iframe
                title="Map of the Co-Operative Learning Centre, Thammasat University"
                src={`https://www.google.com/maps?q=${encodeURIComponent(VENUE_QUERY)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className={styles.venueInfo}>
              <h3>Co-Operative Learning Centre, Thammasat University</h3>
              <p className={styles.thai}>
                อาคารเรียนและปฏิบัติการรวม
                <br />
                มหาวิทยาลัยธรรมศาสตร์
              </p>
              <address className={styles.thai}>
                99/129 หมู่ 18 ถนนพหลโยธิน
                <br />
                ตำบลคลองหนึ่ง อำเภอคลองหลวง
                <br />
                จังหวัดปทุมธานี 12120
              </address>
              <a
                className={styles.textLink}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE_QUERY)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
