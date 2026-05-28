import { Metadata } from 'next'
import WundversorgungClient from '@/components/wundversorgung/WundversorgungClient'

export const metadata: Metadata = {
  title: 'Wundversorgung | xCare',
  description: 'Wundversorgungsprotokoll – Wunden erfassen, Verbandswechsel dokumentieren, Heilungsverlauf verfolgen'
}

export default function WundversorgungPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🩹 Wundversorgung</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wunden dokumentieren, Verbandswechsel protokollieren und den Heilungsverlauf beobachten
        </p>
      </div>
      <WundversorgungClient />
    </div>
  )
}
