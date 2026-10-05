import type { Metadata } from "next";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "Submission Guidelines | ASRC 2026",
  description:
    "Official submission, abstract, ethics, review, and presentation guidelines for ASRC 2026.",
};

export default function GuidelinesPage() {
  return (
    <StaticPage title="Submission Guidelines">
      <h2>General Requirements</h2>
      <ul>
        <li>
          All submissions must comply with the official ASRC Research and
          Academic Guidelines.
        </li>
        <li>
          Each student may submit one research project as the primary
          presenting author.
        </li>
        <li>
          Students may participate as co-authors in additional projects where
          permitted by the organizing committee.
        </li>
        <li>
          Each submitted project must have at least one faculty or academic
          advisor who has reviewed and approved the work prior to submission.
        </li>
        <li>
          All information submitted must be accurate and approved by the
          research team and advisor.
        </li>
      </ul>

      <h2>Eligibility</h2>
      <p>Submissions must:</p>
      <ul>
        <li>Be completed by eligible students according to ASRC regulations.</li>
        <li>Include an academic advisor.</li>
        <li>Represent original academic or research work.</li>
        <li>Follow appropriate research ethics and institutional requirements.</li>
        <li>Receive necessary ethical approval where applicable.</li>
        <li>
          Properly acknowledge all authors, collaborators, institutions, and
          sources.
        </li>
      </ul>
      <p>
        Plagiarism, fabrication, falsification, inappropriate use of data, or
        other forms of academic misconduct are strictly prohibited.
      </p>

      <h2>Abstract Submission</h2>
      <p>
        Participants must complete the official ASRC Abstract Submission Form
        and provide all required information.
      </p>
      <p>
        After submission, participants will receive confirmation that their
        abstract has been successfully received. The organizing and academic
        committees will review all eligible submissions. Acceptance decisions
        and presentation categories will subsequently be communicated to the
        presenting author.
      </p>

      <h2>Abstract Format</h2>
      <h3>Title</h3>
      <p>
        The title should clearly and concisely represent the content of the
        research. Avoid unnecessary abbreviations.
      </p>

      <h3>Authors</h3>
      <p>
        Add each author in publication order with their full name and
        affiliation. The presenting author and faculty advisor must be clearly
        identified.
      </p>

      <h3>Affiliations</h3>
      <p>
        Choose each author&apos;s affiliation (department, faculty, university or
        office, district, province, and country) from the shared list. If an
        affiliation is missing, add it from the selector and the organising
        committee will verify it.
      </p>

      <h3>Abstract Content</h3>
      <p>
        The abstract is written directly on the website and must not exceed
        250 words. Italics, bold, underline, and sub/superscript formatting are
        available.
      </p>
      <ol>
        <li>
          <strong>Introduction / Background:</strong> Briefly describe the
          research problem and its significance.
        </li>
        <li>
          <strong>Objectives:</strong> Clearly state the research question or
          objectives.
        </li>
        <li>
          <strong>Materials and Methods:</strong> Describe the study design,
          participants or samples, procedures, data collection, and methods of
          analysis.
        </li>
        <li>
          <strong>Results:</strong> Present the major findings of the research.
        </li>
        <li>
          <strong>Conclusion and Discussion:</strong> Summarize the significance
          of the findings and their potential implications.
        </li>
        <li>
          <strong>Acknowledgements</strong> (optional)
        </li>
        <li>
          <strong>References</strong> (optional)
        </li>
      </ol>

      <h3>Keywords</h3>
      <p>Provide relevant keywords describing the research.</p>

      <h2>Submission Requirements</h2>
      <p>
        All abstracts are prepared and submitted through the online editor; no
        template or file upload is required. Drafts save automatically and can
        be edited until they are submitted.
      </p>
      <p>Participants are responsible for ensuring that:</p>
      <ul>
        <li>The abstract is no longer than 250 words.</li>
        <li>All required sections are included.</li>
        <li>Every author is listed with the correct affiliation.</li>
        <li>The submitted version has been reviewed by the academic advisor.</li>
        <li>
          The research complies with applicable ethical and academic
          regulations.
        </li>
      </ul>
      <p>
        Submissions that do not comply with the requirements may be returned
        for correction or excluded from consideration.
      </p>

      <h2>Research Ethics and Academic Integrity</h2>
      <p>
        All research presented at ASRC must follow internationally accepted
        principles of research ethics and academic integrity.
      </p>
      <p>
        Where applicable, participants must obtain approval from the
        appropriate Institutional Review Board (IRB), Ethics Committee, or
        equivalent authority before conducting research involving human
        participants, identifiable personal information, biological samples,
        or other ethically regulated materials.
      </p>
      <p>Participants are responsible for ensuring proper:</p>
      <ul>
        <li>Informed consent</li>
        <li>Participant confidentiality</li>
        <li>Data protection</li>
        <li>Authorship attribution</li>
        <li>Citation and referencing</li>
        <li>Conflict-of-interest disclosure</li>
        <li>Research approval and documentation</li>
      </ul>
      <p>
        The ASRC Academic Committee reserves the right to request additional
        documentation where necessary.
      </p>

      <h2>Review Process</h2>
      <p>
        Submitted abstracts will be evaluated by the ASRC Academic Committee
        and appointed reviewers. Submissions may be evaluated based on:
      </p>
      <ul>
        <li>Scientific and academic quality</li>
        <li>Relevance of the research question</li>
        <li>Appropriateness of research methodology</li>
        <li>Interpretation of results</li>
        <li>Originality and innovation</li>
        <li>Potential contribution to healthcare or scientific knowledge</li>
        <li>Clarity of academic communication</li>
        <li>Alignment with the interdisciplinary vision of ASRC 2026</li>
      </ul>
      <p>
        Following the review process, selected participants will be invited to
        present their research at ASRC 2026.
      </p>

      <h2>Presentation Categories</h2>
      <h3>Oral Research Presentation</h3>
      <p>
        Selected participants will formally present their research to an
        academic audience and panel of judges.
      </p>

      <h3>Poster Presentation</h3>
      <p>
        Participants will communicate their research through an academic poster
        and engage directly with reviewers and attendees.
      </p>

      <h3>Interdisciplinary Research Showcase</h3>
      <p>
        Selected projects demonstrating particularly strong integration
        between medicine and another academic discipline may be featured as
        part of the ASRC 2026 Interdisciplinary Research Showcase.
      </p>
      <p>
        Final presentation categories will be determined by the ASRC Academic
        Committee.
      </p>
    </StaticPage>
  );
}
