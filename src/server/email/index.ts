import type { EmailMessage, EmailResult, EmailService } from "./types";

export type { EmailMessage, EmailResult, EmailService, EmailAttachment } from "./types";

/**
 * Logs the message instead of sending it.
 *
 * `canSend` is false, which is what the certificate pipeline reads to mark
 * deliveries `skipped` rather than `sent`. Nothing then claims an email went
 * out when none did — the certificates are still issued and still appear under
 * "My Certificates", and the pending deliveries can be flushed once a real
 * provider is configured.
 */
class ConsoleEmailService implements EmailService {
  readonly name = "console";
  readonly canSend = false;

  async send(message: EmailMessage): Promise<EmailResult> {
    const attachments = message.attachments?.length
      ? ` [${message.attachments.length} attachment(s): ${message.attachments
          .map((a) => a.filename)
          .join(", ")}]`
      : "";

    console.info(`[email:console] -> ${message.to} :: ${message.subject}${attachments}`);

    return { ok: true, id: `console-${Date.now()}` };
  }

  async sendMany(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map((message) => this.send(message)));
  }
}

/**
 * Resend. Enabled by setting EMAIL_PROVIDER=resend, RESEND_API_KEY and
 * EMAIL_FROM.
 *
 * Called over plain fetch rather than through the SDK: it is one endpoint, and
 * this keeps a dependency out of the tree until the provider is actually
 * chosen.
 */
class ResendEmailService implements EmailService {
  readonly name = "resend";
  readonly canSend: boolean;

  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
    this.canSend = Boolean(apiKey && from);
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          ...(message.attachments?.length
            ? {
                attachments: message.attachments.map((attachment) => ({
                  filename: attachment.filename,
                  content: attachment.content.toString("base64"),
                })),
              }
            : {}),
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { id?: string };
        return { ok: true, ...(body.id ? { id: body.id } : {}) };
      }

      const detail = await response.text();

      // 429 and 5xx are worth another attempt; a rejected address is not.
      return {
        ok: false,
        error: `Resend responded ${response.status}: ${detail.slice(0, 300)}`,
        retryable: response.status === 429 || response.status >= 500,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Network error",
        retryable: true,
      };
    }
  }

  async sendMany(messages: EmailMessage[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Sequential in small batches: Resend's free tier allows 2 requests per
    // second, and a certificate run is hundreds of messages. Going wide here
    // would trip the limit and mark good addresses as failures.
    for (const message of messages) {
      results.push(await this.send(message));
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    return results;
  }
}

let cached: EmailService | null = null;

/** Resolves the configured provider once per process. */
export const emailService = (): EmailService => {
  if (cached) return cached;

  const provider = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    const from = process.env.EMAIL_FROM ?? "";

    if (!apiKey || !from) {
      console.warn(
        "[email] EMAIL_PROVIDER=resend but RESEND_API_KEY or EMAIL_FROM is missing; " +
          "falling back to console.",
      );
      cached = new ConsoleEmailService();
      return cached;
    }

    cached = new ResendEmailService(apiKey, from);
    return cached;
  }

  if (provider !== "console") {
    console.warn(`[email] Unknown EMAIL_PROVIDER "${provider}"; falling back to console.`);
  }

  cached = new ConsoleEmailService();
  return cached;
};
