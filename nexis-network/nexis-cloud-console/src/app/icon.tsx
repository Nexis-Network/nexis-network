import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0EA5E9 0%, #01B3FF 45%, #9945FF 100%)",
          color: "#0B1020",
          fontSize: 20,
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
