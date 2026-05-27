// ============================================================
// F33: KI-Pflegeberatung 24/7 — Server Component Page
// Route: /familie/ki-beratung
// ============================================================

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { KiBeratungClient } from '@/components/ki-beratung/KiBeratungClient'

export const metadata: Metadata = {
  title: 'KI-Pflegeberatung 24/7 | xcare',
  description:
    'Ihr persönlicher KI-Pflegeberater — jederzeit verfügbar für alle Fragen rund um Pflege, Ansprüche und Anträge.',
}

export default async function KiBeratungPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Nur Familie-Nutzer haben Zugriff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'familie') redirect('/anbieter/dashboard')

  // SSR: Letzte 10 Beratungen laden
  const { data: beratungen } = await supabase
    .from('ki_beratungen')
    .select('id, titel, thema, status, nachrichten_count, letzte_nachricht_am, erstellt_am')
    .eq('user_id', user.id)
    .order('letzte_nachricht_am', { ascending: false })
    .limit(10)

  // SSR: Offene Follow-ups laden
  const { data: followups } = await supabase
    .from('ki_beratung_followups')
    .select('id, beratung_id, aufgabe, faellig_am, erledigt')
    .eq('user_id', user.id)
    .eq('erledigt', false)
    .order('faellig_am', { ascending: true })
    .limit(20)

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <Bot className="h-6 w-6 text-[--primary]" />
            KI-Pflegeberatung 24/7
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Ihr persönlicher Pflegeberater nach §7a SGB XI — jederzeit erreichbar.
          </p>
        </div>
      </div>

      {/* Client-Komponente */}
      <div className="flex-1 min-h-0">
        <KiBeratungClient
          initialBeratungen={beratungen ?? []}
          initialFollowups={followups ?? []}
        />
      </div>
    </div>
  )
}
