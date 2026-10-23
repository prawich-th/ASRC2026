import Resend from "@auth/core/providers/resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";
import {
  EmailContent,
  passwordResetEmail,
  verificationEmail,
} from "./lib/emailTemplates";

function getEnvironmentVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
}

function codeEmailProvider(
  id: string,
  render: (args: { token: string }) => EmailContent,
) {
  return Resend({
    id,
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
    async sendVerificationRequest({ identifier, provider, token }) {
      const from = getEnvironmentVariable("AUTH_EMAIL_FROM");
      if (!provider.apiKey || !from) {
        throw new Error("AUTH_RESEND_KEY and AUTH_EMAIL_FROM must be configured");
      }

      const resend = new ResendAPI(provider.apiKey);
      const message = render({ token });
      const { error } = await resend.emails.send({
        from,
        to: [identifier],
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      if (error) {
        console.error(`Could not send ${id} email`, error);
        throw new Error("Could not send the email with your code");
      }
    },
  });
}

export const ResendOTP = codeEmailProvider("resend-otp", verificationEmail);

export const ResendOTPPasswordReset = codeEmailProvider(
  "resend-otp-password-reset",
  passwordResetEmail,
);
