import { Metadata } from 'next'
import WiderspruchClient from '@/components/widerspruch/WiderspruchClient'

export const metadata: Metadata = {
  title: 'Widerspruchs-Assistent | xCare',
  description: 'Pflegegrad-Widerspruch vorbereiten, Argumente sammeln und Widerspruchsbrief generieren'
}

export default function WiderspruchPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚖️ Widerspruchs-Assistent</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pflegegrad-Widerspruch strukturiert vorbereiten — Argumente sammeln, Checkliste abhaken und Widerspruchsbrief generieren
        </p>
      </div>
      <WiderspruchClient />
    </div>
  )
}
