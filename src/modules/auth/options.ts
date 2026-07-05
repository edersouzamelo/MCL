import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { appendAuditLog, getDemoState } from "@/server/demo-store";

function optionalProviders() {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      id: "demo",
      name: "Email e senha demonstrativos",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize(credentials) {
        const expectedPassword = process.env.DEMO_USER_PASSWORD ?? process.env.DEMO_ACCESS_CODE ?? "MCL-DEMO-2026";
        const enabled = process.env.DEMO_AUTH_ENABLED !== "false";
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";
        const state = getDemoState();
        const user = state.users.find((candidate) => candidate.active && candidate.email.toLowerCase() === email);
        const scope = user ? state.userScopes.find((candidate) => candidate.userId === user.id && candidate.active) : undefined;

        if (!enabled || !user || password !== expectedPassword) {
          appendAuditLog({
            actorId: "anonymous",
            action: "AUTH_DEMO_LOGIN",
            resourceType: "SESSION",
            resourceId: "demo",
            outcome: "NEGADO",
            reason: "Email ou senha demonstrativos ausentes ou invalidos.",
            metadata: { provider: "demo", email: email || "nao-informado" },
          });
          return null;
        }

        appendAuditLog({
          actorId: user.id,
          action: "AUTH_DEMO_LOGIN",
          resourceType: "SESSION",
          resourceId: "demo",
          organizationId: scope?.organizationId ?? "org-provedor-alfa",
          outcome: "SUCESSO",
          reason: "Credenciais demonstrativas autenticadas.",
          metadata: { provider: "demo", institutionalIdentity: false },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
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
