import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import styles from "./home.module.scss";
import Button from "@/components/form/button";
import Link from "next/link";
import Countdown from "@/components/countdown";
import { HeroKeyDates, HomeAnnouncements, HomeKeyDates } from "./home-content";

import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import UserAction from "./useraction";

export default function Home() {
  const user = fetchQuery(api.users.me);
  console.log(user);

  return (
    <>
      <Header />
      <div className={styles.hero}>
        <p>Annual Student Research Conference</p>
        <h2 className={styles.name}>
          Medical <br />
          Interdisciplinary <br />
          Advancement: <br />
        </h2>
        <p className={styles.subtitle}>
          Bridging Knowledge, Innovation, and Patient Care
        </p>

        <img src="/home/dome.png" alt="tu-dome" />

        <Countdown />

        <div className={styles.actions}>
          <Link href="/abstracts/submit">
            <Button className={"primary"}>Submit an Abstract</Button>
          </Link>
          <UserAction />
        </div>

        <HeroKeyDates />

        <div className={styles.arcs}>
          <div className={styles.orange}></div>
          <div className={styles.green}></div>
          <div className={styles.gray}></div>
        </div>
      </div>
      <div className={styles.info}>
        <div className={styles.date}>
          <p>10 March 2027</p>
        </div>
        <div className={styles.location}>
          <p>
            Chulabhorn International College of Medicine, Thammasat University
          </p>
        </div>
      </div>
      <main className={styles.main}>
        <div className={styles.actions + " " + styles.mainPadding}>
          <Link href="/abstracts/submit">
            <div className={styles.card + " " + styles.first}>
              <span>
                <p>
                  Abstract <br />
                  Submission
                </p>
              </span>
              <span className={styles.icon}>
                <i className="bx bx-clipboard-detail"></i>
              </span>
            </div>
          </Link>
          <Link href="/guidelines">
            <div className={styles.card + " " + styles.second}>
              <span>
                <p>
                  Submission <br />
                  Guidelines
                </p>
              </span>
              <span className={styles.icon}>
                <i className="bx bx-pen-alt"></i>
              </span>
            </div>
          </Link>
          <Link href="/contact">
            <div className={styles.card + " " + styles.third}>
              <span>
                <p>Contact Us</p>
              </span>
              <span className={styles.icon}>
                <i className="bx bx-message"></i>
              </span>
            </div>
          </Link>
        </div>

        <div className={styles.sectionHeader + " " + styles.mainPadding}>
          <h2>Announcements.</h2>
          <Link href={"/announcements"}>View All</Link>
        </div>
        <HomeAnnouncements />

        <div className={styles.whiteContainer}>
          <section id="key-dates" className={styles.keyDatesSection}>
            <div className={styles.sectionHeader + " " + styles.mainPadding}>
              <h2>Key Dates.</h2>
            </div>
            <HomeKeyDates />
            <div className={styles.keyDatesArc} aria-hidden="true" />
          </section>
        </div>

        <section className={styles.dean}>
          <div className={styles.deanInner + " " + styles.mainPadding}>
            <aside className={styles.deanAside}>
              <h2>
                Welcome
                <br />
                message.
              </h2>
              <div className={styles.deanPhoto} aria-hidden="true" />
            </aside>
            <div className={styles.deanBody}>
              <p>
                Dear Students, Faculty Members, Researchers, and Guests,
                <br />
                <br />
                On behalf of the Chulabhorn International College of Medicine,
                Thammasat University, we are delighted to welcome you to ASRC
                2026. Research plays an essential role in the advancement of
                medicine. However, some of the most significant developments in
                healthcare emerge when knowledge from different disciplines
                comes together. Under this year's theme, “Medical
                Interdisciplinary Advancement: Bridging Knowledge, Innovation,
                and Patient Care,” ASRC 2026 invites students to explore
                research beyond conventional boundaries and consider how
                medicine can interact with science, technology, engineering,
                public health, behavioral sciences, and other disciplines.
                Through research presentations, academic discussions, and
                opportunities for collaboration, we hope ASRC will serve as a
                platform where young researchers can share their ideas, learn
                from one another, and develop the skills necessary to contribute
                meaningfully to the future of healthcare. We look forward to
                welcoming you to ASRC 2026 and celebrating the curiosity,
                creativity, and research achievements of our academic community.
              </p>
              <p className={styles.deanSignoff}>
                Name
                {/* Assistant Professor Peerapong Kitipawong, M.D., Dean */}
              </p>
            </div>
          </div>
        </section>

        <div className={styles.whiteContainer}>
          <section className={styles.venue}>
            <div className={styles.venueInner + " " + styles.mainPadding}>
              <h2>Venue.</h2>
              <div className={styles.venueGrid}>
                <div className={styles.venuePhoto} aria-hidden="true" />
                <div className={styles.venueInfo}>
                  <h3>
                    Co-Operative Learning Centre
                    <br />
                    Thammasat University
                  </h3>
                  <p className={styles.venueThai}>
                    อาคารเรียนและปฏิบัติการรวม
                    <br />
                    มหาวิทยาลัยธรรมศาสตร์
                  </p>
                  <p className={styles.venueAddress}>
                    99/129 หมู่ 18 ถนนพหลโยธิน
                    <br />
                    ตำบลคลองหนึ่ง อำเภอคลองหลวง
                    <br />
                    จังหวัดปทุมธานี 12120
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.venueArcTop} aria-hidden="true" />
            <div className={styles.venueArcBottom} aria-hidden="true" />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
