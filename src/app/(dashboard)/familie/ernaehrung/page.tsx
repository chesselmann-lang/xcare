// app/(dashboard)/familie/ernaehrung/page.tsx — F45 Ernährungsplan & Flüssigkeitsbilanz
import { Metadata } from 'next';
import ErnaehrungClient from '@/components/ernaehrung/ErnaehrungClient';

export const metadata: Metadata = {
  title: 'Ernährung & Flüssigkeit | xcare',
  description: 'Ernährungsplan, Flüssigkeitsbilanz und Mahlzeiten-Protokoll',
};

export default function ErnaehrungPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🥗 Ernährung & Flüssigkeit</h1>
        <p className="text-gray-500 mt-1">Flüssigkeitsbilanz, Mahlzeiten-Protokoll und MNA-Ernährungsscreening</p>
      </div>
      <ErnaehrungClient />
    </div>
  );
}
