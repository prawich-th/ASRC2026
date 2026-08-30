import { components } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export const REGISTRATION_FEE_PURPOSE = "asrc2027_registration_fee";

function isRegistrationFeePayment(payment: {
  status: string;
  metadata?: unknown;
}): boolean {
  if (payment.status !== "succeeded") {
    return false;
  }
  const metadata = payment.metadata;
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "purpose" in metadata &&
    metadata.purpose === REGISTRATION_FEE_PURPOSE
  );
}

export async function hasPaidRegistrationFee(
  ctx: QueryCtx | MutationCtx,
  userId: Doc<"users">["_id"],
): Promise<boolean> {
  const payments = await ctx.runQuery(
    components.stripe.public.listPaymentsByUserId,
    { userId },
  );
  return payments.some(isRegistrationFeePayment);
}

export async function canSubmitAbstract(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<{ eligible: boolean; paid: boolean; waived: boolean }> {
  const waived = user.registrationFeeWaived === true;
  if (waived) {
    return { eligible: true, paid: false, waived: true };
  }
  const paid = await hasPaidRegistrationFee(ctx, user._id);
  return { eligible: paid, paid, waived: false };
}
