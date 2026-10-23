import {
  RichDocumentOp,
  richDocumentToEmailHtml,
} from "../../lib/richDocument";

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type AbstractDecision = "selected" | "rejected" | "revision_requested";
type AbstractCategory = "oral" | "poster";

const CATEGORY_LABELS: Record<AbstractCategory, string> = {
  oral: "Oral presentation",
  poster: "Poster presentation",
};

const EMAIL_ASSET_BASE_URL = "https://cicmasrc.org";

/**
 * ASRC design system tokens (project/tokens.json), inlined because email
 * clients do not support CSS variables. Keep in sync with app/globals.scss.
 */
const t = {
  paper: "#fbfaf6",
  paperSunk: "#f3f1ea",
  surface: "#ffffff",
  ink: "#171717",
  inkMuted: "#68635c",
  line: "#e6e1d8",
  lineStrong: "#c9c2b6",
  tuRed: "#c3003f",
  tuRedDeep: "#a20e21",
  tuRedTint: "#fbe8ee",
  green: "#135642",
  greenTint: "#dcece6",
  orange: "#dc7339",
  orangeTint: "#fbeee5",
  orangeDeep: "#91471e",
  radiusSm: "8px",
  radiusMd: "12px",
  font: "Inter,'Noto Sans Thai',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
} as const;

/** Running-text styles shared by Markdown and rich-text bodies. */
const bodyText = `color:${t.ink};font-size:16px;line-height:1.6;`;

type Ring = "green" | "orange" | "gray" | "celebrate";
type Tone = "neutral" | "success" | "pending" | "error";

const toneStyles: Record<Tone, { background: string; color: string }> = {
  neutral: { background: t.paperSunk, color: t.inkMuted },
  success: { background: t.greenTint, color: t.green },
  pending: { background: t.orangeTint, color: t.orangeDeep },
  error: { background: t.tuRedTint, color: t.tuRedDeep },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      `<a href="$2" style="color:${t.tuRed};text-decoration:underline;">$1</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code style="font-family:monospace;">$1</code>');
}

function markdownToEmailHtml(markdown: string): string {
  const output: string[] = [];
  let list: "ol" | "ul" | null = null;
  const closeList = () => {
    if (list) {
      output.push(`</${list}>`);
      list = null;
    }
  };

  for (const rawLine of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      output.push(
        `<h${level} style="margin:24px 0 8px;color:${t.ink};font-size:20px;font-weight:600;line-height:1.3;">${inlineMarkdown(heading[2])}</h${level}>`,
      );
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const nextList = unordered ? "ul" : "ol";
      if (list !== nextList) {
        closeList();
        list = nextList;
        output.push(
          `<${list} style="margin:0 0 16px;padding-left:24px;${bodyText}">`,
        );
      }
      output.push(`<li>${inlineMarkdown((unordered ?? ordered)![1])}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith("> ")) {
      output.push(
        `<blockquote style="margin:16px 0;padding:4px 0 4px 16px;border-left:4px solid ${t.orange};color:${t.inkMuted};font-size:16px;line-height:1.6;">${inlineMarkdown(line.slice(2))}</blockquote>`,
      );
      continue;
    }
    output.push(`<p style="margin:0 0 16px;${bodyText}">${inlineMarkdown(line)}</p>`);
  }
  closeList();
  return output.join("");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(timestamp);
}

const LOGOS = [
  { file: "thammasat.png", alt: "Thammasat University" },
  { file: "cicm.png", alt: "Chulabhorn International College of Medicine" },
  { file: "smo.png", alt: "Society of Medical Students of CICM" },
  { file: "asrc.png", alt: "ASRC 2027" },
];

