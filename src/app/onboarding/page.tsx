import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { getActiveContext } from "@/lib/auth/session";

export default async function OnboardingPage() {
  // A user who already belongs to an org is here to ADD another one (or join
  // with a key) — give them an escape hatch back to the dashboard.
  const ctx = await getActiveContext();
  return <OnboardingWizard isReturning={ctx !== null} />;
}
