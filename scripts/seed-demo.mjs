/**
 * Seeds the demo content the design canvas was drawn with — Ignitia ’26 and
 * its events, plus two more fests for the explorer — so the app has something
 * real to render during development.
 *
 *   npm run seed:demo            # create (skips anything that already exists)
 *   npm run seed:demo -- --reset # delete demo docs first, then create
 *
 * Only touches documents whose id starts with "demo-", so it is safe to run
 * against a project that also holds real data. Requires FIREBASE_SERVICE_ACCOUNT.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const reset = process.argv.includes("--reset");

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw?.trim()) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.\n");
  process.exit(1);
}
const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
const account = JSON.parse(trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: account.project_id,
  });
}

const db = getFirestore();
const now = FieldValue.serverTimestamp();

// Dates relative to today so "LIVE NOW" and "Closing soon" actually light up.
const today = new Date();
const ymd = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const SYSTEM_UID = "demo-seed";

const fests = [
  {
    id: "demo-ignitia-26",
    slug: "ignitia-26",
    name: "Ignitia ’26",
    tagline: "Three days, 42 events, one pass.",
    description:
      "Three days, 42 events, one pass. Register once and every ticket, meal slot and certificate lives in one place.",
    organizationName: "SRM Institute of Science & Technology",
    venue: "Kattankulathur campus",
    city: "Chennai",
    startDate: ymd(-1),
    endDate: ymd(1),
    status: "published",
    contactEmail: "ignitia@srmist.edu.in",
    stats: { events: 6, registrations: 6412, checkIns: 2188 },
  },
  {
    id: "demo-bits2bytes",
    slug: "bits2bytes",
    name: "Bits2Bytes",
    tagline: "Anna University’s flagship technical fest.",
    organizationName: "Anna University, Guindy",
    venue: "CEG campus",
    city: "Chennai",
    startDate: ymd(8),
    endDate: ymd(9),
    status: "published",
    stats: { events: 1, registrations: 2050, checkIns: 0 },
  },
  {
    id: "demo-rangmanch-26",
    slug: "rangmanch-26",
    name: "Rangmanch ’26",
    tagline: "Cultural fest of Loyola College.",
    organizationName: "Loyola College, Nungambakkam",
    venue: "Loyola campus",
    city: "Chennai",
    startDate: ymd(15),
    endDate: ymd(17),
    status: "published",
    stats: { events: 0, registrations: 3180, checkIns: 0 },
  },
  {
    id: "demo-zenith",
    slug: "zenith",
    name: "Zenith",
    organizationName: "SSN College of Engineering",
    venue: "SSN campus",
    city: "Chennai",
    startDate: ymd(22),
    endDate: ymd(24),
    status: "published",
    stats: { events: 0, registrations: 1240, checkIns: 0 },
  },
];

const events = [
  {
    id: "demo-codeflow-12hr",
    festId: "demo-ignitia-26",
    slug: "codeflow-12hr",
    title: "Codeflow 12hr Hackathon",
    description:
      "Twelve hours, one problem statement released at the start, and a working demo at the end. Teams build on any stack; judging is on the demo, not the slide deck.",
    category: "hackathon",
    eventType: "team",
    teamSize: { min: 2, max: 4 },
    date: ymd(0),
    startTime: "09:00",
    endTime: "21:00",
    venue: "Tech Park Auditorium",
    capacity: 120,
    registeredCount: 103,
    registrationOpen: true,
    registrationDeadline: ymd(0),
    waitlistEnabled: true,
    entryFee: 0,
    rules: [
      "Teams of 2 to 4, open to students from any college.",
      "Pre-built code allowed if the repository is public before the event.",
      "One entry per person across all hackathon-category events.",
      "Demos are 5 minutes; overruns are cut.",
    ],
    prizes: ["₹60,000 pool · internship shortlist for the top 3 teams"],
    coordinators: [
      { name: "Nikhil Prasad", phone: "+91 98410 22114" },
      { name: "Sneha Iyer", email: "sneha.iyer@srmist.edu.in" },
    ],
    gates: ["Gate A", "Gate B"],
    mealSlots: [
      { date: ymd(0), mealType: "lunch", label: "Day 1 lunch" },
      { date: ymd(0), mealType: "dinner", label: "Day 1 dinner" },
      { date: ymd(1), mealType: "breakfast", label: "Day 2 breakfast" },
    ],
    status: "ongoing",
  },
  {
    id: "demo-battle-of-bands",
    festId: "demo-ignitia-26",
    slug: "battle-of-bands",
    title: "Battle of Bands",
    description: "Open-air, six bands, one night.",
    category: "cultural",
    eventType: "solo",
    teamSize: { min: 1, max: 1 },
    date: ymd(0),
    startTime: "18:30",
    endTime: "21:00",
    venue: "Open Air Theatre",
    capacity: 600,
    registeredCount: 384,
    registrationOpen: true,
    registrationDeadline: ymd(0),
    entryFee: 0,
    gates: ["Open Air Theatre"],
    status: "published",
  },
  {
    id: "demo-valorant-lan",
    festId: "demo-ignitia-26",
    slug: "valorant-lan-cup",
    title: "Valorant LAN Cup",
    category: "gaming",
    eventType: "team",
    teamSize: { min: 5, max: 5 },
    date: ymd(1),
    startTime: "11:00",
    endTime: "18:00",
    venue: "Lab 4",
    capacity: 120,
    registeredCount: 90,
    registrationOpen: true,
    registrationDeadline: ymd(1),
    waitlistEnabled: true,
    entryFee: 0,
    status: "published",
  },
  {
    id: "demo-robotics-bootcamp",
    festId: "demo-ignitia-26",
    slug: "robotics-bootcamp",
    title: "Robotics Bootcamp",
    category: "workshop",
    eventType: "solo",
    teamSize: { min: 1, max: 1 },
    date: ymd(-1),
    startTime: "14:00",
    endTime: "17:00",
    venue: "MECH 201",
    capacity: 60,
    registeredCount: 60,
    registrationOpen: false,
    waitlistEnabled: true,
    entryFee: 0,
    status: "completed",
  },
  {
    id: "demo-quiz-prelims",
    festId: "demo-ignitia-26",
    slug: "quiz-prelims",
    title: "Quiz Prelims",
    category: "technical",
    eventType: "team",
    teamSize: { min: 2, max: 2 },
    date: ymd(-1),
    startTime: "10:00",
    endTime: "12:00",
    venue: "Main Auditorium",
    capacity: 300,
    registeredCount: 276,
    registrationOpen: false,
    entryFee: 0,
    status: "completed",
  },
  {
    id: "demo-design-sprint",
    festId: "demo-ignitia-26",
    slug: "design-sprint",
    title: "Design Sprint",
    category: "workshop",
    eventType: "solo",
    teamSize: { min: 1, max: 1 },
    date: ymd(0),
    startTime: "11:00",
    endTime: "16:00",
    venue: "Design Studio",
    capacity: 120,
    registeredCount: 49,
    registrationOpen: true,
    entryFee: 0,
    status: "ongoing",
  },
  {
    id: "demo-b2b-ctf",
    festId: "demo-bits2bytes",
    slug: "capture-the-flag",
    title: "Capture the Flag",
    category: "technical",
    eventType: "team",
    teamSize: { min: 1, max: 3 },
    date: ymd(8),
    startTime: "10:00",
    endTime: "16:00",
    venue: "CS Block",
    capacity: 90,
    registeredCount: 41,
    registrationOpen: true,
    registrationDeadline: ymd(7),
    entryFee: 0,
    status: "published",
  },
];

const wipe = async () => {
  for (const name of ["events", "fests"]) {
    const snap = await db.collection(name).where("createdBy", "==", SYSTEM_UID).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`  removed ${snap.size} demo ${name}`);
  }
};

const run = async () => {
  if (reset) await wipe();

  let created = 0;
  let skipped = 0;

  for (const fest of fests) {
    const ref = db.collection("fests").doc(fest.id);
    if ((await ref.get()).exists) {
      skipped += 1;
      continue;
    }
    await ref.set({ ...fest, createdBy: SYSTEM_UID, createdAt: now, updatedAt: now });
    created += 1;
  }

  for (const event of events) {
    const ref = db.collection("events").doc(event.id);
    if ((await ref.get()).exists) {
      skipped += 1;
      continue;
    }
    await ref.set({
      rules: [],
      prizes: [],
      coordinators: [],
      gates: [],
      mealSlots: [],
      waitlistEnabled: false,
      ...event,
      createdBy: SYSTEM_UID,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }

  console.log(`\n  Seeded ${created} documents (${skipped} already existed).`);
  console.log(`  Open /f/ignitia-26 to see the marquee.\n`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
