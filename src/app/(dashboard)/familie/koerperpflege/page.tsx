import KoerperpflegeClient from '@/components/koerperpflege/KoerperpflegeClient'

export const metadata = { title: 'Körperpflege | xcare' }

export default function KoerperpflegePage() {
  return (
    <div>
      <div style={{ padding: '24px 16px 0', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          🛁 Körperpflege
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          ADL-Protokoll für tägliche Körperpflege und Hautpflege
        </p>
      </div>
      <KoerperpflegeClient />
    </div>
  )
}
