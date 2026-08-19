import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
        <svg width="390" height="446" viewBox="0 0 28 32" fill="none">
          <path d="M14 2L26 8.9V23.1L14 30L2 23.1V8.9L14 2Z" stroke="#76dcff" strokeWidth="2.45" strokeLinejoin="miter" />
          <path d="M14 16V30M14 16L26 8.9M14 16L2 8.9" stroke="#effbff" strokeWidth="2.45" strokeLinejoin="miter" />
          <path d="M8 5.5L20 12.4M8 19.5L14 23M20 19.5L14 23" stroke="#76dcff" strokeWidth="2.45" strokeLinejoin="miter" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
