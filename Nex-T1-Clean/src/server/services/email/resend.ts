import { Resend } from "resend";

let client: Resend | null = null;

function getResend() {
  if (client) {
    return client;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  client = new Resend(apiKey);
  return client;
}

export async function sendEmailDigest(options: { to: string; subject: string; html: string }) {
  const resend = getResend();
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Nex Automations <digest@nex-t1.ai>",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

/**
 * Send a transactional email (OTP verification, account linking, etc.).
 * Uses the same Resend client and from address as digest emails.
 */
export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ??
      "Nex Automations <noreply@nex-t1.ai>",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

/**
 * Send an OTP verification code email for account linking flows.
 */
export async function sendOtpEmail(options: {
  to: string;
  otpCode: string;
  expiresInMinutes?: number;
}) {
  const minutes = options.expiresInMinutes ?? 10;
  const subject = `Your Nex verification code: ${options.otpCode}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #111; margin-bottom: 16px;">Verify your email</h2>
      <p style="color: #444; font-size: 16px; line-height: 1.5;">
        Use the following verification code to link your email to your Nex account:
      </p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">${options.otpCode}</span>
      </div>
      <p style="color: #666; font-size: 14px;">
        This code expires in ${minutes} minutes. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `.trim();

  await sendTransactionalEmail({ to: options.to, subject, html });
}

