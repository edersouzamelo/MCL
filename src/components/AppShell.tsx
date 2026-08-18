import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions/onboarding";
import { AppShellClient } from "@/components/AppShellClient";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  
  if (profile && !profile.termsAcceptedAt) {
    redirect("/primeiro-acesso");
  }

  return <AppShellClient>{children}</AppShellClient>;
}
