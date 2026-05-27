import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PflegehilfsmittelClient } from '@/components/pflegehilfsmittel/PflegehilfsmittelClient'

export const metadata: Metadata = {
  title: 'Pflegehilfsmittel-Marktplatz | xcare',
  description: '§40 SGB XI: Pflegehilfsmittel beantragen und Budget verwalten.',
}

export default async function PflegehilfsmittelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // SSR: Erste 20 Produkte laden
  const { data: produkte } = await supabase
    .from('pflegehilfsmittel')
    .select('*')
    .eq('aktiv', true)
    .order('pg_nummer')
    .order('name')
    .limit(20)

  // SSR: Benutzer-Anträge mit Produkt-Details
  const { data: antraege } = user
    ? await supabase
        .from('hilfsmittel_antraege')
        .select(`
          *,
          hilfsmittel:pflegehilfsmittel (
            id, name, pg_nummer, pg_bezeichnung, erstattung_typ, preis_cent, einheit, hersteller
          )
        `)
        .eq('user_id', user.id)
        .order('erstellt_am', { ascending: false })
    : { data: [] }

  // SSR: Ausgaben des aktuellen Monats
  const aktuellerMonat = new Date().toISOString().slice(0, 7)
  const { data: ausgaben } = user
    ? await supabase
        .from('hilfsmittel_ausgaben')
        .select('*, hilfsmittel:pflegehilfsmittel(id, name, erstattungsfaehig, erstattung_typ)')
        .eq('user_id', user.id)
        .gte('monat', `${aktuellerMonat}-01`)
        .order('erstellt_am', { ascending: false })
    : { data: [] }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PflegehilfsmittelClient
        initialProdukte={produkte ?? []}
        initialAntraege={antraege ?? []}
        initialAusgaben={ausgaben ?? []}
      />
    </div>
  )
}
