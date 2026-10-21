import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "Privacy Policy | ASRC 2027",
  description:
    "How the ASRC 2027 organisers collect, use, share and protect your personal data under Thailand's PDPA.",
};

const CONTACT_EMAIL = "smomedcicm+asrc@gmail.com";

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy policy"
      eyebrow="Effective 21 October 2026"
      intro={
        <>
          How the organisers of ASRC 2027 collect, use, share and protect your
          personal data, in line with Thailand&rsquo;s Personal Data Protection
          Act B.E. 2562 (2019) (&ldquo;PDPA&rdquo;).
        </>
      }
      document
    >
      <p>
        This Privacy Policy applies when you use the ASRC 2027 website and
        abstract submission portal (the &ldquo;Website&rdquo;).
      </p>

      <h2>1. Who we are</h2>
      <p>
        The data controller is the{" "}
        <strong>
          Society of Medical Students of Chulabhorn International College of
          Medicine (SMO CICM)
        </strong>
        , organiser of ASRC 2027, at Chulabhorn International College of
        Medicine, Thammasat University, 99/129 Moo 18 Phahon Yothin Rd., Khlong
        Nueng Subdistrict, Khlong Luang District, Pathum Thani 12120, Thailand
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the Organising
        Committee&rdquo;).
      </p>
      <p>
        Contact for privacy matters:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>2. Personal data we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account details:</strong> email address and password. Your
          password is stored only in hashed form; we cannot see it.
        </li>
        <li>
          <strong>Profile details:</strong> title/prefix, first name, other
          names, last name, suffix, phone number, city, participant category
          (for example medical student, resident, faculty), position,
          specialty, department, and institution or affiliation. You may also
          upload a profile photo.
        </li>
        <li>
          <strong>Abstract submissions:</strong> title, study type, author list
          (names, affiliations, presenting author, faculty advisor), advisor
          details, abstract text, keywords, declarations you confirm, and any
          supporting files you upload (up to 5 files, 20 MB each).
        </li>
        <li>
          <strong>Affiliations you add:</strong> if your institution is not on
          our list, the details you enter for it.
        </li>
        <li>
          <strong>Your choices:</strong> your agreement to these policies and
          whether you want email updates about the conference.
        </li>
        <li>
          <strong>Messages to us:</strong> anything you send to our contact
          email.
        </li>
      </ul>
      <p>
        <strong>Information about other people.</strong> When you list
        co-authors or advisors, you give us their names and affiliations.
        Please make sure they know you are submitting their details for ASRC
        2027 and that they agree.
      </p>

      <h3>Information created by us or the system</h3>
      <ul>
        <li>
          Account records such as when your account was created, when your
          email was verified, and the time of sign-in sessions.
        </li>
        <li>
          Abstract records such as submission and update times, review status,
          the reviewer&rsquo;s decision and feedback to you, presentation
          category, and the abstract code.
        </li>
        <li>
          Internal reviewer notes about your abstract, which are visible only
          to authorised committee members.
        </li>
        <li>
          If the Organising Committee pre-registers you (for example, invited
          speakers or faculty), the details we entered for you, which link to
          your account when you sign up with the same email.
        </li>
      </ul>
      <p>
        <strong>Technical information.</strong> To keep you signed in, the
        Website stores a login token in your browser&rsquo;s local storage. Our
        hosting and backend providers keep standard server logs (such as IP
        address, browser type and request times) for security and
        troubleshooting. We do not use advertising or third-party analytics
        cookies.
      </p>
      <p>
        <strong>Sensitive data.</strong> We do not ask for sensitive personal
        data such as health, religion or ethnicity. Please do not include such
        data, or any identifiable patient or research-participant data, in
        your profile, abstract or supporting files.
      </p>

      <h2>3. Why we use your data, and our legal basis</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Data used</th>
            <th>Legal basis under PDPA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Create and secure your account, verify your email, keep you
              signed in
            </td>
            <td>Account details, technical information</td>
            <td>Contract (providing the service you request)</td>
          </tr>
          <tr>
            <td>Register you as a participant and manage attendance</td>
            <td>Profile details</td>
            <td>Contract</td>
          </tr>
          <tr>
            <td>
              Receive, review and decide on abstracts; communicate results and
              feedback
            </td>
            <td>Abstract submissions, profile details, review records</td>
            <td>Contract; legitimate interest in running a fair academic review</td>
          </tr>
          <tr>
            <td>
              Produce the conference programme, abstract book and certificates
            </td>
            <td>Names, affiliations, accepted abstracts</td>
            <td>Contract; legitimate interest</td>
          </tr>
          <tr>
            <td>
              Send essential service emails (verification codes, submission and
              review updates)
            </td>
            <td>Email address</td>
            <td>Contract</td>
          </tr>
          <tr>
            <td>Send announcements and key-date reminders</td>
            <td>Email address</td>
            <td>Consent (you can withdraw at any time)</td>
          </tr>
          <tr>
            <td>
              Keep the Website secure, prevent misuse and investigate academic
              misconduct
            </td>
            <td>All of the above as needed</td>
            <td>Legitimate interest; legal obligation</td>
          </tr>
          <tr>
            <td>
              Keep records of the conference and meet university or legal
              requirements
            </td>
            <td>Accepted abstracts, participation records</td>
            <td>Legitimate interest; legal obligation</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your personal data and do not use it for automated
        decisions that have legal or similarly significant effects on you.
        Abstract decisions are made by people on the Academic Committee.
      </p>

      <h2>4. Who can see your data</h2>
      <ul>
        <li>
          <strong>You:</strong> your own profile, abstracts and files.
        </li>
        <li>
          <strong>Organising and Academic Committee members:</strong>{" "}
          authorised staff, academic staff and administrators can see
          participant profiles and submissions to run registration and review.
          Access is limited by role.
        </li>
        <li>
          <strong>The public:</strong> if your abstract is accepted, its title,
          text, keywords, and the names and affiliations of its authors may be
          published in the conference programme, the abstract book and on the
          Website. Unaccepted abstracts, supporting files, contact details and
          reviewer notes are not published.
        </li>
        <li>
          <strong>
            Chulabhorn International College of Medicine and Thammasat
            University
          </strong>
          , where needed for conference administration, certificates or
          academic records.
        </li>
        <li>
          <strong>Service providers</strong> who process data on our behalf
          under contract, only for the purposes above:
          <ul>
            <li>Convex, Inc. — database, file storage and account login</li>
            <li>Vercel Inc. — website hosting</li>
            <li>Resend — sending emails</li>
          </ul>
        </li>
        <li>
          <strong>Authorities</strong>, if required by law or to protect rights
          and safety.
        </li>
      </ul>

      <h2>5. Transfers outside Thailand</h2>
      <p>
        Our service providers may store or process data on servers outside
        Thailand, including in the United States. Where this happens, we rely
        on the providers&rsquo; contractual data protection commitments and
        security measures, as permitted under the PDPA and its rules on
        cross-border transfers, so that your data receives an adequate level
        of protection.
      </p>

      <h2>6. How long we keep your data</h2>
      <ul>
        <li>
          <strong>Accounts, profiles and unaccepted submissions:</strong> until
          2 years after ASRC 2027 ends, then deleted or anonymised.
        </li>
        <li>
          <strong>Accepted abstracts and author details:</strong> kept as part
          of the permanent conference record and publications.
        </li>
        <li>
          <strong>Draft abstracts:</strong> you can delete unsubmitted drafts
          at any time; otherwise they follow the account period above.
        </li>
        <li>
          <strong>Server logs:</strong> kept by our providers for their
          standard periods, usually no more than a few months.
        </li>
      </ul>
      <p>
        We may keep data longer if the law requires it or if it is needed to
        deal with a complaint or an academic-integrity investigation.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the PDPA you have the right to:</p>
      <ul>
        <li>access and get a copy of your personal data;</li>
        <li>
          ask us to correct inaccurate or incomplete data (you can edit most of
          your profile yourself);
        </li>
        <li>ask us to delete or anonymise your data, or to restrict its use;</li>
        <li>object to processing based on our legitimate interest;</li>
        <li>
          receive your data in a commonly used electronic format, or have it
          sent to another controller (data portability);
        </li>
        <li>
          withdraw consent at any time, for example to stop announcement
          emails, without affecting processing that already took place;
        </li>
        <li>
          complain to the Personal Data Protection Committee (PDPC) of
          Thailand.
        </li>
      </ul>
      <p>
        To use any of these rights, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address
        linked to your account. We will reply within 30 days. Some requests may
        be limited; for example, deleting your account after your abstract is
        accepted may not remove it from material already published.
      </p>

      <h2>8. How we protect your data</h2>
      <p>
        We use encrypted connections (HTTPS), hashed passwords, email
        verification, and role-based access so that only authorised committee
        members can see submissions and participant details. No system is
        completely secure; if a personal data breach is likely to put your
        rights at risk, we will notify the PDPC and, where required, you.
      </p>

      <h2>9. Children</h2>
      <p>
        The Website is intended for university students, researchers and
        faculty. If you are under 18, please get your parent&rsquo;s or
        guardian&rsquo;s consent before creating an account. If we learn we
        hold a minor&rsquo;s data without that consent, we will delete it.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy. We will post the new version on this page
        with a new effective date, and for significant changes we will tell
        registered users by email. See also our{" "}
        <Link href="/terms-conditions">terms and conditions</Link>.
      </p>

      <h2>11. Contact us</h2>
      <address>
        ASRC 2027 Organising Committee, Society of Medical Students of CICM
        <br />
        Chulabhorn International College of Medicine, Thammasat University
        <br />
        99/129 Moo 18 Phahon Yothin Rd., Khlong Nueng, Khlong Luang, Pathum
        Thani 12120, Thailand
        <br />
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </address>
    </StaticPage>
  );
}
