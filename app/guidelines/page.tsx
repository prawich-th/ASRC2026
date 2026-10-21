import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/static-page/static-page";
import { CONTACTS } from "@/lib/contacts";

export const metadata: Metadata = {
  title: "Academic Guidelines | ASRC 2027",
  description:
    "Official academic guidelines for ASRC 2027: eligibility, research categories, abstract submission, oral and poster presentations, and important dates.",
};

const TBA = "To be announced";

const contactEmail = CONTACTS.find((contact) => contact.label === "Email");

const researchCategories = [
  {
    title: "Basic Medical and Biomedical Sciences",
    body: "Research investigating fundamental biological processes, disease mechanisms, or the scientific basis of health and disease.",
    examples: [
      "Molecular and cellular biology",
      "Biochemistry and physiology",
      "Genetics and molecular medicine",
      "Pharmacology and experimental disease models",
    ],
  },
  {
    title: "Clinical and Translational Research",
    body: "Research investigating the prevention, diagnosis, management, or treatment of disease, including studies that translate scientific discoveries into clinical applications.",
    examples: [
      "Clinical investigations",
      "Diagnostic methods and therapeutic interventions",
      "Patient outcomes and clinical practice",
      "Translational and experimental medicine",
    ],
  },
  {
    title: "Public Health and Epidemiology",
    body: "Research examining health outcomes, disease distribution, risk factors, and interventions affecting individuals and populations.",
    examples: [
      "Epidemiological studies",
      "Disease prevention and health promotion",
      "Community health and health behaviour",
      "Environmental health and healthcare access",
    ],
  },
  {
    title: "Medical Education and Health Professions Education",
    body: "Research exploring teaching, learning, assessment, and professional development in medicine and other health-related disciplines.",
    examples: [
      "Medical student learning experiences",
      "Teaching and assessment methods",
      "Simulation-based education",
      "Student well-being and professional development",
    ],
  },
  {
    title: "Systematic Reviews and Evidence Synthesis",
    body: "Research that systematically evaluates existing literature to answer a defined scientific or clinical question.",
    examples: [
      "Systematic reviews",
      "Meta-analyses",
      "Evidence synthesis for clinical practice",
      "Reviews of healthcare interventions",
    ],
  },
  {
    title: "Medical Innovation and Emerging Technologies",
    body: "Research investigating technological advances and innovative approaches to improve healthcare and scientific practice.",
    examples: [
      "Artificial intelligence in medicine",
      "Digital health and telemedicine",
      "Medical devices and diagnostic technologies",
      "Computational biology and biomedical innovation",
    ],
  },
];

const abstractFormat = [
  ["Language", "English"],
  ["Word limit", "250 words (abstract text)"],
  ["Keywords", "1 to 10"],
  ["Author details", "Full names and institutional affiliations"],
  ["Submission method", "Online editor on the ASRC website"],
  ["Submission deadline", "31 January 2027 (ICT, GMT+7)"],
];

const posterFormat = [
  ["Poster dimensions", TBA],
  ["Orientation", TBA],
  ["Resolution", TBA],
  ["File format", TBA],
  ["File naming convention", TBA],
  ["Submission deadline", TBA],
  ["Display format", TBA],
];

const importantDates = [
  ["Abstract submission opens", TBA],
  ["Abstract submission deadline", "31 January 2027 (ICT, GMT+7)"],
  ["Announcement of accepted abstracts", TBA],
  ["Participation confirmation deadline", TBA],
  ["Final presentation/poster submission deadline", TBA],
  ["Conference date(s)", TBA],
];

