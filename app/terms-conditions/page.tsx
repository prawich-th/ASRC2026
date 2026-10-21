import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/static-page/static-page";

export const metadata: Metadata = {
  title: "Terms and Conditions | ASRC 2027",
  description:
    "The terms that govern your use of the ASRC 2027 website and abstract submission portal.",
};

const CONTACT_EMAIL = "smomedcicm+asrc@gmail.com";

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms and conditions"
      eyebrow="Effective 21 October 2026"
      intro="The rules for using the ASRC 2027 website and abstract submission portal."
      document
    >
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) govern your use of the ASRC
        2027 website and abstract submission portal (the &ldquo;Website&rdquo;),
        run by the Society of Medical Students of Chulabhorn International
        College of Medicine (SMO CICM) as organiser of the Annual Student
        Research Conference 2027 (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the
        Organising Committee&rdquo;). By creating an account or using the
        Website, you agree to these Terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
        please do not use the Website.
      </p>

      <h2>1. Who may use the Website</h2>
      <p>
        The Website is for people taking part in or following ASRC 2027,
        including students, residents, researchers and faculty. If you are
        under 18, you need your parent&rsquo;s or guardian&rsquo;s consent to
        create an account. Eligibility to submit or present is set by the ASRC
        regulations and the{" "}
        <Link href="/guidelines">Submission Guidelines</Link>.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>
          Give accurate, current information and keep your profile up to date.
        </li>
        <li>
          Use an email address you control; we verify it with a one-time code.
        </li>
        <li>
          Keep your password secret. You are responsible for activity on your
          account. Tell us at once at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you think
          someone else has used it.
        </li>
        <li>
          One account per person. Do not create accounts for, or sign in as,
          someone else.
        </li>
        <li>
          If the Organising Committee pre-registered you, signing up with the
          same email links you to that record.
        </li>
      </ul>

      <h2>3. Submitting abstracts</h2>
      <p>When you submit an abstract, you confirm that:</p>
      <ul>
        <li>
          the work is original and is not plagiarised, fabricated or
          falsified;
        </li>
        <li>
          every listed author has approved the submitted version and agreed to
          be listed, and their names and affiliations are correct;
        </li>
        <li>
          the research followed applicable ethical rules and has the required
          ethics (IRB) approval where needed;
        </li>
        <li>
          the abstract and any files contain no identifiable patient or
          research-participant data, and nothing confidential you are not
          entitled to share;
        </li>
        <li>
          the submission does not infringe anyone&rsquo;s copyright, privacy or
          other rights.
        </li>
      </ul>
      <p>
        Submissions must follow the{" "}
        <Link href="/guidelines">Submission Guidelines</Link>. You can edit or
        delete a draft until you submit it. After submission, changes can only
        be made if the committee requests a revision.
      </p>
      <p>
        The Academic Committee decides on acceptance and presentation category
        (oral or poster) at its discretion, and its decisions are final.
        Submitting an abstract does not guarantee acceptance.
      </p>

      <h2>4. Rights in your submission</h2>
      <p>
        You and your co-authors keep the copyright in your work. By submitting,
        you give the Organising Committee, CICM and Thammasat University a
        non-exclusive, royalty-free, worldwide licence to store, copy, review
        and, if accepted, publish the abstract with its authors&rsquo; names
        and affiliations in the conference programme, abstract book, Website
        and related promotional or archival material, in print and online.
        Supporting files are used only for review and are not published
        without your permission.
      </p>
      <p>
        You confirm you have the authority to grant this licence on behalf of
        all listed authors.
      </p>

      <h2>5. Academic integrity</h2>
      <p>
        Plagiarism, fabrication, falsification, misuse of data, undisclosed
        duplicate submission, or other academic misconduct may lead us to
        reject or withdraw an abstract, including after acceptance or
        presentation, remove it from publications, suspend your account, and
        notify your institution.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>
          try to access accounts, data or admin areas you are not authorised to
          use;
        </li>
        <li>
          upload malware, or files that are illegal, offensive or unrelated to
          your submission;
        </li>
        <li>
          interfere with the Website&rsquo;s security or operation, including
          through automated scraping, overloading, or probing for
          vulnerabilities;
        </li>
        <li>
          impersonate any person or institution, or misrepresent your
          affiliation;
        </li>
        <li>
          use the Website or other participants&rsquo; information to send
          spam or for any commercial purpose.
        </li>
      </ul>

      <h2>7. Our content</h2>
      <p>
        The Website&rsquo;s design, text, logos and graphics, including the
        ASRC, SMO CICM, CICM and Thammasat University names and logos, belong
        to their respective owners. You may view and share Website pages for
        personal, non-commercial purposes, but you may not copy or reuse our
        logos or branding without written permission.
      </p>

      <h2>8. Emails</h2>
      <p>
        We will send you service emails needed to run your account and
        submission, such as verification codes and review results.
        Announcement and key-date emails are sent only if you opted in; you can
        opt out at any time.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We run the Website on a voluntary, non-commercial basis. We aim to keep
        it available, especially near deadlines, but we do not guarantee it
        will be uninterrupted or error-free. Please submit well before
        deadlines and keep your own copy of your work. We may change, suspend
        or end any part of the Website, and may change conference dates or
        arrangements, posting updates on the Website.
      </p>

      <h2>10. Suspension and closing your account</h2>
      <p>
        We may suspend or close an account that breaks these Terms. You may
        ask us to close your account at any time by emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Closing your
        account does not remove an accepted abstract from materials already
        published. How we handle your data after closure is set out in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>11. Disclaimers and limitation of liability</h2>
      <p>
        The Website is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;. Research shown on the Website or at the conference is
        the responsibility of its authors and does not represent the views of
        the Organising Committee, CICM or Thammasat University, and is not
        medical advice.
      </p>
      <p>
        To the fullest extent allowed by Thai law, we are not liable for any
        indirect or consequential loss, or for loss caused by Website downtime,
        lost data, or missed deadlines due to technical problems. Nothing in
        these Terms limits liability that cannot be limited by law, including
        liability for gross negligence or wilful misconduct.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms. We will post the new version here with a new
        effective date, and tell registered users of significant changes by
        email. Continuing to use the Website after a change means you accept
        the updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Kingdom of Thailand, and
        the courts of Thailand have jurisdiction over any dispute.
      </p>

      <h2>14. Contact</h2>
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
