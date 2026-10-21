import { ImageResponse } from "next/og";

export const alt = "MannaBooks: accounting, stock and payroll for Kenyan businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The picture shown when a MannaBooks link is shared on WhatsApp, LinkedIn or X. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72,
        background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 60%)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#065f46" />
            <path d="M8 21.5V8.5h3.2L16 15.4l4.8-6.9H24v13h-3.2v-7.8L16 20l-4.8-6.3v7.8z" fill="#fff" />
            <rect x="8" y="23.6" width="16" height="1.8" rx="0.9" fill="#6ee7b7" />
          </svg>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#1c1917" }}>Manna<span style={{ color: "#065f46" }}>Books</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: "#1c1917", lineHeight: 1.1, maxWidth: 960 }}>Your whole business in one set of books.</div>
          <div style={{ marginTop: 24, fontSize: 32, color: "#57534e" }}>Sales, M-Pesa, stock, payroll and reports, built for Kenya.</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["M-Pesa built in", "KRA ready", "PAYE, SHIF, NSSF, Housing Levy"].map((t) => (
            <div key={t} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "#065f46", color: "#fff", fontSize: 24 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
