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

## Boxicons Pro authentication

The private `@boxicons-pro` dependency requires a Boxicons Pro API key.
The committed `.npmrc` reads it from `BOXICONS_TOKEN`; never put the key in
tracked files or use a `NEXT_PUBLIC_` variable for it.

In Vercel, add `BOXICONS_TOKEN` under Project Settings → Environment Variables
for Production and Preview (and Development if needed), then redeploy.
Use a valid API key from an account with an active Boxicons Pro subscription.

For local installs, export `BOXICONS_TOKEN` in your shell before running
`npm install` or `bun install`. npm does not automatically load `.env.local`.
The previous local registry configuration is preserved in the ignored
`.npmrc.local` file; it is a backup and is not loaded automatically.
