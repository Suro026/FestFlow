import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The default social card: dark ground, blurple accent, the tagline. */
export default function OpenGraphImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#9184d9", display: "flex", alignItems: "center", justifyContent: "center", color: "#161826", fontSize: 34, fontWeight: 700 }}>
            F
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{SITE.name}</div>
          <div style={{ marginLeft: "auto", fontSize: 22, color: "#9397ab" }}>plansphere.in</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 108, fontWeight: 600, lineHeight: 0.96, letterSpacing: -5 }}>
            <span>Every fest.</span>
            <span>One pass.</span>
          </div>
          <div style={{ fontSize: 30, color: "#cfd3e5", maxWidth: 900, lineHeight: 1.35 }}>
            Register with your team in one go. Show a QR at the gate. Certificates anyone can verify.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["QR passes that work offline", "Team registration", "Verified certificates"].map((t) => (
            <div key={t} style={{ border: "2px solid #9184d9", color: "#d2cefd", borderRadius: 999, padding: "10px 22px", fontSize: 22 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
