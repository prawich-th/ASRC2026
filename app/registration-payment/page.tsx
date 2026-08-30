import RegistrationPaymentPageClient from "./registration-payment-page-client";

type RegistrationPaymentPageProps = {
  searchParams: Promise<{ payment?: string | string[] }>;
};

export default async function RegistrationPaymentPage({
  searchParams,
}: RegistrationPaymentPageProps) {
  const { payment } = await searchParams;
  const paymentResult = Array.isArray(payment) ? payment[0] : payment;

  return <RegistrationPaymentPageClient paymentResult={paymentResult} />;
}