function eyebrow(label: string, tone?: Tone): string {
  if (!tone) {
    return `<div style="color:${t.inkMuted};font-size:12px;font-weight:600;letter-spacing:0.08em;line-height:1.4;text-transform:uppercase;">${escapeHtml(label)}</div>`;
  }
  const style = toneStyles[tone];
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${style.background};color:${style.color};font-size:12px;font-weight:600;letter-spacing:0.04em;line-height:1.4;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

/**
 * The shared layout: logos on paper, one white card with a hairline border
 * and a ring bleeding off its top-right corner, a footer row with the single
 * primary action, then the conference footer.
 */
function brandedEmail(args: {
  preview: string;
  label: string;
  tone?: Tone;
  ring: Ring;
  heading: string;
  intro: string;
  detailsHtml?: string;
  bodyHtml?: string;
  action?: { label: string; url: string };
  footer?: string;
}): string {
  const footer =
    args.footer ?? "This message was sent by the ASRC 2027 conference team.";
  const logos = LOGOS.map(
    (logo, index) =>
      `<td style="padding:0 ${index === LOGOS.length - 1 ? 0 : 12}px 0 0;"><img src="${EMAIL_ASSET_BASE_URL}/${logo.file}" height="36" alt="${escapeHtml(logo.alt)}" style="display:block;height:36px;width:auto;max-width:64px;border:0;"></td>`,
  ).join("");
  const action = args.action
    ? `<tr>
                <td colspan="2" style="padding:0 32px;"><div style="height:1px;line-height:1px;font-size:0;background:${t.line};">&nbsp;</div></td>
              </tr>
              <tr>
                <td colspan="2" align="right" style="padding:20px 32px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:${t.radiusSm};background:${t.tuRed};">
                        <a href="${escapeHtml(args.action.url)}" style="display:inline-block;padding:12px 20px;border-radius:${t.radiusSm};color:#ffffff;font-family:${t.font};font-size:16px;font-weight:600;line-height:1.25;text-decoration:none;">${escapeHtml(args.action.label)}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
    : `<tr><td colspan="2" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(args.heading)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Noto+Sans+Thai:wght@400;600;700&amp;display=swap" rel="stylesheet">
    <style>
      @media (max-width: 480px) {
        .asrc-ring { display: none !important; }
        .asrc-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .asrc-h1 { font-size: 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${t.paper};color:${t.ink};font-family:${t.font};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.paper};">
      <tr>
        <td align="center" style="padding:32px 16px 48px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td style="padding:0 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>${logos}</tr></table>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.surface};border:1px solid ${t.line};border-radius:${t.radiusMd};border-collapse:separate;">
                  <tr>
                    <td class="asrc-pad" valign="top" style="padding:32px 16px 0 32px;">
                      ${eyebrow(args.label, args.tone)}
                      <h1 class="asrc-h1" style="margin:16px 0 0;color:${t.ink};font-family:${t.font};font-size:28px;font-weight:700;letter-spacing:-0.015em;line-height:1.2;">${escapeHtml(args.heading)}</h1>
                    </td>
                    <td class="asrc-ring" width="128" valign="top" align="right" style="width:128px;padding:0;border-radius:0 ${t.radiusMd} 0 0;">
                      <img src="${EMAIL_ASSET_BASE_URL}/email/ring-${args.ring}.png" width="128" height="128" alt="" style="display:block;width:128px;height:128px;border:0;border-radius:0 11px 0 0;">
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" class="asrc-pad" style="padding:16px 32px 32px;">
                      <p style="margin:0;${bodyText}">${textToHtml(args.intro)}</p>
                      ${args.detailsHtml ?? ""}
                      ${args.bodyHtml ?? ""}
                    </td>
                  </tr>
                  ${action}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 0 0;color:${t.inkMuted};font-family:${t.font};font-size:14px;line-height:1.5;">
                <div style="color:${t.ink};font-weight:600;">Annual Student Research Conference (ASRC) 2027</div>
                <div style="margin-top:4px;">Observe. Innovate. Inspire.</div>
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${t.line};font-size:12px;line-height:1.6;">
                  ${escapeHtml(footer)}<br>
                  Chulabhorn International College of Medicine, Thammasat University<br>
                  © 2026–27 Society of Medical Students of CICM
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Label / value rows separated by hairlines, as on the abstract sheet. */
function detailCard(rows: Array<{ label: string; value: string; numeric?: boolean }>): string {
  const content = rows
    .map(
      (row, index) => `<tr>
        <td valign="top" width="36%" style="padding:12px 16px 12px 0;${index ? `border-top:1px solid ${t.line};` : ""}color:${t.inkMuted};font-size:14px;line-height:1.5;">${escapeHtml(row.label)}</td>
        <td valign="top" style="padding:12px 0;${index ? `border-top:1px solid ${t.line};` : ""}color:${t.ink};font-size:16px;line-height:1.5;${row.numeric ? "font-variant-numeric:tabular-nums;" : ""}">${textToHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${t.line};">${content}</table>`;
}

/** Long-form reviewer feedback, kept out of the details table. */
function feedbackBlock(feedback: string): string {
  return `<div style="margin-top:24px;padding:16px 20px;border:1px solid ${t.line};border-left:4px solid ${t.orange};border-radius:${t.radiusSm};">
    <div style="color:${t.inkMuted};font-size:12px;font-weight:600;letter-spacing:0.08em;line-height:1.4;text-transform:uppercase;">Reviewer feedback</div>
    <div style="margin-top:8px;${bodyText}">${textToHtml(feedback)}</div>
  </div>`;
}

const OPTED_IN_FOOTER =
  "You are receiving conference updates because you opted in to email notifications.";

export function verificationEmail(args: { token: string }): EmailContent {
  const code = escapeHtml(args.token);
  return {
    subject: "Verify your ASRC 2027 account",
    html: brandedEmail({
      preview: `Your ASRC 2027 verification code is ${args.token}.`,
      label: "Email verification",
      ring: "green",
      heading: "Verify your email",
      intro:
        "Enter this code on the ASRC registration page to finish creating your account.",
      detailsHtml: `<div style="margin-top:24px;padding:24px 16px;border-radius:${t.radiusMd};background:${t.paperSunk};text-align:center;">
        <div style="color:${t.inkMuted};font-size:12px;font-weight:600;letter-spacing:0.08em;line-height:1.4;text-transform:uppercase;">Verification code</div>
        <div style="margin-top:8px;color:${t.ink};font-size:40px;font-weight:600;letter-spacing:0.12em;line-height:1.1;font-variant-numeric:tabular-nums;">${code}</div>
      </div>
      <p style="margin:24px 0 0;color:${t.inkMuted};font-size:14px;line-height:1.5;">This code expires in <strong style="color:${t.ink};font-weight:600;">15 minutes</strong>. If you did not request it, you can safely ignore this email.</p>`,
    }),
    text: `Your ASRC 2027 verification code is ${args.token}. It expires in 15 minutes.`,
  };
}

export function announcementEmail(args: {
  title: string;
  summary: string;
  body: string;
  /** Formatted body; when absent, `body` is legacy Markdown. */
  bodyRich?: ReadonlyArray<RichDocumentOp>;
  url: string;
}): EmailContent {
  const subject = `ASRC 2027 announcement: ${args.title}`;
  const bodyHtml = args.bodyRich
    ? richDocumentToEmailHtml(args.bodyRich)
    : markdownToEmailHtml(args.body);
  return {
    subject,
    html: brandedEmail({
      preview: args.summary,
      label: "Conference announcement",
      ring: "orange",
      heading: args.title,
      intro: args.summary,
      bodyHtml: `<div style="margin-top:24px;padding-top:24px;border-top:1px solid ${t.line};">${bodyHtml}</div>`,
      action: { label: "Read announcement", url: args.url },
      footer: OPTED_IN_FOOTER,
    }),
    text: `${args.title}\n\n${args.summary}\n\n${args.body}\n\nRead the announcement online: ${args.url}`,
  };
}

export function keyDateEmail(args: {
  title: string;
  displayDate: string;
  previousTitle?: string;
  previousDisplayDate?: string;
  url: string;
}): EmailContent {
  const changed =
    args.previousTitle !== undefined ||
    args.previousDisplayDate !== undefined;
  const intro = changed
    ? "An important ASRC 2027 date has changed. Please update your calendar."
    : "A new important date has been added to the ASRC 2027 schedule.";
  const rows = [
    ...(args.previousTitle
      ? [{ label: "Previous event", value: args.previousTitle }]
      : []),
    { label: "Event", value: args.title },
    ...(args.previousDisplayDate
      ? [{ label: "Previous date", value: args.previousDisplayDate }]
      : []),
    {
      label: args.previousDisplayDate ? "New date" : "Date",
      value: args.displayDate,
    },
  ];
  const subject = `ASRC 2027 key date: ${args.title}`;

  return {
    subject,
    html: brandedEmail({
      preview: `${args.title}: ${args.displayDate}`,
      label: changed ? "Key date changed" : "Key date update",
      ring: "orange",
      heading: args.title,
      intro,
      detailsHtml: detailCard(rows),
      action: { label: "View all key dates", url: args.url },
      footer: OPTED_IN_FOOTER,
    }),
    text: `${intro}\n\n${rows.map((row) => `${row.label}: ${row.value}`).join("\n")}\n\nView all key dates: ${args.url}`,
  };
}

export function abstractSubmissionEmail(args: {
  title: string;
  submissionId: string;
  submittedAt: number;
  resubmission: boolean;
  url: string;
}): EmailContent {
  const heading = args.resubmission
    ? "Your revised abstract has been received"
    : "Your abstract has been received";
  const intro = args.resubmission
    ? "Thank you for submitting your revised abstract. It is now back with the review team."
    : "Thank you for submitting your abstract to ASRC 2027. It is now ready for review.";

  return {
    subject: `ASRC 2027: ${heading}`,
    html: brandedEmail({
      preview: `${heading}: ${args.title}`,
      label: args.resubmission ? "Resubmission received" : "Submission received",
      tone: "pending",
      ring: "green",
      heading,
      intro,
      detailsHtml: detailCard([
        { label: "Abstract", value: args.title },
        { label: "Submission ID", value: args.submissionId, numeric: true },
        { label: "Received", value: formatDate(args.submittedAt) },
      ]),
      action: { label: "View your abstract", url: args.url },
    }),
    text: `${heading}\n\n${intro}\n\nAbstract: ${args.title}\nSubmission ID: ${args.submissionId}\nReceived: ${formatDate(args.submittedAt)}\n\nView your abstract: ${args.url}`,
  };
}

export function abstractDecisionEmail(args: {
  decision: AbstractDecision;
  title: string;
  submissionId: string;
  feedback?: string;
  /** Presentation type assigned when the abstract is selected. */
  category?: AbstractCategory;
  url: string;
}): EmailContent {
  const categoryLabel =
    args.decision === "selected" && args.category
      ? CATEGORY_LABELS[args.category]
      : undefined;
  const copy = {
    selected: {
      label: "Abstract selected",
      tone: "success" as const,
      ring: "celebrate" as const,
      heading: "Your abstract has been selected",
      intro: categoryLabel
        ? `Congratulations. The review team has selected your abstract for ${categoryLabel.toLowerCase()} at ASRC 2027.`
        : "Congratulations. The review team has selected your abstract for ASRC 2027.",
      action: "View decision",
    },
    rejected: {
      label: "Abstract decision",
      tone: "neutral" as const,
      ring: "gray" as const,
      heading: "A decision has been made on your abstract",
      intro:
        "The review team has completed its assessment. Unfortunately, your abstract was not selected for ASRC 2027. Thank you for sharing your work with us.",
      action: "View decision",
    },
    revision_requested: {
      label: "Revision requested",
      tone: "pending" as const,
      ring: "orange" as const,
      heading: "Revisions are requested for your abstract",
      intro:
        "The review team has requested changes before making a final decision. Please review the feedback and resubmit your abstract.",
      action: "Review and revise",
    },
  }[args.decision];
  const rows = [
    { label: "Abstract", value: args.title },
    { label: "Submission ID", value: args.submissionId, numeric: true },
    ...(categoryLabel ? [{ label: "Presentation", value: categoryLabel }] : []),
  ];
  const textRows = args.feedback
    ? [...rows, { label: "Reviewer feedback", value: args.feedback }]
    : rows;

  return {
    subject: `ASRC 2027: ${copy.heading}`,
    html: brandedEmail({
      preview: `${copy.heading}: ${args.title}`,
      label: copy.label,
      tone: copy.tone,
      ring: copy.ring,
      heading: copy.heading,
      intro: copy.intro,
      detailsHtml:
        detailCard(rows) + (args.feedback ? feedbackBlock(args.feedback) : ""),
      action: { label: copy.action, url: args.url },
    }),
    text: `${copy.heading}\n\n${copy.intro}\n\n${textRows.map((row) => `${row.label}: ${row.value}`).join("\n")}\n\nView your abstract: ${args.url}`,
  };
}

export type { EmailContent };
