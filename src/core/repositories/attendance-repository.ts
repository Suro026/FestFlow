import type { Unsubscribe } from "../models/common";
import type {
  Attendance,
  FoodCollection,
  MealType,
  ScanOutcome,
} from "../models/attendance";

/**
 * Attendance and meal scanning.
 *
 * Both `recordScan` and `recordMeal` return a `ScanOutcome` rather than
 * throwing on a duplicate. A second scan is an ordinary, expected event at a
 * busy gate — the operator needs a clear "already checked in at 10:42", not an
 * exception — while a genuine failure (offline, no permission) still rejects.
 */
export interface AttendanceRepository {
  /**
   * Checks a participant in by ticket code.
   *
   * The write uses the registration id as the attendance document id and
   * creates only if absent, so two volunteers scanning the same ticket at the
   * same instant cannot both succeed.
   */
  recordScan(input: {
    ticketCode: string;
    eventId: string;
    scannedBy: string;
    method?: "qr" | "manual";
  }): Promise<ScanOutcome>;

  getByRegistration(registrationId: string): Promise<Attendance | null>;

  listByEvent(eventId: string): Promise<Attendance[]>;

  /** Registration ids that attended, for the certificate eligibility pass. */
  attendedRegistrationIds(eventId: string): Promise<Set<string>>;

  /** Live check-in feed shown beside the scanner. */
  subscribeByEvent(
    eventId: string,
    onChange: (records: Attendance[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  countByEvent(eventId: string): Promise<number>;

  /** Undoes a mistaken check-in. Organizer-only. */
  remove(registrationId: string): Promise<void>;

  /**
   * Records a meal handout. Keyed by entry, day and meal slot, so the same
   * person cannot collect the same meal twice.
   */
  recordMeal(input: {
    ticketCode: string;
    eventId: string;
    mealType: MealType;
    servedOn: string;
    collectedBy: string;
  }): Promise<ScanOutcome>;

  listMealsByEvent(eventId: string, servedOn?: string): Promise<FoodCollection[]>;

  countMeals(eventId: string, servedOn?: string, mealType?: MealType): Promise<number>;
}
