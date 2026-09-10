import type { Page, PageRequest, Unsubscribe } from "../models/common";
import type {
  Certificate,
  CertificateDraft,
  CertificateType,
  DeliveryStatus,
} from "../models/certificate";

export interface CertificateQuery extends PageRequest {
  userId?: string;
  eventId?: string;
  festId?: string;
  type?: CertificateType;
  deliveryStatus?: DeliveryStatus;
  /** Revoked certificates are excluded unless this is explicitly true. */
  includeRevoked?: boolean;
}

export interface CertificateRepository {
  getById(id: string): Promise<Certificate | null>;

  /** Public verification by the number printed on the certificate. */
  getByCertificateNumber(certificateNumber: string): Promise<Certificate | null>;

  list(query?: CertificateQuery): Promise<Page<Certificate>>;

  /**
   * A student's own certificates. Returns only issued, unrevoked ones, so a
   * student who was not eligible sees an empty list rather than a placeholder
   * for something they did not earn.
   */
  listForUser(userId: string): Promise<Certificate[]>;

  subscribeForUser(
    userId: string,
    onChange: (certificates: Certificate[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  /**
   * Writes a batch of drafts as issued certificates.
   *
   * Each is keyed `${eventId}_${userId}`, so re-running generation for an
   * event updates the existing rows instead of issuing duplicates. Returns
   * both what it created and what already existed, which is what lets the
   * dashboard say "42 issued, 8 already had one" after a re-publish.
   */
  issueMany(
    drafts: CertificateDraft[],
    issuedBy: string,
  ): Promise<{ created: Certificate[]; existing: Certificate[] }>;

  attachFile(id: string, fileUrl: string): Promise<void>;

  markDelivery(
    id: string,
    delivery: { status: DeliveryStatus; error?: string },
  ): Promise<void>;

  /** Certificates still waiting to be emailed, for the delivery worker. */
  listPendingDelivery(limit?: number): Promise<Certificate[]>;

  revoke(id: string, reason: string): Promise<void>;

  countByEvent(eventId: string): Promise<number>;

  countByFest(festId: string): Promise<number>;
}
