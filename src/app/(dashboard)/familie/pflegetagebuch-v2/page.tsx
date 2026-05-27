import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PflegetagebuchV2Client from '@/components/pflegetagebuch/PflegetagebuchV2Client'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pflegetagebuch 2.0 | xcare',
  description: 'Digitales Pflegetagebuch mit Vitalwerte-Charts und KI-Mustererkennung.',
}

export default async function PflegetagebuchV2Page() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, vorname, nachname')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'familie') redirect('/')

  // SSR: last 14 days entries for initial render
  const vierzehnTageAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: eintraege } = await supabase
    .from('pflegetagebuch_v2')
    .select(`
      id, datum, uhrzeit, kategorie, eintrag,
      schmerz_skala, stimmung_skala,
      blutdruck_systolisch, blutdruck_diastolisch, puls,
      temperatur, blutzucker, gewicht, sauerstoffsaettigung,
      fluessigkeit_ml, schlaf_stunden, schlaf_qualitaet,
      appetit, mahlzeit_beschreibung,
      medikamente_eingenommen,
      besonderheit, fuer_mdk_bericht,
      erstellt_am
    `)
    .eq('user_id', user.id)
    .gte('datum', vierzehnTageAgo)
    .order('datum', { ascending: false })
    .order('erstellt_am', { ascending: false })
    .limit(100)

  const nutzerName = [profile.vorname, profile.nachname].filter(Boolean).join(' ') || 'Pflegebedürftige/r'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[--primary]" />
            Pflegetagebuch 2.0
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Digitale Pflegedokumentation mit Vitalwerte-Charts und KI-Mustererkennung.
          </p>
        </div>
      </div>

      <PflegetagebuchV2Client
        initialEintraege={eintraege ?? []}
        nutzerName={nutzerName}
      />
    </div>
  )
}
