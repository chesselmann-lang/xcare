import { getLandConfig, LAENDER } from "@/lib/dach/laender";

export const metadata = {
  title: "Land & Region | xcare",
};

export default function LandEinstellungenPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Land & Region</h1>
      <p className="text-gray-500 mb-8">
        xcare ist für Deutschland, Österreich und die Schweiz verfügbar.
      </p>
      <div className="space-y-3">
        {Object.values(LAENDER).map((land) => (
          <div
            key={land.code}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{land.flag}</span>
              <div>
                <div className="font-semibold">{land.name}</div>
                <div className="text-sm text-gray-500">
                  {land.rechtsgrundlage} · {land.pflegestufen.anzahl}{" "}
                  {land.pflegestufen.bezeichnung}n · Notruf {land.notfallnummer}
                </div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                land.code === "DE"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {land.code === "DE" ? "Aktiv" : "Demnächst"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
