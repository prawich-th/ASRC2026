const TEST_API_KEY = "re_test_notifications";

export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

export function getResendApiKey(): string | undefined {
  return (
    process.env.RESEND_API_KEY ??
    process.env.AUTH_RESEND_KEY ??
    (isTestEnvironment() ? TEST_API_KEY : undefined)
  );
}
