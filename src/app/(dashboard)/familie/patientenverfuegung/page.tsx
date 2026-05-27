import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'
import { PatientenverfuegungClient } from '@/components/patientenverfuegung/PatientenverfuegungClient'

export const metadata: Metadata = {
  title: 'Patientenverfügung & Vorsorgevollmacht | xcare',
  description: 'Erstellen Sie Ihre Patientenverfügung und Vorsorgevollmacht digital — rechtssicher und einfach.',
}

export default async function PatientenverfuegungPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'familie') redirect('/anbieter/dashboard')

  // SSR: load existing Verfügungen with Bevollmächtigte
  const { data: verfuegungen } = await supabase
    .from('patientenverfuegungen')
    .select(`
      id,
      typ,
      status,
      inhalt,
      qr_code_token,
      erstellt_am,
      aktualisiert_am,
      widerrufen_am,
      pv_bevollmaechtigte (
        id,
        name,
        beziehung,
        telefon,
        email,
        adresse,
        prioritaet
      )
    `)
    .eq('user_id', user.id)
    .order('erstellt_am', { ascending: false })

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Shield className="h-6 w-6 text-[--primary]" />
          Patientenverfügung &amp; Vorsorgevollmacht
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Regeln Sie Ihren Willen rechtssicher — digital erstellen, herunterladen und sicher aufbewahren.
        </p>
      </div>

      <PatientenverfuegungClient initialVerfuegungen={verfuegungen ?? []} />
    </div>
  )
}
