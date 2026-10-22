import Section from "@/components/layout/section";
import styles from "./home.module.scss";

// The dean's welcome message, parked until it is approved. Render
// <WelcomeMessage /> in app/page.tsx in place of the call for abstracts.
export default function WelcomeMessage() {
  return (
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
  );
}
