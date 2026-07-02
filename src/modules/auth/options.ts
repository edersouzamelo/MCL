import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { appendAuditLog } from "@/server/demo-store";

function optionalProviders() {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      id: "demo",
      name: "Modo demonstrativo",
      credentials: {
        accessCode: { label: "Codigo demonstrativo", type: "password" },
      },
      authorize(credentials) {
        const expected = process.env.DEMO_ACCESS_CODE ?? "MCL-DEMO-2026";
        const enabled = process.env.DEMO_AUTH_ENABLED !== "false";
        if (!enabled || credentials?.accessCode !== expected) {
          appendAuditLog({
            actorId: "anonymous",
            action: "AUTH_DEMO_LOGIN",
            resourceType: "SESSION",
            resourceId: "demo",
            outcome: "NEGADO",
            reason: "Codigo demonstrativo ausente ou invalido.",
            metadata: { provider: "demo" },
          });
          return null;
        }

        appendAuditLog({
          actorId: "user-demo-admin",
          action: "AUTH_DEMO_LOGIN",
          resourceType: "SESSION",
          resourceId: "demo",
          organizationId: "org-provedor-alfa",
          outcome: "SUCESSO",
          reason: "Modo demonstrativo autenticado.",
          metadata: { provider: "demo", institutionalIdentity: false },
        });

        return {
          id: "user-demo-admin",
          name: "Operador Demonstrativo",
          email: "operador.demo@mcl.invalid",
        };
      },
    }),
  ];

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "mcl-demo-secret-change-me",
  session: {
    strategy: "jwt",
  },
  providers: optionalProviders(),
  pages: {
    signIn: "/entrar",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.roles = ["ADMIN", "LOGISTICS_MANAGER", "WAREHOUSE_OPERATOR", "AUDITOR"];
        token.organizationId = "org-provedor-alfa";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "user-demo-admin";
        session.user.roles = (token.roles as string[] | undefined) ?? ["READ_ONLY"];
        session.user.organizationId = (token.organizationId as string | undefined) ?? "org-provedor-alfa";
      }
      return session;
    },
  },
};
