import type { EmailMessage } from "./types";
import { CERTIFICATE_LABELS, type CertificateType } from "@/core/models/certificate";

/**
 * Email bodies.
 *
 * Deliberately plain HTML with inline styles and a real text alternative:
 * mail clients strip stylesheets, and a certificate notice that renders as a
 * blank page is worse than one that renders as plain text.
 */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const appUrl = (): string => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const shell = (heading: string, body: string): string => `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6f7fb;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e6e8f0">
    <h1 style="margin:0 0 16px;font-size:20px;color:#111827">${escapeHtml(heading)}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #e6e8f0;margin:28px 0" />
    <p style="margin:0;font-size:12px;color:#6b7280">
      FestFlow — sent automatically, please do not reply.
    </p>
  </div>
</div>`;

const button = (href: string, label: string): string => `
  <p style="margin:24px 0">
    <a href="${escapeHtml(href)}"
       style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(label)}</a>
  </p>`;

/**
 * Invitation for a newly created organizer or admin.
 *
 * Carries a password-set link rather than a password. A password mailed in
 * plain text sits in the recipient's inbox indefinitely, and the sender has no
 * way to withdraw it; a link expires.
 */
export const staffInviteEmail = (input: {
  to: string;
  fullName: string;
  roleLabel: string;
  setPasswordLink: string;
  invitedBy: string;
}): EmailMessage => {
  const text = [
    `Hello ${input.fullName},`,
    "",
    `You have been added to FestFlow as ${input.roleLabel} by ${input.invitedBy}.`,
    "",
    "Set your password using the link below, then sign in:",
    input.setPasswordLink,
    "",
    "This link expires. If it has, ask for a new invitation.",
    "",
    "— FestFlow",
  ].join("\n");

  const html = shell(
    "You've been added to FestFlow",
    `<p style="margin:0 0 8px;color:#374151">Hello ${escapeHtml(input.fullName)},</p>
     <p style="margin:0;color:#374151">
       You have been added as <strong>${escapeHtml(input.roleLabel)}</strong>
       by ${escapeHtml(input.invitedBy)}. Set your password to activate the account.
     </p>
     ${button(input.setPasswordLink, "Set your password")}
     <p style="margin:0;font-size:13px;color:#6b7280">
       This link expires. If it no longer works, ask for a new invitation.
     </p>`,
  );

  return { to: input.to, subject: "You've been added to FestFlow", text, html };
};

/** Sent once a certificate has been issued to a student. */
export const certificateIssuedEmail = (input: {
  to: string;
  recipientName: string;
  eventTitle: string;
  festName: string;
  type: CertificateType;
  certificateNumber: string;
  attachmentFilename?: string;
}): EmailMessage => {
  const label = CERTIFICATE_LABELS[input.type];
  const link = `${appUrl()}/my-certificates`;

  const text = [
    `Hello ${input.recipientName},`,
    "",
    `Your ${label} for "${input.eventTitle}" at ${input.festName} is ready.`,
    `Certificate number: ${input.certificateNumber}`,
    "",
    input.attachmentFilename
      ? "The PDF is attached, and it is also available in your FestFlow account:"
      : "You can download it from your FestFlow account:",
    link,
    "",
    "Congratulations!",
    "— FestFlow",
  ].join("\n");

  const html = shell(
    "Your certificate is ready",
    `<p style="margin:0 0 8px;color:#374151">Hello ${escapeHtml(input.recipientName)},</p>
     <p style="margin:0;color:#374151">
       Your <strong>${escapeHtml(label)}</strong> for
       "${escapeHtml(input.eventTitle)}" at ${escapeHtml(input.festName)} is ready.
     </p>
     <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
       Certificate number: <code>${escapeHtml(input.certificateNumber)}</code>
     </p>
     ${button(link, "View in FestFlow")}`,
  );

  return {
    to: input.to,
    subject: `Your ${label} — ${input.eventTitle}`,
    text,
    html,
  };
};

/** Confirmation sent after a successful event registration. */
export const registrationConfirmedEmail = (input: {
  to: string;
  recipientName: string;
  eventTitle: string;
  festName: string;
  date: string;
  startTime: string;
  venue: string;
  ticketCode: string;
  teamName?: string;
}): EmailMessage => {
  const link = `${appUrl()}/my-events`;

  const text = [
    `Hello ${input.recipientName},`,
    "",
    `You're registered for "${input.eventTitle}" at ${input.festName}.`,
    "",
    `Date:   ${input.date} at ${input.startTime}`,
    `Venue:  ${input.venue}`,
    ...(input.teamName ? [`Team:   ${input.teamName}`] : []),
    `Ticket: ${input.ticketCode}`,
    "",
    "Bring your QR ticket to the venue for check-in:",
    link,
    "",
    "— FestFlow",
  ].join("\n");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${escapeHtml(value)}</td>
    </tr>`;

  const html = shell(
    "Registration confirmed",
    `<p style="margin:0 0 16px;color:#374151">
       Hello ${escapeHtml(input.recipientName)}, you're registered for
       <strong>${escapeHtml(input.eventTitle)}</strong>.
     </p>
     <table style="border-collapse:collapse">
       ${row("Date", `${input.date} at ${input.startTime}`)}
       ${row("Venue", input.venue)}
       ${input.teamName ? row("Team", input.teamName) : ""}
       ${row("Ticket", input.ticketCode)}
     </table>
     ${button(link, "View your QR ticket")}`,
  );

  return { to: input.to, subject: `Registered — ${input.eventTitle}`, text, html };
};
