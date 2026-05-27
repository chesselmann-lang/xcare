import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntlastungsTrackerClient } from '@/components/entlastung/EntlastungsTrackerClient'
import { Info } from 'lucide-react'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Entlastungsbetrag §45b | xcare',
    description:
      'Verwalten Sie Ihr monatliches Entlastungsbudget von 125 € nach §45b SGB XI. Ausgaben erfassen, Erstattungen verfolgen, Budget im Blick behalten.',
  }
}

export default async function EntlastungsbetragPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Rolle prüfen: nur familie-Nutzer haben Zugang
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role === 'anbieter') {
    redirect('/anbieter/dashboard')
  }

  const aktuellesJahr = new Date().getFullYear()

  // Parallel SSR: Nutzungen des aktuellen Jahres + Einstellungen
  const [{ data: nutzungenData }, { data: einstellungenData }] = await Promise.all([
    supabase
      .from('entlastungsbetrag_nutzung')
      .select('*')
      .eq('user_id', user.id)
      .eq('jahr', aktuellesJahr)
      .order('monat', { ascending: true })
      .order('erstellt_am', { ascending: false }),

    supabase
      .from('entlastungsbetrag_einstellungen')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Seitenkopf */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Entlastungsbetrag §45b SGB XI
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ihr monatliches Budget von 125 € für Entlastungsleistungen — erfassen, verfolgen, erstatten.
        </p>
      </div>

      {/* Rechtlicher Hinweis-Banner */}
      <div className="flex gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p>
            <strong>Ihr gesetzlicher Anspruch:</strong> Als Pflegebedürftiger mit Pflegegrad 2–5 oder als pflegender
            Angehöriger haben Sie Anspruch auf einen monatlichen Entlastungsbetrag von <strong>125 €</strong> nach
            §45b SGB XI.
          </p>
          <p>
            Nicht genutzte Beträge können innerhalb des Kalenderjahres angesammelt und bis zum{' '}
            <strong>30. Juni des Folgejahres</strong> in Anspruch genommen werden. Stellen Sie Erstattungsanträge
            direkt bei Ihrer Pflegekasse.
          </p>
        </div>
      </div>

      {/* Hauptkomponente */}
      <EntlastungsTrackerClient
        initialNutzungen={nutzungenData ?? []}
        initialEinstellungen={einstellungenData ?? null}
        initialJahr={aktuellesJahr}
      />
    </div>
  )
}
