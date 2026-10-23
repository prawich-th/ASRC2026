import type { Metadata } from "next";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "About Us | ASRC 2027",
  description:
    "Learn about ASRC, its host CICM at Thammasat University, and its mission and vision.",
};

export default function AboutUsPage() {
  return (
    <StaticPage title="About us" document split>
      <p>
        The Annual Student Research Conference (ASRC) is an academic conference
        hosted by the Chulabhorn International College of Medicine (CICM),
        Thammasat University, dedicated to fostering research, scientific
        inquiry, and academic collaboration among medical students.
      </p>

      <h2>About ASRC</h2>
      <p>
        ASRC provides a platform for aspiring physician-researchers to present
        their work through oral and poster presentations, exchange ideas, and
        engage in meaningful scientific discussions. By bringing together
        students from CICM and other medical schools, the conference aims to
        encourage interdisciplinary learning, promote the sharing of
        knowledge, and strengthen the research community among future
        healthcare professionals.
      </p>
      <p>
        We believe that research is an essential part of medical advancement.
        By empowering medical students to explore questions, challenge existing
        knowledge, and communicate their findings, ASRC seeks to cultivate
        curiosity, critical thinking, and a commitment to evidence-based
        medicine.
      </p>
      <p>
        Through the exchange of ideas and the presentation of student-led
        research, ASRC aspires to inspire the next generation of medical
        professionals to contribute to scientific discovery and the
        advancement of healthcare.
      </p>

      <h2>About CICM and Thammasat University</h2>
      <p>
        The University Council at the 8th Annual Meeting held on August 20,
        2012 established the International College of Medicine. It was
        developed with the purpose of educating advanced professionals in the
        fields of medical science and research while playing a key role in
        Thailand’s art and cultural evolution with the integration of English
        as its primary language of education.
      </p>
      <p>
        The College of Medicine was delegated as a prominent faculty amongst
        its fellow institutions within Thammasat University. The college is
        managed independently under the provisions within Thammasat
        University’s regulatory council including its accreditation status as
        a collegiate institution.
      </p>
      <p>
        The College was granted the name of Chulabhorn Medical University
        (Chulabhorn International College of Medicine) by Her Royal Highness
        Princess Chulabhorn in the royal books dated May 8, 2013.
      </p>

      <h2>Our mission</h2>
      <p>
        To provide an inclusive academic platform that empowers medical
        students to share their research, develop their scientific
        communication skills, and engage in meaningful academic exchange.
      </p>

      <h2>Our vision</h2>
      <p>
        To cultivate a collaborative and research-driven community of future
        healthcare professionals who contribute to medical knowledge,
        innovation, and improved health outcomes.
      </p>

      <h2>Who can participate</h2>
      <p>
        ASRC welcomes eligible medical students from CICM, Thammasat
        University, and other medical schools to share their research through
        oral and poster presentations. The conference encourages students to
        connect with fellow researchers, gain valuable academic experience,
        and become active contributors to the advancement of medical science.
      </p>
    </StaticPage>
  );
}
