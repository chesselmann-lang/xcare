import { Metadata } from 'next'
import KontinenzClient from '@/components/kontinenz/KontinenzClient'

export const metadata: Metadata = {
  title: 'Kontinenz-Management | xcare',
  description: 'ICIQ-SF Bewertung, Miktionsprotokoll und Tagesbilanz',
}

export default function KontinenzPage() {
  return <KontinenzClient />
}
