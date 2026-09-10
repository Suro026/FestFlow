import type { Page, PageRequest, Unsubscribe } from "../models/common";
import type {
  CreateRegistrationInput,
  Registration,
  RegistrationStatus,
  RegistrationWithEvent,
} from "../models/registration";

export interface RegistrationQuery extends PageRequest {
  eventId?: string;
  festId?: string;
  userId?: string;
  status?: RegistrationStatus;
  /** Matches name, email or ticket code, for the admin's search box. */
  search?: string;
}

export interface RegistrationRepository {
  getById(id: string): Promise<Registration | null>;

  /** Used by both scanners to resolve a scanned QR payload. */
  getByTicketCode(ticketCode: string): Promise<Registration | null>;

  list(query?: RegistrationQuery): Promise<Page<Registration>>;

  /** A student's own entries, joined with their events, for "My Events". */
  listForUserWithEvents(userId: string): Promise<RegistrationWithEvent[]>;

  subscribe(
    query: RegistrationQuery,
    onChange: (registrations: Registration[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  /**
   * Registers an entry.
   *
   * Runs as a transaction that re-reads the event and, in one atomic step:
   * re-checks that registration is open, that capacity is not exceeded, and
   * that this user has no existing entry, then writes the registration and
   * increments `registeredCount`. Doing it any other way lets two students
   * take the last seat at the same moment.
   *
   * Rejects with `already-exists` if the user is already registered, and with
   * `failed-precondition` if the event is closed or full.
   */
  create(
    input: CreateRegistrationInput,
    registrant: { id: string; name: string; email: string },
  ): Promise<Registration>;

  /** Cancels an entry and releases its seat in the same transaction. */
  cancel(id: string, userId: string): Promise<void>;

  /** True when this user already holds a confirmed entry for the event. */
  existsForUserAndEvent(userId: string, eventId: string): Promise<boolean>;

  countByEvent(eventId: string): Promise<number>;

  countByFest(festId: string): Promise<number>;

  /**
   * Backfills `members[].userId` for teammates who were entered by email and
   * have since created an account. Called after a student signs up, so their
   * teammate's certificate can reach them.
   */
  linkMemberAccountsByEmail(email: string, userId: string): Promise<number>;
}
