import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { Kick, MetaList, MetaRow } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What FestFlow stores, who can see it, and how long it stays.",
};

const UPDATED = "12 Sep 2026";

/**
 * Plain-language privacy page, written from what the system actually does.
 * Keep this in step with the Firestore rules and the public lookups: if a
 * field becomes visible somewhere new, it belongs in this page too.
 */
export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-[18px] pb-16 pt-8 sm:px-6 sm:pt-14">
        <Kick className="mb-2">Last updated {UPDATED}</Kick>
        <h1 className="mb-3 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[40px]">Privacy</h1>
        <p className="mb-9 max-w-[56ch] text-[15px] text-neutral-300">
          FestFlow runs college fests: registrations, gate check-in, meals and certificates. This page describes what that involves in terms of your data.
          It is written to be read, not skimmed past.
        </p>

        <Section title="What we store">
          <MetaList>
            <MetaRow label="Account">Name, email, phone, college, and a college ID if you add one. Email is verified before you can register for events.</MetaRow>
            <MetaRow label="Registrations">Which events you registered for, your team and its members’ emails, your ticket code, and whether you paid.</MetaRow>
            <MetaRow label="Attendance">The time and gate at which your pass was scanned, and the staff account that scanned it. Meal collections are recorded the same way.</MetaRow>
            <MetaRow label="Certificates">The certificate itself (name, event, type, position) and a delivery record for the email we send.</MetaRow>
            <MetaRow label="Staff actions">Every override — manual check-in, promotion from a waitlist, a cancelled registration, a revoked certificate — is logged with who did it and when.</MetaRow>
          </MetaList>
        </Section>

        <Section title="Who can see it">
          <MetaList>
            <MetaRow label="You">Everything above that is about you, from your account.</MetaRow>
            <MetaRow label="The fest’s staff">Admins of a fest see registrations, attendance and results for that fest only. Volunteers see only the names on the roster they are scanning.</MetaRow>
            <MetaRow label="Your teammates">Your name and that you are on the team. Not your contact details.</MetaRow>
            <MetaRow label="The public">
              Two pages are public by design: a ticket page showing the holder’s name, event and entry time when a pass is scanned, and a certificate
              verification page showing what is printed on the certificate. Neither shows an email, phone number or college ID.
            </MetaRow>
          </MetaList>
        </Section>

        <Section title="Where it lives">
          <p>
            Data is stored in Google Firebase (Firestore, Authentication and Cloud Storage) and served through Vercel. Access is enforced by security
            rules on the database itself, not only by the app: a request that a rule does not allow is refused whatever screen it came from.
          </p>
          <p>
            We send transactional email — verification, password reset, staff invitations, certificate delivery. We do not send marketing email and we do
            not sell or share your data with advertisers.
          </p>
        </Section>

        <Section title="How long it stays">
          <p>
            Registrations, attendance and certificates form the institutional record of a fest and are kept for as long as the hosting college needs
            them — a certificate’s verification link is expected to keep working for years. You can close your account at any time from your profile;
            that removes your login and contact details, while certificates already issued in your name stay verifiable.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            Write to <a href="mailto:privacy@plansphere.in">privacy@plansphere.in</a>. For anything about a specific fest — a wrong name on a certificate,
            a registration you did not make — the fest’s contact address on its page is faster, since only its admins can change that record.
          </p>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-9">
    <h4 className="mb-3">{title}</h4>
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-neutral-300 [&_p]:max-w-[60ch]">{children}</div>
  </section>
);
