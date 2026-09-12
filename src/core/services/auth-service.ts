import type { UserRole } from "../models/user";

/**
 * Authentication, as an interface.
 *
 * The web app implements it over the Firebase Web SDK and the Expo app will
 * implement it over the React Native one. Screens depend on this shape only,
 * so the sign-in form is the same component on both.
 */

export interface Session {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  /** From the ID token's custom claims; "student" when absent. */
  role: UserRole;
  festIds: string[];
}

export type AuthErrorCode =
  | "invalid-credentials"
  | "user-not-found"
  | "email-in-use"
  | "weak-password"
  | "too-many-requests"
  | "network"
  | "expired-link"
  | "user-disabled"
  | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthService {
  /** Current session, or null. Resolves after the SDK has restored state. */
  getSession(): Promise<Session | null>;

  /** Fires immediately with the current state, then on every change. */
  onSessionChange(listener: (session: Session | null) => void): () => void;

  signIn(email: string, password: string): Promise<Session>;

  /**
   * Creates the account and sends the verification email. Does not write the
   * profile document — the caller does that through `UserRepository`, so the
   * two steps can be retried independently.
   */
  signUp(email: string, password: string, displayName: string): Promise<Session>;

  signOut(): Promise<void>;

  sendVerificationEmail(): Promise<void>;

  /** Re-reads the token so a fresh custom claim takes effect without a sign-out. */
  refreshSession(): Promise<Session | null>;

  sendPasswordReset(email: string): Promise<void>;

  /** Validates a reset/invite code and returns the address it was sent to. */
  verifyPasswordResetCode(code: string): Promise<string>;

  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /** Applies an email-verification code from a link. */
  applyEmailVerification(code: string): Promise<void>;

  /** Fresh ID token for calling the app's own API. */
  getIdToken(): Promise<string | null>;
}
