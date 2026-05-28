import { Metadata } from 'next'
import SchmerzClient from '@/components/schmerz/SchmerzClient'

export const metadata: Metadata = {
  title: 'Schmerzmanagement | xcare',
  description: 'NRS & BESD-Skala · Schmerzprotokoll · Therapieplan',
}

export default function SchmerzPage() {
  return <SchmerzClient />
}
