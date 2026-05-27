import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HeimSucheClient, type Pflegeheim, type MerklistenEintrag } from '@/components/heimsuche/HeimSucheClient'

export const metadata: Metadata = {
  title: 'Pflegeheim-Suche & Vergleich | xcare',
  description:
    'Finden und vergleichen Sie Pflegeheime in Ihrer Region. Mit Eigenanteil-Rechner und §43 SGB XI Übersicht.',
}

export default async function HeimsuchePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel SSR fetches
  const [{ data: heimeData }, { data: merklisteData }] = await Promise.all([
    // 8 seed homes, sorted by Eigenanteil ascending
    supabase
      .from('pflegeheime')
      .select(
        'id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland, ' +
          'lat, lng, telefon, email, webseite, plaetze_gesamt, plaetze_verfuegbar, ' +
          'wartezeit_monate, spezialisierungen, sprachen, ' +
          'eigenanteil_pflegekosten_cent, kosten_unterkunft_cent, kosten_verpflegung_cent, ' +
          'kosten_investition_cent, eigenanteil_gesamt_cent, ' +
          'mdk_note, qualitaet_pflege, qualitaet_alltag, letzte_pruefung, ' +
          'einzelzimmer_verfuegbar, haustiere_erlaubt, besuchszeiten, verpflegung_detail, aktivitaeten'
      )
      .eq('aktiv', true)
      .order('eigenanteil_gesamt_cent', { ascending: true })
      .limit(8),

    // User's saved homes with heim details joined
    supabase
      .from('heim_merkliste')
      .select(
        `id, notizen, kontaktiert_am, warteliste_angemeldet, besichtigungs_termin, erstellt_am,
        pflegeheime (
          id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland,
          telefon, email, webseite, plaetze_gesamt, plaetze_verfuegbar, wartezeit_monate,
          spezialisierungen, sprachen,
          eigenanteil_pflegekosten_cent, kosten_unterkunft_cent, kosten_verpflegung_cent,
          kosten_investition_cent, eigenanteil_gesamt_cent,
          mdk_note, qualitaet_pflege, qualitaet_alltag, letzte_pruefung,
          einzelzimmer_verfuegbar, haustiere_erlaubt, besuchszeiten, verpflegung_detail, aktivitaeten
        )`
      )
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false }),
  ])

  const initialHeime = (heimeData ?? []) as Pflegeheim[]
  const initialMerkliste = (merklisteData ?? []) as MerklistenEintrag[]

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[--primary]" />
          Pflegeheim-Suche & Vergleich
        </h1>
        <p className="text-[--muted-foreground] mt-1">
          Vergleichen Sie Pflegeheime in Ihrer Region, berechnen Sie Ihren Eigenanteil nach §43 SGB XI
          und verwalten Sie Ihre persönliche Merkliste.
        </p>
      </div>

      <HeimSucheClient
        initialHeime={initialHeime}
        initialMerkliste={initialMerkliste}
      />
    </div>
  )
}
