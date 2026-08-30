import PaymentPageClient from "./payment-page-client";

type PaymentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string | string[] }>;
};

export default async function PaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { id } = await params;
  const { payment } = await searchParams;
  const paymentResult = Array.isArray(payment) ? payment[0] : payment;

  return <PaymentPageClient abstractId={id} paymentResult={paymentResult} />;
}
