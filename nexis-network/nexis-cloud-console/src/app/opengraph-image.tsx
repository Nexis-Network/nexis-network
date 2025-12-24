import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

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
          padding: "64px",
          background: "linear-gradient(135deg, #0B0D12 0%, #141414 55%, #0B0D12 100%)",
          color: "#FFFFFF",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #0EA5E9 0%, #01B3FF 45%, #9945FF 100%)",
              color: "#0B1020",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 40, fontWeight: 600 }}>Nexis Cloud Console</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
            Confidential compute, built for AI.
          </div>
          <div style={{ marginTop: 16, fontSize: 26, color: "#B4B4B4" }}>
            Deploy, monitor, and secure workloads with verifiable TEE execution.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, color: "#B4B4B4", fontSize: 20 }}>
          <span>TEE-native</span>
          <span>•</span>
          <span>On-chain trust</span>
          <span>•</span>
          <span>CLI + SDK</span>
        </div>
      </div>
    ),
    size
  );
}
