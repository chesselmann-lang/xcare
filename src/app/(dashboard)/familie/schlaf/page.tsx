import SchlafClient from '@/components/schlaf/SchlafClient'

export const metadata = { title: 'Schlaf & Ruhe | xcare' }

export default function SchlafPage() {
  return (
    <div>
      <div style={{ padding: '24px 16px 0', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          😴 Schlaf & Ruhe
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Schlafprotokoll und Erholungsmanagement
        </p>
      </div>
      <SchlafClient />
    </div>
  )
}
