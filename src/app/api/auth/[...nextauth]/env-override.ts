if (process.env.VERCEL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : "https://mcl-one.vercel.app";
}
export {};
