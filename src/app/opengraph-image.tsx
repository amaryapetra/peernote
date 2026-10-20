import { ImageResponse } from "next/og";

export const alt = "PeerNote: share class notes and find study partners";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#faf8f3",
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 47px, #e4dfd3 47px, #e4dfd3 48px)",
          color: "#1d1c1a",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 68, background: "#2c4fa3", borderRadius: 8, display: "flex" }} />
          <div style={{ fontSize: 48, fontWeight: 700 }}>PeerNote</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, maxWidth: 980, display: "flex", flexWrap: "wrap" }}>
            Never miss what was said in&nbsp;
            <span style={{ background: "#fde68a", padding: "0 10px" }}>class</span>
            &nbsp;again.
          </div>
          <div style={{ fontSize: 32, color: "#66625a", fontFamily: "Helvetica, Arial, sans-serif" }}>
            Share notes · Fill the gaps with AI · Find study partners
          </div>
        </div>
      </div>
    ),
    size,
  );
}
