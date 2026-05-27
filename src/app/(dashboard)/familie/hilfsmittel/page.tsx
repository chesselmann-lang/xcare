import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HilfsmittelBoeseClient from '@/components/hilfsmittel/HilfsmittelBoeseClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hilfsmittel-Börse §40 | xcare',
  description: 'Pflegehilfsmittel leihen, verleihen und teilen – §40 SGB XI',
};

export default async function HilfsmittelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'anbieter') redirect('/anbieter/dashboard');

  const [angebote, kategorien] = await Promise.all([
    supabase.from('hilfsmittel_angebote')
      .select('*, hilfsmittel_kategorien(id, name, icon)')
      .eq('status', 'aktiv')
      .order('erstellt_am', { ascending: false })
      .limit(20),
    supabase.from('hilfsmittel_kategorien').select('*').eq('aktiv', true).order('name'),
  ]);

  return (
    <HilfsmittelBoeseClient
      initialAngebote={angebote.data ?? []}
      kategorien={kategorien.data ?? []}
    />
  );
}
