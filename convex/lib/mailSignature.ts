/**
 * Staff mail signatures. "full" goes on new emails and forwards, "compact"
 * (text only, no logo) on replies. Every value is escaped.
 */

export type MailSignatureStyle = "full" | "compact" | "none";

export type MailSignatureSender = {
  name: string;
  position?: string;
  /** The shared inbox the email is sent from. */
  email: string;
};

const SITE_URL = "https://cicmasrc.org";
const SITE_LABEL = "cicmasrc.org";
const COMMITTEE = "ASRC 2027 Organising Committee";
const DISCLAIMER =
  "This email and any attachments are confidential and intended only for the named recipient. If you received it by mistake, please tell the sender and delete it. Do not copy, forward or share its contents. Personal data and abstracts are handled under the ASRC 2027 privacy policy.";

const FONT = "font-family:Arial,Helvetica,sans-serif;";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const colourBar = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>${["#135642", "#dc7339", "#c3003f"]
  .map(
    (colour) =>
      `<td width="24" height="3" bgcolor="${colour}" style="width:24px;height:3px;background:${colour};font-size:0;line-height:0;">&nbsp;</td>`,
  )
  .join("")}</tr></tbody></table>`;

const disclaimerRow = `<tr><td colspan="2" style="${FONT}padding:12px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;max-width:480px;"><tbody><tr><td style="${FONT}padding:10px 0 0;border-top:1px solid #e6e1d8;font-size:10px;line-height:15px;color:#9a948a;">${escapeHtml(DISCLAIMER)} <a href="${SITE_URL}/privacy" style="color:#68635c;text-decoration:underline;">Privacy policy</a></td></tr></tbody></table></td></tr>`;

function fullHtml(sender: MailSignatureSender): string {
  const name = escapeHtml(sender.name);
  const email = escapeHtml(sender.email);
  const position = sender.position
    ? `<div style="${FONT}padding-top:2px;font-size:13px;line-height:18px;font-weight:bold;color:#c3003f;">${escapeHtml(sender.position)}</div>`
    : "";
  const contactRow = (letter: string, href: string, label: string) =>
    `<tr><td width="18" valign="top" style="${FONT}width:18px;padding:0 0 2px;font-size:11px;line-height:17px;font-weight:bold;color:#135642;">${letter}</td><td valign="top" style="${FONT}padding:0 0 2px;font-size:12px;line-height:17px;color:#171717;"><a href="${href}" style="color:#171717;text-decoration:none;">${label}</a></td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:480px;${FONT}color:#171717;"><tbody><tr><td width="80" valign="middle" align="center" style="width:80px;padding:0 16px 0 0;vertical-align:middle;text-align:center;"><a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/asrc.png" width="64" height="57" alt="ASRC 2027" style="display:block;margin:0 auto;width:64px;height:57px;border:0;outline:none;"></a></td><td valign="top" style="padding:0 0 0 16px;border-left:1px solid #e6e1d8;"><div style="${FONT}font-size:16px;line-height:20px;font-weight:bold;color:#171717;">${name}</div>${position}<div style="${FONT}font-size:12px;line-height:17px;color:#68635c;">${COMMITTEE}</div><div style="padding:9px 0 8px;">${colourBar}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${contactRow("E", `mailto:${email}`, email)}${contactRow("W", SITE_URL, SITE_LABEL)}</tbody></table></td></tr><tr><td colspan="2" style="${FONT}padding:14px 0 0;font-size:11px;line-height:16px;color:#8a847a;"><span style="color:#135642;font-weight:bold;">Observe. Innovate. Inspire.</span><br>Annual Student Research Conference 2027 · Society of Medical Students of CICM<br>Chulabhorn International College of Medicine, Thammasat University</td></tr>${disclaimerRow}</tbody></table>`;
}

function compactHtml(sender: MailSignatureSender): string {
  const email = escapeHtml(sender.email);
  const position = sender.position
    ? `<span style="color:#c3003f;"> · ${escapeHtml(sender.position)}</span>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:480px;${FONT}"><tbody><tr><td colspan="2" style="${FONT}padding:0 0 6px;font-size:13px;line-height:18px;color:#171717;"><b>${escapeHtml(sender.name)}</b>${position}</td></tr><tr><td colspan="2" style="padding:0 0 6px;">${colourBar}</td></tr><tr><td colspan="2" style="${FONT}font-size:12px;line-height:17px;color:#68635c;">${COMMITTEE} · <a href="mailto:${email}" style="color:#68635c;text-decoration:none;">${email}</a></td></tr>${disclaimerRow}</tbody></table>`;
}

function fullText(sender: MailSignatureSender): string {
  return [
    sender.name,
    sender.position,
    COMMITTEE,
    `E ${sender.email}`,
    `W ${SITE_LABEL}`,
    "",
    "Observe. Innovate. Inspire.",
    "Annual Student Research Conference 2027 · Society of Medical Students of CICM",
    "Chulabhorn International College of Medicine, Thammasat University",
    "",
    `${DISCLAIMER} Privacy policy: ${SITE_URL}/privacy`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function compactText(sender: MailSignatureSender): string {
  return [
    sender.position ? `${sender.name} · ${sender.position}` : sender.name,
    `${COMMITTEE} · ${sender.email}`,
    "",
    `${DISCLAIMER} Privacy policy: ${SITE_URL}/privacy`,
  ].join("\n");
}

/** Appends the signature to an already-rendered body. */
export function withSignature(
  body: { html: string; text: string },
  sender: MailSignatureSender,
  style: MailSignatureStyle,
): { html: string; text: string };
export function withSignature(
  body: { html: string; text: string } | null,
  sender: MailSignatureSender,
  style: MailSignatureStyle,
): { html: string; text: string } | null;
export function withSignature(
  body: { html: string; text: string } | null,
  sender: MailSignatureSender,
  style: MailSignatureStyle,
): { html: string; text: string } | null {
  if (style === "none") {
    return body;
  }
  const html = style === "full" ? fullHtml(sender) : compactHtml(sender);
  const text = style === "full" ? fullText(sender) : compactText(sender);
  return {
    html: `${body?.html ?? ""}<div style="margin-top:24px;">${html}</div>`,
    text: body ? `${body.text}\n\n-- \n${text}` : text,
  };
}
