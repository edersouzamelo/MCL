const MINIMUM_DEMO_PASSWORD_LENGTH = 12;

export type AuthEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "AUTH_SECRET"
  | "DEMO_AUTH_ENABLED"
  | "DEMO_USER_PASSWORD"
  | "AUTH_GITHUB_ID"
  | "AUTH_GITHUB_SECRET"
  | "AUTH_GOOGLE_ID"
  | "AUTH_GOOGLE_SECRET"
>>;

function value(environment: AuthEnvironment, name: keyof AuthEnvironment) {
  return environment[name]?.trim() ?? "";
}

export function getAuthRuntimeConfiguration(environment: AuthEnvironment = process.env) {
  const secret = value(environment, "AUTH_SECRET");
  const demoPassword = environment.DEMO_USER_PASSWORD ?? "";
  const demoRequested = environment.DEMO_AUTH_ENABLED === "true";
  const demoConfigured =
    demoRequested &&
    secret.length > 0 &&
    demoPassword.length >= MINIMUM_DEMO_PASSWORD_LENGTH;

  return {
    secret: secret || undefined,
    demo: {
      requested: demoRequested,
      configured: demoConfigured,
      password: demoConfigured ? demoPassword : undefined,
    },
    githubConfigured:
      secret.length > 0 &&
      value(environment, "AUTH_GITHUB_ID").length > 0 &&
      value(environment, "AUTH_GITHUB_SECRET").length > 0,
    googleConfigured:
      secret.length > 0 &&
      value(environment, "AUTH_GOOGLE_ID").length > 0 &&
      value(environment, "AUTH_GOOGLE_SECRET").length > 0,
  };
}
