import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const isConfigured = Boolean(apiKey && !apiKey.includes("placeholder"));

export const resend = isConfigured ? new Resend(apiKey) : null;

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailPayload) {
  const from = process.env.EMAIL_FROM || "DIU Registration <noreply@registration.diu.edu.bd>";

  if (!resend) {
    // Development / test fallback logging
    console.warn(
      `[Resend Email Mock] RESEND_API_KEY not configured. Simulated dispatch:`,
      { from, to, subject }
    );
    return {
      success: true,
      id: "mock_email_" + Math.random().toString(36).substring(2, 9),
      mocked: true,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Resend Error]", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Resend Exception]", message);
    return { success: false, error: message };
  }
}

export function generateRegistrationSubmittedEmail(params: {
  studentName: string;
  studentId: string;
  semesterName: string;
  courseCount: number;
}) {
  return {
    subject: `[DIU Registration] Application Submitted - ${params.semesterName}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #006a4e; padding: 16px; border-radius: 6px; text-align: center; color: white; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">Daffodil International University</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Course Registration Portal</p>
        </div>
        <h3 style="color: #0f172a;">Course Registration Received</h3>
        <p>Dear <strong>${params.studentName}</strong> (ID: ${params.studentId}),</p>
        <p>Your course registration application for <strong>${params.semesterName}</strong> with <strong>${params.courseCount}</strong> course section(s) has been successfully submitted and forwarded to your academic advisor for review.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #006a4e; padding: 12px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;">
            You will receive an automated email notification once your advisor has reviewed your schedule.
          </p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center;">
          This is an automated notification from the DIU Course Registration Platform. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };
}
