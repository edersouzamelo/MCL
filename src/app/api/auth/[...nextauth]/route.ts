import NextAuth from "next-auth";
import { authOptions } from "@/modules/auth/options";

// Corrige dinamicamente o NEXTAUTH_URL na Vercel para evitar redirect_uri_mismatch no Google OAuth
if (process.env.VERCEL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : "https://mcl-one.vercel.app";
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
