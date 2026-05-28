import { Metadata } from 'next'
import VitalzeichenClient from '@/components/vitalzeichen/VitalzeichenClient'

export const metadata: Metadata = {
  title: 'Vitalzeichen-Protokoll | xcare',
  description: 'Blutdruck · Puls · Temperatur · SpO₂ · Ampelsystem',
}

export default function VitalzeichenPage() {
  return <VitalzeichenClient />
}
