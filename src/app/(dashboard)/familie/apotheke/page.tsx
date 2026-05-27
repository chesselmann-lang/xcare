import { Metadata } from 'next'
import { ApothekenClient } from '@/components/apotheken/ApothekenClient'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Apotheken-Finder | xcare',
  description: 'Apotheken in Ihrer Naehe finden, Medikamente bestellen und Einnahme-Erinnerungen verwalten',
}

export default async function ApothekePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: bestellungen } = await supabase
    .from('medikament_bestellungen')
    .select('id, medikament_name, status, bestellt_am')
    .eq('user_id', user?.id ?? '')
    .order('bestellt_am', { ascending: false })
    .limit(10)

  const { data: erinnerungen } = await supabase
    .from('medikament_erinnerungen')
    .select('id, medikament_name, dosierung, einnahme_zeiten, aktiv')
    .eq('user_id', user?.id ?? '')
    .eq('aktiv', true)
    .limit(20)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apotheken-Finder</h1>
        <p className="text-gray-500 mt-1">
          Apotheken finden, Medikamente bestellen und Einnahme-Erinnerungen verwalten
        </p>
      </div>
      <ApothekenClient
        initialBestellungen={bestellungen ?? []}
        initialErinnerungen={erinnerungen ?? []}
      />
    </div>
  )
}
