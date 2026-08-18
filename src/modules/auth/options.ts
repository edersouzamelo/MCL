import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { timingSafeEqual } from "node:crypto";
import { resolveLocalAccess } from "@/modules/auth/access";
import { getAuthRuntimeConfiguration } from "@/modules/auth/config";
import { appendAuditLog } from "@/server/demo-store";

function optionalProviders() {
  const configuration = getAuthRuntimeConfiguration();
  const providers: NextAuthOptions["providers"] = [];

  if (configuration.demo.configured && configuration.demo.password) {
    const expectedPassword = configuration.demo.password;
    providers.push(
      CredentialsProvider({
        id: "demo",
        name: "Acesso local demonstrativo",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Senha", type: "password" },
        },
        async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";
        const supplied = Buffer.from(password);
        const expected = Buffer.from(expectedPassword);
        const passwordMatches =
          supplied.length === expected.length && timingSafeEqual(supplied, expected);
        const access = passwordMatches ? await resolveLocalAccess({ email }) : undefined;

        if (!access) {
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
          actorId: access.id,
          action: "AUTH_DEMO_LOGIN",
          resourceType: "SESSION",
          resourceId: "demo",
          organizationId: access.organizationId,
          outcome: "SUCESSO",
          reason: "Credenciais demonstrativas autenticadas.",
          metadata: { provider: "demo", institutionalIdentity: false },
        });

        return {
          ...access,
          image:
            access.image ??
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(access.name ?? access.email ?? access.id)}&backgroundColor=059669`,
        };
        },
      }),
    );
  }

  if (configuration.githubConfigured) {
    providers.push(
      GitHubProvider({
        clientId: process.env.AUTH_GITHUB_ID!,
        clientSecret: process.env.AUTH_GITHUB_SECRET!,
      }),
    );
  }

  if (configuration.googleConfigured) {
    providers.push(
      GoogleProvider({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        authorization: {
          params: {
            prompt: "consent select_account",
          },
        },
      }),
    );
  }

  if (providers.length === 0) {
    providers.push(
      CredentialsProvider({
        id: "demo",
        name: "Acesso local demonstrativo",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Senha", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.email?.trim().toLowerCase() ?? "operador@mcl.eb.mil.br";
          const access = await resolveLocalAccess({ email });
          return access ? { ...access } : { id: "usr-demo", name: "Operador Demonstrativo", email };
        },
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  secret: getAuthRuntimeConfiguration().secret || "mcl-demo-secret-key-32-chars-long-security-fallback",
  session: {
    strategy: "jwt",
  },
  providers: optionalProviders(),
  pages: {
    signIn: "/entrar",
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        const access = await resolveLocalAccess(user);
        if (!access) {
          appendAuditLog({
            actorId: "anonymous",
            action: "AUTH_LOGIN",
            resourceType: "SESSION",
            resourceId: account?.provider ?? "desconhecido",
            outcome: "NEGADO",
            reason: "Identidade sem vinculo local ativo.",
            metadata: { provider: account?.provider ?? "desconhecido", email: user.email ?? "nao-informado" },
          });
          return false;
        }
        Object.assign(user, access);
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const access = user.roles?.length ? user : await resolveLocalAccess(user);
        token.sub = access?.id;
        token.roles = access?.roles ?? [];
        token.organizationId = access?.organizationId;
        if (user.image) {
          token.picture = user.image;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = (token.roles as string[] | undefined) ?? [];
        session.user.organizationId = token.organizationId as string | undefined;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
};
