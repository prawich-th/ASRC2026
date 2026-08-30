This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Registration payments

Abstract submission uses a one-time Stripe Checkout payment. Configure these
environment variables on each Convex deployment before enabling payment:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_REGISTRATION_PRICE_ID=price_...
SITE_URL=https://your-site.example
```

Create a one-time registration product and price in Stripe, then use that price
ID for `STRIPE_REGISTRATION_PRICE_ID`. Add the Convex webhook endpoint below in
Stripe and subscribe it to `checkout.session.completed`,
`payment_intent.succeeded`, and `payment_intent.payment_failed`:

```text
https://<your-convex-deployment>.convex.site/stripe/webhook
```

The webhook signing secret shown by Stripe is `STRIPE_WEBHOOK_SECRET`. Users can
save drafts before paying, but Convex rejects abstract submission until a
successful registration payment is recorded or a super admin waives the fee on
the Users admin page.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
