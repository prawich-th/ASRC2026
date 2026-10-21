import type { Metadata } from "next";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "About Us | ASRC 2027",
  description:
    "Learn about ASRC, its objectives, and the interdisciplinary vision of ASRC 2027.",
};

const objectives = [
  {
    title: "Advance student research",
    body: "Encourage students to participate in research and develop projects that contribute to medical and scientific knowledge.",
  },
  {
    title: "Promote interdisciplinary collaboration",
    body: "Provide opportunities for students from different medical, scientific, technological, and healthcare disciplines to exchange ideas and work together.",
  },
  {
    title: "Develop academic and research skills",
    body: "Strengthen students’ abilities in scientific writing, research methodology, critical appraisal, data interpretation, and academic presentation.",
  },
  {
    title: "Encourage innovation in healthcare",
    body: "Support research and innovative ideas that may contribute to improvements in healthcare, medical education, technology, and patient outcomes.",
  },
  {
    title: "Build a research community",
    body: "Create connections between students, faculty members, researchers, and institutions that can lead to future academic and research collaborations.",
  },
];

export default function AboutUsPage() {
  return (
    <StaticPage title="About us" document split>
      <p>
        ASRC is an academic and research initiative of the Chulabhorn
        International College of Medicine (CICM), Thammasat University,
        created to provide students with a platform to develop, present, and
        exchange research ideas across medical and health-related disciplines.
      </p>
      <p>
        ASRC aims to foster a strong research culture within the CICM community
        by encouraging students to explore scientific questions, apply
        evidence-based thinking, and communicate their findings in a
        professional academic setting.
      </p>
      <p>
        Beyond presenting research, ASRC serves as a space where students,
        faculty members, researchers, and professionals can connect, exchange
        perspectives, and explore opportunities for future interdisciplinary
        collaboration.
      </p>

      <h2>ASRC objectives</h2>
      <p>ASRC aims to:</p>
      {objectives.map((objective) => (
        <section key={objective.title}>
          <h3>{objective.title}</h3>
          <p>{objective.body}</p>
        </section>
      ))}

      <h2>Theme and vision of ASRC 2027</h2>
      <h3>
        Medical Interdisciplinary Advancement: Bridging Knowledge, Innovation,
        and Patient Care
      </h3>
      <p>
        Modern medicine is no longer shaped by a single discipline. Advances
        in healthcare increasingly emerge from collaboration between medicine,
        biomedical sciences, public health, engineering, technology,
        artificial intelligence, behavioral sciences, and many other fields.
      </p>
      <p>
        The theme of ASRC 2027, “Medical Interdisciplinary Advancement,”
        reflects our vision of bringing these perspectives together to address
        increasingly complex challenges in healthcare.
      </p>
      <p>
        Through research, innovation, and interdisciplinary collaboration, ASRC
        2027 seeks to encourage students to look beyond traditional academic
        boundaries and explore how different fields can work together to
        advance medical knowledge and improve patient care.
      </p>

      <h2>Interdisciplinary academic community</h2>
      <p>
        ASRC brings together students, educators, researchers, and
        professionals with diverse academic backgrounds, creating an
        environment where different perspectives can contribute to solving
        medical and healthcare challenges.
      </p>

      <h2>Commitment to innovation and research</h2>
      <p>
        ASRC encourages participants to explore new ideas, technologies,
        research methods, and approaches that may contribute to the advancement
        of healthcare and medical science.
      </p>
      <p>
        Research presented at ASRC may range from fundamental and clinical
        sciences to public health, medical education, healthcare technology,
        artificial intelligence, engineering, and interdisciplinary
        innovation.
      </p>

      <h2>Networking and collaboration opportunities</h2>
      <p>
        ASRC is designed not only as a research presentation platform but also
        as an opportunity to connect.
      </p>
      <p>
        Participants can exchange ideas with fellow students, researchers,
        faculty members, and professionals, opening opportunities for
        mentorship, interdisciplinary projects, and future research
        collaborations.
      </p>
    </StaticPage>
  );
}
