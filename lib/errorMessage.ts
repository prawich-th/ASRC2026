/** Messages for the error codes @convex-dev/auth throws during sign-in flows. */
const AUTH_ERRORS: Record<string, string> = {
  InvalidAccountId: "We couldn't find an account with that email.",
  InvalidSecret: "The email or password is incorrect.",
  "Invalid credentials": "The email or password is incorrect.",
  TooManyFailedAttempts:
    "Too many failed attempts. Please wait a few minutes and try again.",
  "Invalid code": "That code is incorrect or has expired.",
  "Invalid verification code": "That code is incorrect or has expired.",
  "Invalid password": "Passwords must be at least 8 characters.",
};

/**
 * Turns an error thrown by a Convex function or auth call into text a person
 * can read, dropping the "[CONVEX M(...)] Uncaught Error:" wrapper.
 */
export function errorMessage(caught: unknown, fallback: string): string {
  if (!(caught instanceof Error)) {
    return fallback;
  }
  const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
  const message = (match?.[1] ?? caught.message).trim();
  for (const [code, friendly] of Object.entries(AUTH_ERRORS)) {
    if (message === code || message.startsWith(`${code} `)) {
      return friendly;
    }
  }
  if (!message || message === "Server Error") {
    return fallback;
  }
  return message;
}
