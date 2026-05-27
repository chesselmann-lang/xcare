import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdvancedCarePlanningClient from '@/components/acp/AdvancedCarePlanningClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patientenverfügung & Vorsorge | xcare',
  description: 'Digitale Patientenverfügung und Vorsorgevollmacht erstellen – Advance Care Planning',
};

export default async function ACPPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'anbieter') redirect('/anbieter/dashboard');

  const [pv, vv] = await Promise.all([
    supabase.from('patientenverfuegung').select('*').eq('user_id', user.id).single(),
    supabase.from('vorsorgevollmacht').select('*').eq('user_id', user.id).single(),
  ]);

  return (
    <AdvancedCarePlanningClient
      initialPV={pv.data ?? null}
      initialVV={vv.data ?? null}
    />
  );
}
