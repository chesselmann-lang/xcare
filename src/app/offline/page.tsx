"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">📵</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Keine Verbindung</h1>
        <p className="text-gray-600 mb-6">
          Sie sind offline. Notfallinformationen sind weiterhin verfügbar.
        </p>
        <a
          href="/familie/notfall/sperrbildschirm"
          className="block w-full bg-red-600 text-white rounded-xl py-4 text-lg font-semibold mb-3 hover:bg-red-700 transition-colors"
        >
          🆘 Notfallkarte öffnen
        </a>
        <button
          onClick={() => window.location.reload()}
          className="block w-full bg-gray-200 text-gray-700 rounded-xl py-3 hover:bg-gray-300 transition-colors"
        >
          Erneut versuchen
        </button>
        <p className="text-xs text-gray-400 mt-6">Im Notfall: 112 anrufen</p>
      </div>
    </div>
  );
}
