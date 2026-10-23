import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "Academics | ASRC 2027",
  description:
    "The scientific and educational program of ASRC 2027: theme, research tracks, presentations, speakers, judging, schedule, and awards.",
};

export default function AcademicsPage() {
  return (
    <StaticPage title="Academics" document split>
      <p>
        The Academic Committee is responsible for developing and coordinating
        the scientific and educational program of ASRC 2027. In line with this
        year’s theme, <em>“Medical Interdisciplinary Advancement: Bridging
        Knowledge, Innovation, and Patient Care,”</em> the committee aims to
        create an academic platform that encourages medical students to
        explore research across disciplines, exchange scientific knowledge,
        and consider how research and innovation can contribute to better
        patient care.
      </p>

      <h2>Conference theme and scientific focus</h2>
      <p>
        ASRC 2027 explores the role of interdisciplinary collaboration in
        advancing medical knowledge, scientific innovation, and patient care.
        The conference highlights the connections between medicine and other
        fields, including science, technology, engineering, public health, and
        behavioural sciences. Through the exchange of research and ideas, the
        conference encourages participants to explore new perspectives and
        consider how interdisciplinary approaches can address current
        challenges in healthcare.
      </p>

      <h2>Research tracks and disciplines</h2>
      <p>
        The conference welcomes student research across a range of medical and
        related disciplines, providing opportunities for participants to share
        diverse research interests and perspectives. The academic program
        accommodates research from basic medical sciences, clinical medicine,
        public health, biomedical innovation, and other relevant
        interdisciplinary fields.
      </p>
      <p>
        The research categories are described in the{" "}
        <Link href="/guidelines">Academic Guidelines</Link>.
      </p>

      <h2>Oral and poster presentation sessions</h2>
      <p>
        ASRC 2027 provides students with opportunities to present their
        research through oral and poster presentations, allowing participants
        to communicate their findings in different formats and engage with the
        academic community.
      </p>
      <h3>Oral presentations</h3>
      <p>
        Oral presentations provide a platform for selected students to present
        their research findings to an audience, explain their methodology and
        conclusions, and respond to questions from judges and attendees.
        Selection for oral presentation is based on the conference’s
        evaluation process. These sessions encourage scientific communication,
        critical thinking, and the ability to convey research effectively.
      </p>
      <h3>Poster presentations</h3>
      <p>
        Poster presentations allow students to present their research in a
        visual format and discuss their findings directly with attendees.
        These sessions promote interactive scientific exchange, encourage
        questions and feedback, and provide opportunities for participants to
        learn from research conducted across different disciplines.
      </p>
      <p>
        Both presentation formats aim to foster academic discussion,
        strengthen students’ research communication skills, and encourage the
        exchange of ideas among aspiring physician-researchers.
      </p>

      <h2>Keynote speakers and guest lecturers</h2>
      <p>
        Invited speakers and guest lecturers contribute to the academic
        program by sharing their expertise, research experiences, and
        perspectives on developments in medical science. Their contributions
        provide participants with opportunities to explore emerging research
        directions, understand the value of interdisciplinary collaboration,
        and gain insight into the role of research in improving healthcare.
      </p>
      <p>
        <strong>Speakers and lecture topics:</strong> To be announced.
      </p>

      <h2>Judges and scientific committee</h2>
      <p>
        The judges and scientific committee support the academic quality and
        integrity of the conference through the evaluation of student research
        presentations. Assessment focuses on scientific merit, originality,
        research methodology, relevance, and clarity of presentation. A
        consistent and impartial evaluation process promotes fairness while
        allowing participants to receive constructive feedback on their
        research.
      </p>
      <p>
        <strong>Judging panel and scientific committee members:</strong> To be
        announced.
      </p>

      <h2>Conference schedule and awards</h2>
      <p>
        The Academic Committee coordinates the schedule of academic
        activities, including oral presentations, poster sessions, invited
        lectures, and scientific discussions, to ensure a well-organized
        conference program. The conference schedule communicates the timing
        and arrangements of these activities to participants and invited
        guests.
      </p>
      <p>
        ASRC 2027 also recognizes outstanding student research through awards
        that celebrate scientific merit, originality, research quality, and
        effective presentation. Award categories and evaluation criteria are
        established to ensure a fair and transparent judging process and to
        encourage continued participation in medical research.
      </p>
      <ul>
        <li>
          <strong>Conference program and schedule:</strong> To be announced.
        </li>
        <li>
          <strong>Award categories and evaluation criteria:</strong> To be
          announced.
        </li>
      </ul>
    </StaticPage>
  );
}
