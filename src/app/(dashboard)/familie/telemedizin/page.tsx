import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TelemedizinClient } from '@/components/telemedizin/TelemedizinClient';

export const metadata: Metadata = {
  title: 'Telemedizin-Hub | xcare Familie',
  description:
    'Online-Arzt-Konsultationen buchen und Ihre behandelnden Ärzte zentral koordinieren.',
};

export default async function TelemedizinPage() {
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Video className="h-6 w-6 text-[--primary]" />
          Telemedizin-Hub
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Videokonsultationen mit verifizierten Ärzten buchen und Ihre Arzttermine koordinieren.
        </p>
      </div>

      {/* Hinweisbanner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <span className="font-semibold">Hinweis:</span> Telemedizinische Beratungen ersetzen keine
        Notaufnahme. Bei akuten Beschwerden wählen Sie bitte den{' '}
        <span className="font-semibold">Notruf 112</span> oder den ärztlichen Bereitschaftsdienst{' '}
        <span className="font-semibold">116 117</span>.
      </div>

      {/* Hauptinhalt — Client-Komponente */}
      <TelemedizinClient />
    </div>
  );
}
