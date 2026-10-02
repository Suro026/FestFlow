import Link from "next/link";
import { ArrowRight, ArrowUpRight, QrCode, ScanLine, Sparkles, Trophy, Users } from "lucide-react";
import { FEST_TYPE_LABELS, type Fest, type FestType } from "@/core/models/fest";
import { formatCount } from "@/lib/utils";
import type { HomeData } from "./home-data";

/*
 * The landing page's sections, from the reference's Home.tsx: same markup,
 * same class names, same copy. Server components: nothing here has state.
 * What differs from the reference is only what had to represent Plansphere:
 * links go to real routes, and every number or event comes from real data
 * (or shows an honest empty state), never from the reference's demo values.
 */

const personas = [
  ["01", "students", "Find your next\nbig thing.", "Browse, register, show up.", "/explore"],
  ["02", "event heads", "Run the whole\nshow.", "One calm view of every moving part.", "/register-event"],
  ["03", "volunteers", "Make check-in\nfeel easy.", "Scan, track, keep the day moving.", "/sign-in"],
] as const;

const EVENT_TONES = ["event-photo-one", "event-photo-two", "event-photo-three"] as const;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "14—16 MAR", "02 APR", "28 FEB—02 MAR": the reference's date style, from a fest's real dates. */
const referenceDateRange = (start: string, end: string): string => {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = (end || start).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!end || end === start) return `${pad(sd!)} ${MONTHS[sm! - 1]}`;
  if (sm === em) return `${pad(sd!)}—${pad(ed!)} ${MONTHS[sm! - 1]}`;
  return `${pad(sd!)} ${MONTHS[sm! - 1]}—${pad(ed!)} ${MONTHS[em! - 1]}`;
};

