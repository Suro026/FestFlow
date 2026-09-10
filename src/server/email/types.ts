/**
 * Email delivery, behind an interface.
 *
 * No provider is wired up yet by deliberate choice, so the certificate
 * pipeline is written, complete and testable now, and picking Resend or SMTP
 * later is a change to one factory function rather than to the pipeline.
 *
 * Implementations must not throw for an ordinary delivery failure. A bounced
 * address is normal at fest scale and must not abort a run of four hundred
 * certificates — it is reported per-recipient and recorded on the certificate
 * so it can be retried.
 */

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always provide one; some clients show only this. */
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export type EmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; retryable: boolean };

export interface EmailService {
  /** Human-readable name of the active provider, for logs and the health route. */
  readonly name: string;

  /** True when the provider is configured well enough to actually send. */
  readonly canSend: boolean;

  send(message: EmailMessage): Promise<EmailResult>;

  /**
   * Sends a batch, returning one result per message in the same order.
   * Implementations may parallelise, but must respect their provider's rate
   * limit rather than firing four hundred requests at once.
   */
  sendMany(messages: EmailMessage[]): Promise<EmailResult[]>;
}