function SpecTable({ head, rows }: { head: [string, string]; rows: string[][] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{head[0]}</th>
          <th>{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function GuidelinesPage() {
  return (
    <StaticPage title="Academic guidelines" document split>
      <p>
        <em>Empowering Student Researchers. Advancing Medical Knowledge.</em>
      </p>

      <h2>Conference overview</h2>
      <h3>About ASRC</h3>
      <p>
        The Annual Student Research Conference (ASRC) at Chulabhorn
        International College of Medicine (CICM), Thammasat University,
        provides a platform for students to showcase their research, exchange
        scientific knowledge, and engage in academic discussions with fellow
        students, researchers, and healthcare professionals.
      </p>
      <p>
        ASRC aims to foster a culture of research, critical thinking, and
        interdisciplinary collaboration among students. Through research
        presentations and constructive feedback from academic reviewers,
        participants will have the opportunity to strengthen their scientific
        communication skills, gain valuable insights into their research, and
        contribute to the advancement of medical and health sciences.
      </p>
      <p>
        This conference welcomes student researchers who are passionate about
        exploring scientific questions, developing innovative ideas, and
        applying evidence-based approaches to healthcare and related fields.
      </p>
      <h3>Conference objectives</h3>
      <p>ASRC aims to:</p>
      <ul>
        <li>
          Provide a platform for students to present their research findings
          and academic work.
        </li>
        <li>Encourage scientific inquiry, innovation, and critical thinking.</li>
        <li>
          Promote collaboration and knowledge exchange among students from
          different academic backgrounds.
        </li>
        <li>
          Develop participants’ research communication and presentation
          skills.
        </li>
        <li>
          Recognize outstanding student research and academic achievement.
        </li>
      </ul>
      <h3>Research presentation formats</h3>
      <p>
        Participants may present their research through the following formats,
        subject to acceptance and the conference committee’s allocation.
      </p>
      <p>
        <strong>Oral presentation:</strong> Participants deliver a structured
        presentation of their research to an audience and a panel of judges,
        followed by a question-and-answer session.
      </p>
      <p>
        <strong>Poster presentation:</strong> Participants communicate their
        research through a visual poster, explaining their study and
        discussing their findings with judges and conference attendees.
      </p>
      <p>
        <em>
          The final presentation formats, technical requirements, and judging
          arrangements will be confirmed by the ASRC organizing committee.
        </em>
      </p>

      <h2>Eligibility and research categories</h2>
      <h3>Eligibility criteria</h3>
      <p>Participants must meet the following eligibility requirements:</p>
      <ol>
        <li>
          <strong>Student status:</strong> Applicants must be currently
          enrolled students at an eligible educational institution. The
          eligible academic levels and institutions will be specified by the
          organizing committee.
        </li>
        <li>
          <strong>Research contribution:</strong> The presenting author must
          have made a meaningful contribution to the submitted research, such
          as study design, data collection, data analysis, interpretation, or
          manuscript preparation.
        </li>
        <li>
          <strong>Originality:</strong> Submitted work must represent
          legitimate academic research. All sources must be appropriately
          acknowledged, and plagiarism is strictly prohibited.
        </li>
        <li>
          <strong>Research integrity:</strong> Researchers are responsible for
          ensuring that research involving human participants, animals, or
          identifiable personal data complies with applicable legal and
          ethical requirements and for obtaining any required institutional or
          ethics approvals or exemptions.
        </li>
        <li>
          <strong>Presentation responsibility:</strong> Each accepted
          submission must have a designated presenting author who is
          responsible for delivering the presentation and answering questions.
          How the presenting author is confirmed will be announced to accepted
          participants.
        </li>
        <li>
          <strong>Submission compliance:</strong> Participants must submit all
          required materials within the designated deadlines and follow the
          official conference guidelines.
        </li>
      </ol>
      <p>
        Collaborative research involving multiple authors or institutions may
        be accepted, provided that all contributors are appropriately
        acknowledged and the presenting author’s contribution can be
        identified.
      </p>
      <p>
        <em>
          The organizing committee reserves the right to verify eligibility
          and request supporting documentation where necessary.
        </em>
      </p>
      <h3>Research categories</h3>
      <p>
        ASRC encourages submissions across medical, biomedical, and
        health-related disciplines. The categories below describe the scope of
        research ASRC welcomes. The submission form does not ask for a
        category; instead, it asks you to choose the type of study (for
        example experimental, observational, or systematic review).
      </p>
      <ol>
        {researchCategories.map((category) => (
          <li key={category.title}>
            <strong>{category.title}:</strong> {category.body} Examples
            include:
            <ul>
              {category.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p>
        Research that does not fit neatly into these categories may be
        considered at the discretion of the organizing committee.
      </p>

      <h2>Abstract submission guidelines</h2>
      <h3>General requirements</h3>
      <p>
        All participants must submit an abstract describing their research
        before preparing their final conference presentation.
      </p>
      <p>
        Abstracts should clearly communicate the research question,
        objectives, methodology, principal findings, and significance of the
        study. Submissions will be evaluated based on scientific quality,
        originality, relevance, clarity, and overall academic merit.
      </p>
      <p>
        Participants must ensure that their abstracts are accurate, concise,
        and written in accordance with the requirements below.
      </p>
      <h3>Abstract structure</h3>
      <p>Abstracts should include the following components:</p>
      <ol>
        <li>
          <strong>Title:</strong> A concise and informative title that
          accurately reflects the research.
        </li>
        <li>
          <strong>Author information:</strong> Full names of all authors in
          publication order, each with their institutional affiliation. The
          person who submits the abstract is the corresponding author (the
          contact for correspondence about the submission). The presenting
          author delivers the presentation and answers questions; the two
          roles may be held by the same person.
        </li>
        <li>
          <strong>Background/Introduction:</strong> An overview of the research
          problem and its scientific or clinical significance.
        </li>
        <li>
          <strong>Objectives:</strong> A clear statement of the research
          question or aims.
        </li>
        <li>
          <strong>Methods:</strong> A description of the study design,
          materials, participants or data sources, and analytical methods, as
          applicable.
        </li>
        <li>
          <strong>Results:</strong> The principal findings of the study,
          including relevant quantitative or qualitative results where
          available.
        </li>
        <li>
          <strong>Conclusion:</strong> A summary of the main findings and their
          implications.
        </li>
        <li>
          <strong>Keywords:</strong> Relevant terms that describe the main
          topics of the research.
        </li>
      </ol>
      <p>
        For research formats that require a different structure, such as
        systematic reviews or case-based studies, participants should follow
        any additional instructions issued by the organizing committee.
      </p>
      <h3>Formatting requirements</h3>
      <SpecTable head={["Requirement", "ASRC specifications"]} rows={abstractFormat} />
      <p>
        Abstracts are written directly in the online editor; no template or
        file upload is required. Italics, bold, underline, and
        sub/superscript formatting are available, and drafts save
        automatically. Submissions that exceed the word limit or omit required
        information cannot be submitted, and abstracts that do not follow the
        guidelines may be returned for correction or rejected.
      </p>
      <h3>Using the online editor</h3>
      <ul>
        <li>
          <strong>Authors:</strong> Add each author in publication order with
          their full name and affiliation. You are automatically the
          corresponding author as the uploader. Faculty advisors may be
          included in the author list and optionally marked using the faculty
          advisor checkbox.
        </li>
        <li>
          <strong>Affiliations:</strong> Choose each author’s affiliation
          (department, faculty, university or office, district, province, and
          country) from the shared list. If an affiliation is missing, add it
          from the selector and the organizing committee will verify it.
        </li>
        <li>
          <strong>Type of study:</strong> Choose the type of study that best
          describes the research, or select “Other” and describe it.
        </li>
        <li>
          <strong>Supporting files:</strong> You may optionally attach up to
          five supporting files (20 MB each) to your abstract.
        </li>
        <li>
          <strong>Declaration:</strong> Before submitting, confirm that the
          listed authors, affiliations, and abstract are accurate and that all
          listed authors have approved the submission.
        </li>
      </ul>
      <h3>Abstract review criteria</h3>
      <p>
        Abstracts will be reviewed by the designated academic reviewers or
        judging panel. The following criteria are recommended for assessment:
      </p>
      <ul>
        <li>
          <strong>Scientific quality:</strong> Appropriateness and rigour of
          the research design and methodology.
        </li>
        <li>
          <strong>Originality:</strong> Novelty of the research question,
          approach, or findings.
        </li>
        <li>
          <strong>Significance:</strong> Potential contribution to medical
          knowledge, healthcare, or related scientific fields.
        </li>
        <li>
          <strong>Clarity:</strong> Logical organization, readability, and
          accuracy of the abstract.
        </li>
        <li>
          <strong>Validity of findings:</strong> Appropriate interpretation of
          results and conclusions in relation to the methods and data
          presented.
        </li>
      </ul>
      <p>
        Acceptance decisions and assigned presentation formats are sent to the
        corresponding author by email and shown on the abstract’s status in{" "}
        <Link href="/profile/abstracts">My abstracts</Link>.
      </p>
      <h3>Research ethics and academic integrity</h3>
      <p>
        All participants are expected to maintain high standards of academic
        integrity.
      </p>
      <ul>
        <li>
          Plagiarism, fabrication, falsification, and misrepresentation of
          research findings are prohibited.
        </li>
        <li>
          All references, published materials, and contributions from other
          researchers must be appropriately acknowledged.
        </li>
        <li>
          Researchers are responsible for ensuring that research involving
          human participants or animals complies with applicable laws, ethical
          standards, and institutional requirements, including obtaining any
          required ethics approvals or exemptions.
        </li>
        <li>
          Patient confidentiality must be protected, and identifiable
          information must not be disclosed without appropriate authorization.
        </li>
        <li>
          Authors must accurately declare their contributions and disclose
          relevant conflicts of interest where required.
        </li>
      </ul>
      <p>
        Submissions that violate academic integrity or research ethics
        requirements may be disqualified.
      </p>

      <h2>Oral presentation guidelines</h2>
      <h3>Presentation format</h3>
      <p>
        Accepted participants assigned to the oral presentation category will
        present their research to an audience and a panel of judges.
      </p>
      <p>
        Presentations should provide a clear, structured overview of the
        research and demonstrate the presenter’s understanding of the
        scientific rationale, methodology, findings, and implications of the
        study.
      </p>
      <h3>Presentation structure</h3>
      <p>Participants are encouraged to organize their slides as follows:</p>
      <ol>
        <li>
          <strong>Title slide:</strong> Research title, author names beneath
          the title, and institutional affiliations.
        </li>
        <li>
          <strong>Background:</strong> Introduction to the research problem
          and its significance.
        </li>
        <li>
          <strong>Objectives:</strong> Research question, aims, or hypotheses.
        </li>
        <li>
          <strong>Methods:</strong> Study design, procedures, data collection,
          and analytical methods.
        </li>
        <li>
          <strong>Results:</strong> Main findings supported by appropriate
          tables, figures, or graphs.
        </li>
        <li>
          <strong>Discussion:</strong> Interpretation of findings in relation
          to the research question and existing evidence.
        </li>
        <li>
          <strong>Conclusion:</strong> Main takeaways, implications, and
          recommendations, where appropriate.
        </li>
        <li>
          <strong>References and acknowledgements:</strong> Relevant sources
          and recognition of contributors or supporting institutions.
        </li>
      </ol>
      <p>
        The presentation should prioritize the most important findings rather
        than reproduce the entire research paper.
      </p>
      <h3>Technical requirements</h3>
      <ul>
        <li>
          Presentation materials must be submitted in the file format
          specified by the organizing committee.
        </li>
        <li>
          Participants should use a consistent and professional slide design.
        </li>
        <li>
          Text should be readable, and figures, tables, and images should be
          clearly labelled.
        </li>
        <li>
          All external sources and adapted figures must be appropriately
          cited.
        </li>
        <li>
          Patient information and confidential research data must not be
          disclosed.
        </li>
        <li>
          Participants should ensure that their slides are compatible with the
          equipment or online platform provided.
        </li>
      </ul>
      <SpecTable
        head={["Item", "Details"]}
        rows={[
          ["Presentation duration", TBA],
          ["Question-and-answer session", TBA],
          ["File format", TBA],
          ["Material submission deadline", TBA],
        ]}
      />
      <h3>Presentation day procedures</h3>
      <ol>
        <li>
          Check the official schedule for the assigned session, presentation
          room, and presentation order.
        </li>
        <li>
          Arrive at the designated venue or join the online session before the
          scheduled presentation (required preparation time to be announced).
        </li>
        <li>
          Upload or test presentation materials according to the instructions
          provided by the organizing committee.
        </li>
        <li>
          Remain present throughout the assigned session unless otherwise
          instructed.
        </li>
        <li>Deliver the presentation within the allocated time.</li>
        <li>
          Answer questions from the judges clearly, professionally, and
          accurately.
        </li>
      </ol>
      <p>
        Participants presenting online must ensure a stable internet
        connection, functioning audio and video equipment, and a suitable
        environment.
      </p>
      <h3>Judging criteria</h3>
      <p>
        Oral presentations may be evaluated according to the following
        criteria:
      </p>
      <ul>
        <li>Scientific content and research quality</li>
        <li>Organization and clarity of the presentation</li>
        <li>Interpretation of results and understanding of the research</li>
        <li>Visual quality and effective use of supporting materials</li>
        <li>Communication skills and time management</li>
        <li>
          Ability to respond to questions and engage in scientific discussion
        </li>
      </ul>
      <p>
        The final scoring criteria and weighting will be announced by the
        organizing committee.
      </p>

      <h2>Poster presentation guidelines</h2>
      <h3>General requirements</h3>
      <p>
        Poster presentations allow participants to communicate their research
        through a concise and visually organized display. Posters should
        enable readers to understand the research question, methods, main
        findings, and conclusions without requiring them to read a full
        research paper.
      </p>
      <p>
        Participants must follow the official poster specifications and submit
        their final poster before the designated deadline.
      </p>
      <h3>Poster content</h3>
      <p>A research poster should generally include:</p>
      <ol>
        <li>
          <strong>Title and authors:</strong> Research title, author names
          beneath the title, and institutional affiliations.
        </li>
        <li>
          <strong>Background:</strong> Brief explanation of the research
          problem and its significance.
        </li>
        <li>
          <strong>Objectives:</strong> Main research question or study aims.
        </li>
        <li>
          <strong>Methods:</strong> Essential details of the study design and
          methodology.
        </li>
        <li>
          <strong>Results:</strong> Principal findings presented using concise
          text, graphs, tables, or figures.
        </li>
        <li>
          <strong>Discussion:</strong> Interpretation and relevance of the
          findings.
        </li>
        <li>
          <strong>Conclusion:</strong> Key messages and potential
          implications.
        </li>
        <li>
          <strong>References and acknowledgements:</strong> Essential
          citations and recognition of contributors, where applicable.
        </li>
      </ol>
      <p>
        Participants should prioritize visual clarity, concise wording, and
        logical information flow. Unnecessary text and excessive decorative
        elements should be avoided.
      </p>
      <h3>Poster formatting and technical requirements</h3>
      <SpecTable head={["Requirement", "ASRC specifications"]} rows={posterFormat} />
      <p>
        Participants must use the official poster template if one is provided.
        All text, figures, and tables should remain legible at the intended
        display size.
      </p>
      <h3>Poster presentation session</h3>
      <p>During the assigned poster session, participants should:</p>
      <ol>
        <li>
          Display or upload their posters according to the instructions
          provided.
        </li>
        <li>
          Arrive at the designated location or online session before the
          scheduled start time.
        </li>
        <li>
          Prepare a brief explanation of the research, highlighting the
          objectives, methods, key findings, and conclusions.
        </li>
        <li>Remain available during the designated judging period.</li>
        <li>Respond to questions from judges and attendees.</li>
        <li>
          Ensure that all displayed materials are accurate, professional, and
          compliant with research ethics requirements.
        </li>
      </ol>
      <SpecTable
        head={["Item", "Details"]}
        rows={[
          ["Poster presentation duration", TBA],
          ["Question-and-answer session", TBA],
          ["Judging schedule", TBA],
        ]}
      />
      <h3>Judging criteria</h3>
      <p>Posters may be evaluated based on:</p>
      <ul>
        <li>Scientific quality and significance of the research</li>
        <li>Organization and logical presentation of information</li>
        <li>Visual design, readability, and effective use of figures</li>
        <li>Clarity of the presenter’s explanation</li>
        <li>Understanding of the research and interpretation of results</li>
        <li>Ability to answer questions and engage in discussion</li>
      </ul>
      <p>
        The official scoring criteria and award arrangements will be
        communicated before the conference.
      </p>

      <h2>Submission process and important dates</h2>
      <h3>Submission process</h3>
      <p>
        Participants should complete the following steps to enter the ASRC
        research competition.
      </p>
      <ol>
        <li>
          <strong>Prepare your abstract:</strong> Review the eligibility
          requirements and research categories, and prepare your abstract
          according to the official formatting guidelines.
        </li>
        <li>
          <strong>Submit your abstract:</strong> Complete and submit your
          abstract using the{" "}
          <Link href="/abstracts/submit">online editor</Link> on the ASRC
          website before the deadline.
        </li>
        <li>
          <strong>Await the review outcome:</strong> The academic committee
          will evaluate submitted abstracts. You will be notified of the
          outcome and your assigned presentation format by email and on your
          abstract’s status page.
        </li>
        <li>
          <strong>Confirm participation:</strong> Accepted participants must
          confirm their participation by the specified deadline and complete
          any additional registration requirements. How to confirm will be
          announced.
        </li>
        <li>
          <strong>Prepare your presentation:</strong> Prepare your oral
          presentation or poster according to the relevant technical and
          academic guidelines.
        </li>
        <li>
          <strong>Submit your final materials:</strong> Submit your final
          presentation materials before the deadline. Participants should
          verify that their files are complete, correctly formatted, and
          accessible. Submission instructions will be announced.
        </li>
        <li>
          <strong>Attend the conference:</strong> Check the final programme,
          presentation schedule, venue or online access instructions, and any
          additional announcements from the organizing committee.
        </li>
      </ol>
      <h3>Important dates</h3>
      <SpecTable head={["Event", "Date"]} rows={importantDates} />
      <p>
        The latest dates are also listed under{" "}
        <Link href="/#key-dates">key dates</Link> on the home page.
      </p>
      <p>
        <strong>Important:</strong> All deadlines will follow Thailand local
        time (ICT/GMT+7), unless otherwise specified. Participants are
        responsible for submitting all materials before the applicable
        deadlines.
      </p>
      <p>
        Late submissions and requests for changes after the deadline will be
        handled according to the policies established by the organizing
        committee.
      </p>
      <h3>Submission checklist</h3>
      <p>Before submitting, participants should ensure that they have:</p>
      <ul>
        <li>Confirmed that they meet the eligibility requirements.</li>
        <li>Chosen the type of study that best describes the research.</li>
        <li>
          Prepared the abstract using the required structure and word limit.
        </li>
        <li>
          Checked spelling, grammar, references, and author information.
        </li>
        <li>Confirmed that all co-authors are correctly acknowledged.</li>
        <li>
          Ensured that the work complies with research ethics and academic
          integrity requirements.
        </li>
        <li>Confirmed the declaration on the review &amp; submit step.</li>
        <li>Submitted the abstract using the online editor on the ASRC website.</li>
        <li>Saved a copy of the submitted materials for their records.</li>
      </ul>

      <h2>Frequently asked questions</h2>
      <h3>Who can participate in ASRC?</h3>
      <p>
        ASRC is intended for eligible student researchers. Specific
        requirements regarding academic level, institutional affiliation, and
        eligibility will be announced by the organizing committee.
        Participants should review the eligibility criteria before submitting
        their abstracts.
      </p>
      <h3>Can students from different institutions collaborate on a research project?</h3>
      <p>
        Collaborative research may be accepted, subject to the conference’s
        eligibility requirements. All authors and their institutional
        affiliations must be appropriately acknowledged, and the presenting
        author must satisfy the relevant eligibility criteria.
      </p>
      <h3>Can I submit research that has already been published or presented at another conference?</h3>
      <p>
        The ASRC policy on prior publication and presentation is to be
        announced. Participants should disclose previous publication or
        presentation where requested and must not misrepresent previously
        published work as new research.
      </p>
      <h3>Can I submit more than one abstract?</h3>
      <p>
        Yes. There is no limit on the number of abstracts you can submit.
      </p>
      <h3>Can I make changes to my abstract after submission?</h3>
      <p>
        You can edit a draft as often as you like until you submit it. Once
        submitted, an abstract is locked unless the committee requests a
        revision, in which case you can edit and resubmit it. Please review
        all information carefully before submitting, and contact the
        organizing committee promptly if a correction is necessary.
      </p>
      <h3>How will I know whether my abstract has been accepted?</h3>
      <p>
        The organizing committee will send review outcomes by email to the
        corresponding author, and the outcome will also appear on the
        abstract’s status in{" "}
        <Link href="/profile/abstracts">My abstracts</Link>. Please monitor
        your registered email account and check your spam or junk folder
        regularly.
      </p>
      <h3>Will I be able to choose between an oral and poster presentation?</h3>
      <p>
        No. The submission form does not ask for a preferred format. The
        presentation format is assigned by the organizing committee based on
        the conference structure and review outcome.
      </p>
      <h3>What should I do if my abstract is accepted?</h3>
      <p>
        Accepted participants should confirm their participation by the
        specified deadline, prepare the required presentation materials,
        submit the final files on time, and review the conference programme
        for their assigned session.
      </p>
      <h3>What happens if I miss a submission deadline?</h3>
      <p>
        Late submissions may not be accepted. Participants should follow the
        published deadlines and contact the organizing committee as early as
        possible if they encounter a technical problem or an exceptional
        circumstance.
      </p>
      <h3>Are there any specific research ethics requirements?</h3>
      <p>
        Yes. Participants must ensure that their research complies with
        applicable laws, ethical standards, institutional requirements, and
        data protection obligations. Where required, approval or exemption
        documentation must be obtained and provided if requested.
      </p>
      <h3>How will research presentations be evaluated?</h3>
      <p>
        Presentations will be assessed by the designated judging panel
        according to the official criteria for each format. Evaluation may
        consider research quality, originality, clarity, presentation skills,
        interpretation of findings, and responses to questions.
      </p>
      <h3>Who should I contact if I have further questions?</h3>
      <p>
        For questions regarding eligibility, abstract submission, presentation
        requirements, or conference arrangements, please contact the ASRC
        organizing committee through the official communication channels
        below.
      </p>
      <ul>
        <li>
          <strong>Official email:</strong>{" "}
          {contactEmail ? (
            <a href={contactEmail.href}>{contactEmail.lines[0]}</a>
          ) : (
            TBA
          )}
        </li>
        <li>
          <strong>Official website and submission platform:</strong> This
          website (<Link href="/contact">contact page</Link>)
        </li>
        <li>
          <strong>Official social media page:</strong> {TBA}
        </li>
      </ul>

      <h2>Final reminder</h2>
      <p>
        All participants are responsible for reviewing the latest official
        ASRC Academic Guidelines and complying with the requirements
        established by the organizing committee. Any updates to submission
        procedures, eligibility criteria, presentation formats, or deadlines
        will be communicated through the official conference channels.
      </p>
      <p>
        We look forward to welcoming student researchers to ASRC and providing
        an engaging platform for academic exchange, scientific discovery, and
        collaboration in medical and health sciences.
      </p>
      <p>
        <strong>ASRC Organizing Committee</strong>
        <br />
        Chulabhorn International College of Medicine (CICM)
        <br />
        Thammasat University
      </p>
    </StaticPage>
  );
}
