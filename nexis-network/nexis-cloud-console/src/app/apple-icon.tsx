import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0EA5E9 0%, #01B3FF 45%, #9945FF 100%)",
          color: "#0B1020",
          fontSize: 92,
          fontWeight: 700,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        N
      </div>
    ),
    size
  );
}
