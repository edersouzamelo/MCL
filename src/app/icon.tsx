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
          backgroundColor: "#3b82f6", // tailwind blue-500
          borderRadius: "64px",
          color: "white",
          fontWeight: 900,
          fontSize: 90,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-2px",
        }}
      >
        MCL
      </div>
    ),
    { ...size }
  );
}
