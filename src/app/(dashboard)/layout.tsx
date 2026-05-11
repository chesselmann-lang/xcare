import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/navigation/Sidebar";
import { UiModusProvider } from "@/components/ui-modus/UiModusProvider";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Redirect to onboarding if not done yet (skip if already on /onboarding)
  if (!profile.onboarding_done) {
    // Allow the onboarding page itself to render without redirect loop
    // Next.js middleware would be cleaner, but this works for the layout
  }

  // Get offene Anfragen count, entity ID + unread notifications
  let offeneAnfragenCount = 0;
  let entityId: string | undefined;

  if (profile.role === "anbieter") {
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (anbieter) {
      entityId = anbieter.id;
      const { count } = await supabase
        .from("anfragen")
        .select("*", { count: "exact", head: true })
        .eq("anbieter_id", anbieter.id)
        .eq("status", "offen");
      offeneAnfragenCount = count ?? 0;
    }
  } else if (profile.role === "familie") {
    entityId = profile.id;
  }

  // Unread notification count for bell
  const { count: unreadCount } = await supabase
    .from("benachrichtigungen")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("gelesen", false);

  // Unread nachrichten count for sidebar badge
  let unreadNachrichten = 0;
  if (entityId) {
    // Fetch anfrage IDs belonging to this user
    const anfrageQuery = profile.role === "anbieter"
      ? supabase.from("anfragen").select("id").eq("anbieter_id", entityId)
      : supabase.from("anfragen").select("id").eq("familie_id", entityId);

    const { data: myAnfragen } = await anfrageQuery;
    const anfrageIds = myAnfragen?.map((a) => a.id) ?? [];

    if (anfrageIds.length > 0) {
      const { count: nachrichtenCount } = await supabase
        .from("nachrichten")
        .select("*", { count: "exact", head: true })
        .in("anfrage_id", anfrageIds)
        .eq("gelesen", false)
        .neq("sender_id", profile.id);
      unreadNachrichten = nachrichtenCount ?? 0;
    }
  }

  return (
    <UiModusProvider profile={profile}>
    <div className="flex min-h-screen bg-[--background]">
      {/* Skip link for keyboard users */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[--primary] focus:text-white focus:font-medium focus:shadow-lg"
      >
        Zum Hauptinhalt springen
      </a>
      <Sidebar
        profile={profile}
        offeneAnfragenCount={offeneAnfragenCount}
        entityId={entityId}
        profileId={profile.id}
        initialUnreadCount={unreadCount ?? 0}
        unreadNachrichten={unreadNachrichten}
      />
      <main id="dashboard-main" className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0" tabIndex={-1}>
        {children}
      </main>
      <MobileBottomNav role={profile.role} badgeCount={offeneAnfragenCount} />
    </div>
    </UiModusProvider>
  );
}
