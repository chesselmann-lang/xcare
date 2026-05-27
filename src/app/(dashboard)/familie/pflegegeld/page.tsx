import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PflegegeldClient from '@/components/pflegegeld/PflegegeldClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pflegegeld §37 SGB XI | xcare',
  description: 'Pflegegeld-Auszahlungen verwalten und Beratungsnachweise tracken',
};

export default async function PflegegeldPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'anbieter') redirect('/anbieter/dashboard');

  const jahr = new Date().getFullYear();
  const [auszahlungen, einstellungen, nachweise] = await Promise.all([
    supabase.from('pflegegeld_auszahlungen').select('*').eq('user_id', user.id).eq('jahr', jahr).order('monat'),
    supabase.from('pflegegeld_einstellungen').select('*').eq('user_id', user.id).single(),
    supabase.from('beratungsnachweise').select('*').eq('user_id', user.id).order('beratungs_datum', { ascending: false }).limit(10),
  ]);

  return (
    <PflegegeldClient
      initialDaten={{
        auszahlungen: auszahlungen.data ?? [],
        einstellungen: einstellungen.data ?? null,
        nachweise: nachweise.data ?? [],
      }}
    />
  );
}
