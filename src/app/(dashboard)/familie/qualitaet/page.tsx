import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QualitaetsVergleichClient from '@/components/qualitaet/QualitaetsVergleichClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pflegeheim-Vergleich §115 | xcare',
  description: 'MDK-Qualitätsberichte vergleichen und das beste Pflegeheim finden',
};

export default async function QualitaetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single();
  if ((profile as any)?.role === 'anbieter') redirect('/anbieter/dashboard');

  const { data: heime } = await supabase
    .from('pflegeheime')
    .select(`
      id, name, traeger, plz, ort, bundesland, telefon, plaetze_gesamt,
      qualitaetsberichte (
        pruefung_datum, score_pflege, score_medizin, score_soziales,
        score_unterkunft, score_gesamt, maengel_anzahl
      )
    `)
    .eq('aktiv', true)
    .order('name')
    .limit(20);

  return <QualitaetsVergleichClient initialHeime={heime ?? []} />;
}
