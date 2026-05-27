import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntlastungClient } from '@/components/entlastung/EntlastungClient'

export const metadata: Metadata = {
  title: 'Angehörigen-Entlastung | xcare',
  description:
    'Burnout-Screening, Selbsthilfegruppen, Verhinderungspflege und Entlastungsbetrag für pflegende Angehörige.',
}

export default async function AngehoerigenEntlastungPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Parallel SSR fetches
  const [
    { data: gruppenData },
    { data: screeningData },
    { data: verhinderungData },
    { data: entlastungData },
  ] = await Promise.all([
    // 10 Selbsthilfegruppen — public, cached
    supabase
      .from('selbsthilfegruppen')
      .select(
        'id, name, typ, thema, beschreibung, plz, ort, bundesland, treffen_rhythmus, kontakt_email, kontakt_telefon, webseite, veranstalter'
      )
      .eq('aktiv', true)
      .order('name')
      .limit(10),

    // Last 5 burnout screenings for this user
    supabase
      .from('burnout_screenings')
      .select('id, gesamt_score, belastungsstufe, empfehlungen, erstellt_am')
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })
      .limit(5),

    // Verhinderungspflege plan (most recent)
    supabase
      .from('verhinderungspflege')
      .select('id, pflegegrad, jahres_budget_cent, eingesetzt_cent, planung, notizen')
      .eq('user_id', user.id)
      .order('aktualisiert_am', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Entlastungsbetrag Ausgaben for current year
    supabase
      .from('entlastungsbetrag_ausgaben')
      .select('id, monat, leistung, anbieter, betrag_cent, erstattet_cent, anerkannt, erstellt_am')
      .eq('user_id', user.id)
      .gte('monat', `${new Date().getFullYear()}-01-01`)
      .order('monat', { ascending: false })
      .order('erstellt_am', { ascending: false }),
  ])

  const gruppen = gruppenData ?? []
  const screenings = screeningData ?? []
  const lastScreening = screenings[0] ?? null
  const screeningHistory = screenings

  // Normalize verhinderung plan — planung field is JSONB, cast safely
  const rawPlan = verhinderungData as {
    id: string
    pflegegrad: number
    jahres_budget_cent: number
    eingesetzt_cent: number
    planung: unknown
    notizen: string | null
  } | null

  const verhinderungPlan = rawPlan
    ? {
        id: rawPlan.id,
        pflegegrad: rawPlan.pflegegrad,
        jahres_budget_cent: rawPlan.jahres_budget_cent,
        eingesetzt_cent: rawPlan.eingesetzt_cent,
        planung: Array.isArray(rawPlan.planung)
          ? (rawPlan.planung as {
              id: string
              von: string
              bis: string
              grund: 'urlaub' | 'krankheit' | 'beruf' | 'sonstiges'
              vertreter_typ: 'ambulanter_dienst' | 'private_ersatzpflegeperson'
            }[])
          : null,
        notizen: rawPlan.notizen,
      }
    : null

  return (
    <EntlastungClient
      initialGruppen={gruppen}
      lastScreening={lastScreening}
      screeningHistory={screeningHistory}
      verhinderungPlan={verhinderungPlan}
      entlastungAusgaben={entlastungData ?? []}
    />
  )
}
