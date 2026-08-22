type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type AbstractDecision = "selected" | "rejected" | "revision_requested";

const EMAIL_ASSET_BASE_URL = "https://asrc-2027.vercel.app";

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
      '<a href="$2" style="color:#135642;text-decoration:underline;">$1</a>',
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
        `<h${level} style="margin:22px 0 8px;color:#171717;line-height:1.35;">${inlineMarkdown(heading[2])}</h${level}>`,
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
          `<${list} style="margin:10px 0;padding-left:24px;color:#4f4b45;font-size:15px;line-height:1.65;">`,
        );
      }
      output.push(`<li>${inlineMarkdown((unordered ?? ordered)![1])}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith("> ")) {
      output.push(
        `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #dc7339;background:#fffcf7;color:#625e57;font-size:15px;line-height:1.65;">${inlineMarkdown(line.slice(2))}</blockquote>`,
      );
      continue;
    }
    output.push(
      `<p style="margin:0 0 14px;color:#4f4b45;font-size:15px;line-height:1.7;">${inlineMarkdown(line)}</p>`,
    );
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

function brandedEmail(args: {
  preview: string;
  label: string;
  heading: string;
  intro: string;
  detailsHtml?: string;
  bodyHtml?: string;
  actionLabel: string;
  actionUrl: string;
  footer?: string;
}): string {
  const footer =
    args.footer ??
    "This message was sent by the ASRC 2027 conference team.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(args.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fafafa;color:#171717;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td style="height:6px;background:#135642;border-radius:8px 0 0 0;"></td>
              <td style="height:6px;background:#dc7339;"></td>
              <td style="height:6px;background:#c3003f;border-radius:0 8px 0 0;"></td>
            </tr>
            <tr>
              <td colspan="3" style="padding:24px 32px;background:#135642;color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="74" valign="middle" style="padding-right:18px;">
                      <div style="padding:7px;border-radius:9px;background:#ffffff;text-align:center;">
                        <img src="${EMAIL_ASSET_BASE_URL}/asrc.png" width="58" height="58" alt="ASRC 2027" style="display:block;width:58px;height:58px;object-fit:contain;border:0;">
                      </div>
                    </td>
                    <td valign="middle">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;opacity:0.78;">CICM</div>
                      <div style="margin-top:5px;font-size:25px;font-weight:750;line-height:1.2;">ASRC 2027</div>
                      <div style="margin-top:5px;font-size:14px;line-height:1.5;opacity:0.84;">Annual Student Research Conference</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:36px 32px;background:#ffffff;border:1px solid #eee7dd;border-top:0;border-radius:0 0 8px 8px;">
                <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f9e9e5;color:#9c2f25;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(args.label)}</div>
                <h1 style="margin:18px 0 10px;font-size:28px;line-height:1.25;color:#171717;">${escapeHtml(args.heading)}</h1>
                <p style="margin:0;color:#625e57;font-size:16px;line-height:1.65;">${textToHtml(args.intro)}</p>
                ${args.detailsHtml ?? ""}
                ${args.bodyHtml ?? ""}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:7px;background:#c3003f;">
                      <a href="${escapeHtml(args.actionUrl)}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(args.actionLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:26px 20px;text-align:center;color:#625e57;">
                <table role="presentation" align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 7px;"><img src="${EMAIL_ASSET_BASE_URL}/thammasat.png" height="42" alt="Thammasat University" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;"></td>
                    <td style="padding:0 7px;"><img src="${EMAIL_ASSET_BASE_URL}/cicm.png" height="42" alt="Chulabhorn International College of Medicine" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;"></td>
                    <td style="padding:0 7px;"><img src="${EMAIL_ASSET_BASE_URL}/smo.png" height="42" alt="Society of Medical Students of CICM" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;"></td>
                    <td style="padding:0 7px;"><img src="${EMAIL_ASSET_BASE_URL}/asrc.png" height="42" alt="ASRC 2027" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;"></td>
                  </tr>
                </table>
                <div style="margin-top:16px;font-size:14px;font-weight:700;color:#171717;">Annual Student Research Conference (ASRC) 2027</div>
                <div style="margin-top:4px;font-size:12px;line-height:1.6;color:#817b72;">
                  ${escapeHtml(footer)}<br>
                  Observe. Innovate. Inspire.<br>
                  Chulabhorn International College of Medicine<br>
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

function detailCard(rows: Array<{ label: string; value: string }>): string {
  const content = rows
    .map(
      (row) => `<tr>
        <td style="padding:8px 12px;color:#777168;font-size:13px;font-weight:700;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 12px;color:#171717;font-size:14px;line-height:1.5;">${textToHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border:1px solid #ded7cd;border-radius:8px;background:#fffcf7;">${content}</table>`;
}

export function announcementEmail(args: {
  title: string;
  summary: string;
  body: string;
  url: string;
}): EmailContent {
  const subject = `ASRC 2027 announcement: ${args.title}`;
  return {
    subject,
    html: brandedEmail({
      preview: args.summary,
      label: "Conference announcement",
      heading: args.title,
      intro: args.summary,
      bodyHtml: `<div style="margin-top:26px;padding-top:24px;border-top:1px solid #eee7dd;">${markdownToEmailHtml(args.body)}</div>`,
      actionLabel: "Read announcement",
      actionUrl: args.url,
      footer:
        "You are receiving conference updates because you opted in to email notifications.",
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
      label: "Key date update",
      heading: args.title,
      intro,
      detailsHtml: detailCard(rows),
      actionLabel: "View all key dates",
      actionUrl: args.url,
      footer:
        "You are receiving conference updates because you opted in to email notifications.",
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
      heading,
      intro,
      detailsHtml: detailCard([
        { label: "Abstract", value: args.title },
        { label: "Submission ID", value: args.submissionId },
        { label: "Received", value: formatDate(args.submittedAt) },
      ]),
      actionLabel: "View your abstract",
      actionUrl: args.url,
    }),
    text: `${heading}\n\n${intro}\n\nAbstract: ${args.title}\nSubmission ID: ${args.submissionId}\nReceived: ${formatDate(args.submittedAt)}\n\nView your abstract: ${args.url}`,
  };
}

export function abstractDecisionEmail(args: {
  decision: AbstractDecision;
  title: string;
  submissionId: string;
  feedback?: string;
  url: string;
}): EmailContent {
  const copy = {
    selected: {
      label: "Abstract selected",
      heading: "Your abstract has been selected",
      intro:
        "Congratulations. The review team has selected your abstract for ASRC 2027.",
    },
    rejected: {
      label: "Abstract decision",
      heading: "A decision has been made on your abstract",
      intro:
        "The review team has completed its assessment. Unfortunately, your abstract was not selected for ASRC 2027.",
    },
    revision_requested: {
      label: "Revision requested",
      heading: "Revisions are requested for your abstract",
      intro:
        "The review team has requested changes before making a final decision. Please review the feedback and resubmit your abstract.",
    },
  }[args.decision];
  const rows = [
    { label: "Abstract", value: args.title },
    { label: "Submission ID", value: args.submissionId },
  ];
  if (args.feedback) {
    rows.push({ label: "Reviewer feedback", value: args.feedback });
  }

  return {
    subject: `ASRC 2027: ${copy.heading}`,
    html: brandedEmail({
      preview: `${copy.heading}: ${args.title}`,
      label: copy.label,
      heading: copy.heading,
      intro: copy.intro,
      detailsHtml: detailCard(rows),
      actionLabel:
        args.decision === "revision_requested"
          ? "Review and revise"
          : "View decision",
      actionUrl: args.url,
    }),
    text: `${copy.heading}\n\n${copy.intro}\n\n${rows.map((row) => `${row.label}: ${row.value}`).join("\n")}\n\nView your abstract: ${args.url}`,
  };
}

export type { EmailContent };
