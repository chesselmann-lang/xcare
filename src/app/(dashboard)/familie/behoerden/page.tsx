import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BehoerdenNavigatorClient } from '@/components/behoerden/BehoerdenNavigatorClient'
import type {
  Sozialleistung,
  BehoerdenVorgang,
  BehoerdenEintrag,
} from '@/components/behoerden/BehoerdenNavigatorClient'

export const metadata: Metadata = {
  title: 'Behoerden-Navigator | xcare',
  description:
    'Ihr Wegweiser durch Sozialleistungen, Antraege und Behoerden — von Pflegegeld bis Sozialhilfe.',
}

export default async function BehoerdenNavigatorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // SSR: Alle aktiven Sozialleistungen
  const { data: leistungenRaw } = await supabase
    .from('sozialleistungen')
    .select('*')
    .eq('aktiv', true)
    .order('prioritaet', { ascending: true })
    .limit(50)

  // SSR: Benutzer-Vorgaenge (nur wenn eingeloggt)
  const { data: vorgaengeRaw } = user
    ? await supabase
        .from('behoerden_vorgaenge')
        .select(`
          *,
          leistung:sozialleistungen (
            id, name, kurzname, rechtsgrundlage, behoerde,
            leistungshoehe, bearbeitungszeit_wochen, kategorie, prioritaet
          )
        `)
        .eq('user_id', user.id)
        .order('erstellt_am', { ascending: false })
    : { data: [] }

  // SSR: Behoerden-Verzeichnis
  const { data: behoerdenRaw } = await supabase
    .from('behoerden_verzeichnis')
    .select('*')
    .order('name', { ascending: true })

  const leistungen: Sozialleistung[] = (leistungenRaw ?? []) as Sozialleistung[]
  const vorgaenge: BehoerdenVorgang[] = (vorgaengeRaw ?? []) as BehoerdenVorgang[]
  const behoerden: BehoerdenEintrag[] = (behoerdenRaw ?? []) as BehoerdenEintrag[]

  return (
    <div className="p-6">
      <BehoerdenNavigatorClient
        initialLeistungen={leistungen}
        initialVorgaenge={vorgaenge}
        initialBehoerden={behoerden}
        isLoggedIn={!!user}
      />
    </div>
  )
}
