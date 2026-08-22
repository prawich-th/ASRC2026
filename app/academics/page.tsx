import type { Metadata } from "next";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "Academics | ASRC 2026",
  description:
    "Explore the medical, healthcare, biomedical, and interdisciplinary research areas welcomed by ASRC.",
};

const researchAreas = [
  "Clinical Medicine",
  "Biomedical Sciences",
  "Public Health and Global Health",
  "Medical Education",
  "Medical Technology",
  "Artificial Intelligence and Data Science in Medicine",
  "Biomedical Engineering",
  "Digital Health",
  "Precision and Personalized Medicine",
  "Pharmaceutical and Therapeutic Research",
  "Behavioral and Social Sciences in Healthcare",
  "Healthcare Systems and Policy",
  "Translational Research",
  "Interdisciplinary Healthcare Innovation",
  "Other research relevant to medicine and human health",
];

export default function AcademicsPage() {
  return (
    <StaticPage title="Academics">
      <p>
        ASRC welcomes research related to medicine, healthcare, biomedical
        sciences, and interdisciplinary fields.
      </p>

      <h2>Areas of Submission</h2>
      <p>Possible areas of submission include:</p>
      <ul>
        {researchAreas.map((area) => (
          <li key={area}>{area}</li>
        ))}
      </ul>

      <h2>Interdisciplinary Research</h2>
      <p>
        Research that integrates two or more disciplines or demonstrates
        potential applications to healthcare is particularly encouraged under
        the ASRC 2026 theme.
      </p>
    </StaticPage>
  );
}
