import KognitionClient from '@/components/kognition/KognitionClient'

export const metadata = { title: 'Kognition & Aktivierung | xcare' }

export default function KognitionPage() {
  return (
    <div>
      <div style={{ padding: '24px 16px 0', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          🧠 Kognition & Aktivierung
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Kognitions-Assessment, MMSE, BPSD und aktivierende Begleitung
        </p>
      </div>
      <KognitionClient />
    </div>
  )
}
