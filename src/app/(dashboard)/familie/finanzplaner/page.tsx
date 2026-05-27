// ============================================================
// F31: Pflege-Finanzplaner & Steuer-Optimierer — Page
// SSR: loads current-year Ausgaben + Verträge + SteuerBerechnung
// ============================================================

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { FinanzplanerClient } from '@/components/finanzen/FinanzplanerClient'
import { berechneSteuervorteile, type SteuerBerechnung } from '@/lib/finanzen/steuer'

export const metadata: Metadata = {
  title: 'Pflege-Finanzplaner | xcare',
  description:
    'Alle Pflegekosten im Blick — §35a EStG Steueroptimierung, Haushaltshilfe-Manager, Jahresexport für den Steuerberater.',
}

export default async function FinanzplanerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, pflegegrad')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'familie') redirect('/')

  const pflegegrad: number = (profile as { pflegegrad?: number | null }).pflegegrad ?? 0

  const aktuellesJahr = new Date().getFullYear()

  // ── SSR: load current-year Ausgaben ──
  const { data: ausgabenRaw } = await supabase
    .from('pflege_ausgaben')
    .select('*')
    .eq('user_id', user.id)
    .gte('datum', `${aktuellesJahr}-01-01`)
    .lte('datum', `${aktuellesJahr}-12-31`)
    .order('datum', { ascending: false })
    .order('erstellt_am', { ascending: false })
    .limit(500)

  const ausgaben = ausgabenRaw ?? []

  // ── SSR: load all Haushaltshilfe-Verträge ──
  const { data: vertraegeRaw } = await supabase
    .from('haushaltshilfe_vertraege')
    .select('*')
    .eq('user_id', user.id)
    .order('beginn_datum', { ascending: false })

  const vertraege = vertraegeRaw ?? []

  // ── SSR: compute SteuerBerechnung ──
  const initialBerechnung: SteuerBerechnung = berechneSteuervorteile({
    ausgaben: ausgaben.map(a => ({
      kategorie:                a.kategorie,
      betrag_cent:              a.betrag_cent,
      erstattung_kasse_cent:    a.erstattung_kasse_cent,
      erstattung_sonstige_cent: a.erstattung_sonstige_cent,
    })),
    pflegegrad,
    jahr: aktuellesJahr,
    ist_pflegeperson: pflegegrad >= 2,
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Calculator className="h-6 w-6 text-[--primary]" />
          Pflege-Finanzplaner
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Pflegekosten erfassen, §35a EStG Steueroptimierung, Haushaltshilfe-Manager und Jahresexport für den Steuerberater.
        </p>
      </div>

      <FinanzplanerClient
        initialAusgaben={ausgaben as Parameters<typeof FinanzplanerClient>[0]['initialAusgaben']}
        initialVertraege={vertraege as Parameters<typeof FinanzplanerClient>[0]['initialVertraege']}
        initialBerechnung={initialBerechnung}
        pflegegrad={pflegegrad}
      />
    </div>
  )
}
