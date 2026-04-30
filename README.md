# RecyTech

RecyTech is an India-first e-waste marketplace for selling old electronics, buying reusable spare parts, and helping repair shops, refurbishers, and recycling partners source components responsibly.

## Features

- Buyer and seller authentication
- E-waste and electronics listing creation
- Marketplace search and filtering
- Listing detail pages
- Seller dashboard
- Buyer inquiries
- Admin listing approval
- File-based backend persistence for simple local development

## Run Locally

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Demo Accounts

```text
Admin: admin@recytech.in / admin123
Seller: seller@recytech.in / seller123
Buyer: buyer@recytech.in / buyer123
```

## Email OTP Setup

Create account uses OTP verification.

For local testing without email settings, RecyTech shows a test OTP on the create account page. To send real OTP emails for free with Gmail SMTP, create a `.env` file using `.env.example`:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
```

On Vercel, add the same values in **Project Settings > Environment Variables**.

Use a Gmail App Password, not your normal Gmail password.

## Deploy On Vercel

1. Push this repository to GitHub.
2. Open Vercel and choose **Add New Project**.
3. Import the `RecyTech` GitHub repository.
4. Keep the framework preset as **Other**.
5. Deploy.

The frontend is served from `public/`, and `/api/*` requests are handled by the Vercel serverless function in `api/index.js`.

Note: the current demo uses file-based storage. On Vercel, demo data can reset when serverless functions restart. For production, connect MongoDB Atlas or another hosted database.
