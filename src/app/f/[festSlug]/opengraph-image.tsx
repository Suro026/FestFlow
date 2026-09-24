import { ImageResponse } from "next/og";
import { repositories } from "@/data/repositories";
import { formatDateRange } from "@/lib/utils";

export const alt = "Fest on Plansphere";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A fest's social card: name, college, dates, live counts. */
export default async function FestOpenGraphImage({ params }: { params: Promise<{ festSlug: string }> }) {
  const { festSlug } = await params;
  const fest = await repositories()
    .fests.getBySlug(festSlug)
    .catch(() => null);
  const name = fest?.name ?? "Plansphere";
  const sub = fest ? `${fest.organizationName} · ${fest.city} · ${formatDateRange(fest.startDate, fest.endDate)}` : "Every fest. One pass.";
  const stats = fest ? [`${fest.stats.events} events`, `${fest.stats.registrations.toLocaleString("en-IN")} registered`] : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#161826",
          color: "#e9e9ed",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#9397ab" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#9184d9", display: "flex", alignItems: "center", justifyContent: "center", color: "#161826", fontSize: 24, fontWeight: 700 }}>
            F
          </div>
          Plansphere · plansphere.in
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: name.length > 18 ? 76 : 100, fontWeight: 600, lineHeight: 1, letterSpacing: -3 }}>{name}</div>
          <div style={{ fontSize: 30, color: "#cfd3e5" }}>{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {stats.map((t) => (
            <div key={t} style={{ border: "2px solid #9184d9", color: "#d2cefd", borderRadius: 999, padding: "10px 22px", fontSize: 24 }}>
              {t}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 24, color: "#9397ab" }}>Register with one pass →</div>
        </div>
      </div>
    ),
    size,
  );
}