function BarPulse() {
  return (
    <div className="bar-pulse">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

function FlowItem({
  num,
  icon,
  title,
  detail,
  href,
  active = false,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`flow-item ${active ? "flow-active" : ""}`}>
      <span className="flow-num">{num}</span>
      <span className="flow-icon">{icon}</span>
      <span className="flow-detail">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRight size={15} />
    </Link>
  );
}

export function StatementBand() {
  return (
    <section id="signal" className="statement-band">
      <div className="page-width statement-grid">
        <span className="section-index">[ signal / 001 ]</span>
        <h2>
          Events are not
          <br />
          <em>admin.</em> They are energy.
        </h2>
        <p>So we built one place to hold the logistics, leaving everyone free to feel the moment.</p>
      </div>
    </section>
  );
}

export function PlatformSection() {
  return (
    <section id="platform" className="black-section platform-minimal">
      <div className="page-width">
        <div className="section-heading-dark">
          <span className="section-index">[ platform / 002 ]</span>
          <h2>
            Less dashboard.
            <br />
            <span>More direction.</span>
          </h2>
          <p>Every role sees exactly what they need. Nothing more. Nothing in the way.</p>
        </div>
        <div className="persona-grid">
          {personas.map(([number, label, title, copy, href], index) => (
            <Link href={href} className="persona-card" key={number} style={{ animationDelay: `${index * 80}ms` }}>
              <div className="persona-top">
                <span>{number}</span>
                <span>{label}</span>
              </div>
              <div className="persona-visual">
                <div className="persona-grid-lines" />
                <div className={`persona-glyph glyph-${index}`} />
                {index === 0 && <QrCode className="glyph-qr" size={48} strokeWidth={1} />}
                {index === 1 && <BarPulse />}
                {index === 2 && <ScanLine className="glyph-scan" size={70} strokeWidth={1} />}
              </div>
              <div className="persona-bottom">
                <h3>
                  {title.split("\n").map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h3>
                <p>{copy}</p>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FlowSection() {
  return (
    <section id="flow" className="white-section flow-section">
      <div className="page-width flow-layout">
        <div className="flow-copy">
          <span className="section-index">[ the flow / 003 ]</span>
          <h2>
            From first click
            <br />
            to <em>final applause.</em>
          </h2>
          <p>A clean path through the chaos. Registration, entry, live scores, certificates — connected by design.</p>
          <Link href="/for-colleges" className="text-arrow-button">
            Take the product tour <ArrowRight size={16} />
          </Link>
        </div>
        <div className="flow-list">
          <FlowItem num="01" icon={<Users size={17} />} title="Discover & register" detail="A beautiful public catalogue for every event." href="/explore" />
          <FlowItem num="02" icon={<ScanLine size={17} />} title="Show up & scan" detail="One QR pass. Zero friction at the gate." href="/for-colleges" active />
          <FlowItem num="03" icon={<Trophy size={17} />} title="Go live & celebrate" detail="Live scores, results, certificates, done." href="/live" />
        </div>
      </div>
    </section>
  );
}

/** A smooth curve through real per-fest registration counts; null when there is nothing real to draw. */
const graphPath = (values: number[]): string | null => {
  if (values.length < 2 || Math.max(...values) === 0) return null;
  const W = 620;
  const top = 20;
  const bottom = 130;
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, bottom - (v / max) * (bottom - top)] as const);
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const dx = (x1 - x0) / 2;
    d += ` C${(x0 + dx).toFixed(1)},${y0.toFixed(1)} ${(x1 - dx).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
};

/**
 * The reference's dashboard section. Every value is a real platform aggregate;
 * `data === null` is the Suspense fallback, which keeps the structure and
 * shows a dash where a number will land.
 */
export function DashboardSection({ data }: { data: HomeData | null }) {
  const dash = "—";
  const path = data ? graphPath(data.series) : null;

  const statLine = !data
    ? null
    : data.checkIns > 0
      ? { n: data.checkIns, tail: "attendees checked in across Plansphere" }
      : data.registrations > 0
        ? { n: data.registrations, tail: "students registered across Plansphere" }
        : null;

  return (
    <section className="black-section dashboard-minimal">
      <div className="page-width dashboard-minimal-layout">
        <div className="dashboard-minimal-copy">
          <span className="section-index">[ live / 004 ]</span>
          <h2>
            The calm
            <br />
            behind the
            <br />
            <em>chaos.</em>
          </h2>
          <p>Real-time by default. Remarkably human.</p>
          <div className="live-stat">
            <span />
            {statLine ? (
              <>
                <strong>{formatCount(statLine.n)}</strong> {statLine.tail}
              </>
            ) : (
              <>{data ? "Numbers appear here as fests go live" : <strong>{dash}</strong>}</>
            )}
          </div>
        </div>
        <div className="minimal-dashboard">
          <div className="dash-top">
            <span>
              <i /> plansphere / overview
            </span>
            <Link href="/explore">explore ↗</Link>
          </div>
          <div className="dash-title">
            <div>
              <span>{data?.dateLabel ?? dash}</span>
              <strong>Plansphere at a glance</strong>
            </div>
            <b>PS</b>
          </div>
          <div className="dash-kpis">
            <div>
              <span>Registrations</span>
              <strong>{data ? formatCount(data.registrations) : dash}</strong>
              <small>{data ? `across ${formatCount(data.fests.length)} ${data.fests.length === 1 ? "fest" : "fests"}` : " "}</small>
            </div>
            <div>
              <span>Live right now</span>
              <strong>{data ? formatCount(data.liveCount) : dash}</strong>
              <small>{data ? (data.liveCount === 1 ? "fest in progress" : "fests in progress") : " "}</small>
            </div>
            <div>
              <span>Attendance</span>
              <strong>{data ? (data.attendancePct === null ? dash : `${data.attendancePct}%`) : dash}</strong>
              <small>{data ? (data.attendancePct === null ? "once check-in begins" : "of registered, checked in") : " "}</small>
            </div>
          </div>
          <div className="dash-graph">
            <div className="graph-heading">
              <span>Registrations by fest</span>
              <span>in date order</span>
            </div>
            <div className="graph-lines" />
            <svg viewBox="0 0 620 150" preserveAspectRatio="none" aria-hidden>
              {path ? (
                <path d={path} fill="none" stroke="#f3f0e8" strokeWidth="2.5" />
              ) : (
                <path d="M0,130 L620,130" fill="none" stroke="#f3f0e8" strokeWidth="1.5" strokeDasharray="4 8" opacity=".45" />
              )}
            </svg>
            {data && !path && <p className="graph-note">The curve appears once two or more fests have registrations.</p>}
          </div>
          <div className="dash-footer">
            {!data ? (
              <span>
                <i /> {dash}
              </span>
            ) : data.liveFest ? (
              <>
                <span>
                  <i className="green-dot" /> {data.liveFest.name} <b>LIVE</b>
                </span>
                <Link href={`/f/${data.liveFest.slug}`}>open fest ↗</Link>
              </>
            ) : data.nextFest ? (
              <>
                <span>
                  <i className="green-dot" /> Next up: {data.nextFest.name}
                </span>
                <Link href={`/f/${data.nextFest.slug}`}>{referenceDateRange(data.nextFest.startDate, data.nextFest.endDate)} ↗</Link>
              </>
            ) : (
              <span>
                <i className="green-dot" /> No fests live right now
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The reference's events grid, fed real published fests. `fests === null` is the Suspense fallback. */
export function EventsSection({ fests }: { fests: Fest[] | null }) {
  return (
    <section id="colleges" className="white-section events-minimal">
      <div className="page-width">
        <div className="events-minimal-head">
          <div>
            <span className="section-index">[ live on Plansphere / 005 ]</span>
            <h2>
              Make every campus
              <br />
              <em>feel like a world.</em>
            </h2>
          </div>
          <Link href="/explore" className="circle-arrow" aria-label="Explore all fests">
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="minimal-events-grid">
          {fests === null ? (
            EVENT_TONES.map((tone, index) => (
              <article key={tone} className="minimal-event" aria-hidden>
                <div className={`minimal-event-image ${tone}`}>
                  <span>0{index + 1}</span>
                  <div className="event-image-lines" />
                </div>
                <div className="minimal-event-meta">
                  <div>
                    <span>—</span>
                    <h3>&nbsp;</h3>
                  </div>
                </div>
              </article>
            ))
          ) : fests.length ? (
            fests.map((fest, index) => (
              <article key={fest.id} className="minimal-event">
                <Link href={`/f/${fest.slug}`} className="minimal-event-link">
                  <div className={`minimal-event-image ${EVENT_TONES[index % EVENT_TONES.length]}`}>
                    <span>0{index + 1}</span>
                    <div className="event-image-lines" />
                  </div>
                  <div className="minimal-event-meta">
                    <div>
                      <span>
                        {FEST_TYPE_LABELS[(fest.festType ?? "other") as FestType]} / {fest.city}
                      </span>
                      <h3>{fest.name}</h3>
                    </div>
                    <div>
                      <span>{referenceDateRange(fest.startDate, fest.endDate)}</span>
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </Link>
              </article>
            ))
          ) : (
            <div className="minimal-events-empty">
              <strong>No fests published yet</strong>
              <span>When an Event Head registers the first one it appears here, with its dates and a link to register.</span>
              <Link href="/register-event" className="action-button">
                <span>Register the first one</span>
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ClosingBand() {
  return (
    <section className="statement-band statement-band-light">
      <div className="page-width closing-statement">
        <Sparkles size={22} />
        <p>
          “The best events feel effortless.
          <br />
          <em>Plansphere makes the invisible visible.</em>”
        </p>
        <span>— a better way to bring people together</span>
      </div>
    </section>
  );
}
