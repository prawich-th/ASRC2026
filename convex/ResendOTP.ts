import Resend from "@auth/core/providers/resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";
import { verificationEmail } from "./lib/emailTemplates";

function getEnvironmentVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
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
    const message = verificationEmail({ token });
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (error) {
      console.error("Could not send verification email", error);
      throw new Error("Could not send verification email");
    }
  },
});
