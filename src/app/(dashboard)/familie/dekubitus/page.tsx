import { Metadata } from 'next'
import DekubitusClient from '@/components/dekubitus/DekubitusClient'

export const metadata: Metadata = {
  title: 'Dekubitusprophylaxe | xCare',
  description: 'Braden-Skala Assessment, Lagerungsplan erstellen und Lagerungen dokumentieren'
}

export default function DekubitusPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🛡️ Dekubitusprophylaxe</h1>
        <p className="mt-1 text-sm text-gray-500">
          Braden-Skala zur Risikoeinschätzung, Lagerungsplan erstellen und Umlagerungen protokollieren
        </p>
      </div>
      <DekubitusClient />
    </div>
  )
}
