import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PflegeberatungClient } from '@/components/pflegeberatung/PflegeberatungClient';

export const metadata: Metadata = {
  title: '§7a Pflegeberatung | xcare',
  description:
    'Kostenlose Pflegeberatungsstellen nach §7a SGB XI finden und Beratungstermine anfragen.',
};

export default async function PflegeberatungPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role === 'anbieter') redirect('/anbieter/dashboard');

  // Top 10 Beratungsstellen vorladen (Server-Side)
  const { data: initialStellen } = await supabase
    .from('pflegeberatungsstellen')
    .select(
      'id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland, ' +
        'lat, lng, telefon, email, webseite, oeffnungszeiten, ' +
        'sprachen, hausbesuche, video_beratung, zertifiziert, erstellt_am'
    )
    .eq('aktiv', true)
    .order('ort', { ascending: true })
    .limit(10);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">
          §7a Pflegeberatung
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Kostenlose Pflegeberatung finden und Termine anfragen.
        </p>
      </div>

      {/* Rechtlicher Hinweisbanner */}
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        <span className="font-semibold">Ihr gesetzliches Recht:</span> Kostenlose Pflegeberatung
        ist Ihr gesetzliches Recht nach{' '}
        <span className="font-semibold">§7a SGB XI</span>. Pflegekassen und zugelassene
        Beratungsstellen sind verpflichtet, Sie innerhalb von zwei Wochen nach Antragstellung
        individuell und umfassend zu beraten — unentgeltlich und unabhängig.
      </div>

      {/* Hauptinhalt — Client-Komponente */}
      <PflegeberatungClient
        initialStellen={initialStellen ?? []}
        isAuthenticated={!!user}
      />
    </div>
  );
}
