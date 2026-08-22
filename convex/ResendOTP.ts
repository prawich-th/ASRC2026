import Resend from "@auth/core/providers/resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

function getEnvironmentVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
}

function verificationEmailHtml(token: string, assetBaseUrl: string): string {
  // const assets = assetBaseUrl.replace(/\/+$/, "");
  const assets = "https://asrc-2027.vercel.app/";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your ASRC 2027 account</title>
  </head>
  <body style="margin:0;padding:0;background:#fafafa;color:#171717;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your ASRC 2027 verification code is ${token}.
    </div>
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
                        <img src="${assets}/asrc.png" width="58" height="58" alt="ASRC 2027" style="display:block;width:58px;height:58px;object-fit:contain;border:0;">
                      </div>
                    </td>
                    <td valign="middle">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;opacity:0.78;">
                        CICM
                      </div>
                      <div style="margin-top:5px;font-size:25px;font-weight:750;line-height:1.2;">
                        ASRC 2027
                      </div>
                      <div style="margin-top:5px;font-size:14px;line-height:1.5;opacity:0.84;">
                        Annual Student Research Conference
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:36px 32px;background:#ffffff;border:1px solid #eee7dd;border-top:0;border-radius:0 0 8px 8px;">
                <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f9e9e5;color:#9c2f25;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                  Email verification
                </div>
                <h1 style="margin:18px 0 10px;font-size:28px;line-height:1.25;color:#171717;">
                  Verify your email
                </h1>
                <p style="margin:0;color:#625e57;font-size:16px;line-height:1.65;">
                  Enter this code on the ASRC registration page to finish creating your account.
                </p>
                <div style="margin:28px 0;padding:22px 16px;border:1px solid #ded7cd;border-radius:10px;background:#fffcf7;text-align:center;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#777168;">
                    Verification code
                  </div>
                  <div style="margin-top:10px;color:#c3003f;font-size:34px;font-weight:700;letter-spacing:0.22em;line-height:1.2;">
                    ${token}
                  </div>
                </div>
                <p style="margin:0;color:#625e57;font-size:14px;line-height:1.6;">
                  This code expires in <strong style="color:#171717;">15 minutes</strong>. If you did not request this code, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:26px 20px;text-align:center;color:#625e57;">
                <table role="presentation" align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 7px;">
                      <img src="${assets}/thammasat.png" height="42" alt="Thammasat University" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;">
                    </td>
                    <td style="padding:0 7px;">
                      <img src="${assets}/cicm.png" height="42" alt="Chulabhorn International College of Medicine" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;">
                    </td>
                    <td style="padding:0 7px;">
                      <img src="${assets}/smo.png" height="42" alt="Society of Medical Students of CICM" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;">
                    </td>
                    <td style="padding:0 7px;">
                      <img src="${assets}/asrc.png" height="42" alt="ASRC 2027" style="display:block;height:42px;width:auto;max-width:72px;object-fit:contain;border:0;">
                    </td>
                  </tr>
                </table>
                <div style="margin-top:16px;font-size:14px;font-weight:700;color:#171717;">
                  Annual Student Research Conference (ASRC) 2027
                </div>
                <div style="margin-top:4px;font-size:12px;line-height:1.6;color:#817b72;">
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

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: getEnvironmentVariable("AUTH_RESEND_KEY"),
  maxAge: 60 * 15,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes as Uint8Array<ArrayBuffer>);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const from = getEnvironmentVariable("AUTH_EMAIL_FROM");
    const assetBaseUrl =
      getEnvironmentVariable("AUTH_EMAIL_ASSET_BASE_URL") ??
      getEnvironmentVariable("SITE_URL");
    if (!provider.apiKey || !from || !assetBaseUrl) {
      throw new Error(
        "AUTH_RESEND_KEY, AUTH_EMAIL_FROM, and SITE_URL must be configured",
      );
    }

    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: "Verify your ASRC 2027 account",
      text: `Your ASRC 2027 verification code is ${token}. It expires in 15 minutes.`,
      html: verificationEmailHtml(token, assetBaseUrl),
    });
    if (error) {
      console.error("Could not send verification email", error);
      throw new Error("Could not send verification email");
    }
  },
});
