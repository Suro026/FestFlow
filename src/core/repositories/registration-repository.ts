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

  /** Every entry for one event, unpaged — the scanner's offline roster. */
  listForEvent(eventId: string): Promise<Registration[]>;

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
  create(input: CreateRegistrationInput): Promise<Registration>;

  /** Cancels the caller's own entry and releases its seats in the same transaction. */
  cancel(id: string): Promise<void>;

  /**
   * Staff actions on one entry — promote from the waitlist, or cancel on the
   * holder's behalf. Admin-only, transactional against the event, audited.
   */
  staffAction(id: string, action: "promote" | "cancel", reason?: string): Promise<"promoted" | "cancelled" | "noop">;

  /** True when this user already holds a confirmed entry for the event. */
  existsForUserAndEvent(userId: string, eventId: string): Promise<boolean>;

  countByEvent(eventId: string): Promise<number>;

  countByFest(festId: string): Promise<number>;

  /**
   * Backfills `members[].userId` on entries where the caller was named by
   * email before they had an account. Called once after sign-up, so a
   * teammate's certificate can reach them. Returns how many entries changed.
   */
  linkMemberAccountsByEmail(): Promise<number>;
}
