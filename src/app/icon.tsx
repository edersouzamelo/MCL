import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#059669",
          border: "12px solid #ffffff",
          borderRadius: "56px",
          color: "#ffffff",
          fontWeight: 900,
          fontSize: 100,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-3px",
        }}
      >
        MCL
      </div>
    ),
    { ...size }
  );
}
