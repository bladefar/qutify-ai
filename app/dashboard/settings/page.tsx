import { BusinessProfileForm } from "@/features/settings";
import { getBusinessProfile } from "@/services/business-profiles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, userResult] = await Promise.all([
    getBusinessProfile(),
    (async () => {
      const supabase = await createClient();
      return supabase.auth.getUser();
    })(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the business details used across your Quotify AI workspace.
        </p>
      </div>
      <BusinessProfileForm
        profile={profile}
        accountEmail={userResult.data.user?.email ?? null}
      />
    </div>
  );
}
