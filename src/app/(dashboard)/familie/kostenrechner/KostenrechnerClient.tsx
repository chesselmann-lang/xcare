"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator, ChevronRight, Info, TrendingDown, Wallet,
  Home, Sun, Activity, ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── SGB XI Leistungsbeträge 2024 (in €/Monat) ───────────────────────────────
const PFLEGEGELD: Record<number, number> = {
  1: 0, 2: 332, 3: 573, 4: 765, 5: 947,
};

const SACHLEISTUNG_AMBULANT: Record<number, number> = {
  1: 0, 2: 761, 3: 1432, 4: 1778, 5: 2200,
};

// Leistungsbetrag stationär (Pflegeversicherungsanteil)
const LEISTUNG_STATIONAER: Record<number, number> = {
  1: 125, 2: 770, 3: 1262, 4: 1775, 5: 2005,
};

// Tagespflege: wie ambulante Sachleistung
const LEISTUNG_TAGESPFLEGE: Record<number, number> = {
  1: 0, 2: 761, 3: 1432, 4: 1778, 5: 2200,
};

// Entlastungsbetrag (für alle Pflegegrade in ambulanter Pflege)
const ENTLASTUNGSBETRAG = 125;

// Ausbildungszuschlag stationär (§ 8 Abs. 9 SGB XI — ab 2024 einheitlich)
const AUSBILDUNGSZUSCHLAG_MONAT = 456; // ca. 15.20€/Tag × 30

type PflegeArt = "ambulant" | "stationaer" | "tagespflege";

function fmt(val: number) {
  return val.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function Slider({
  label, value, min, max, step = 50, onChange, suffix = "€/Monat",
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-sm font-medium text-[--foreground]">{label}</label>
        <span className="text-sm font-semibold text-[--primary]">{value.toLocaleString("de-DE")} {suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[--primary]"
      />
      <div className="flex justify-between text-[10px] text-[--muted-foreground] mt-0.5">
        <span>{min.toLocaleString("de-DE")} {suffix}</span>
        <span>{max.toLocaleString("de-DE")} {suffix}</span>
      </div>
    </div>
  );
}

export function KostenrechnerClient() {
  const [pflegegrad, setPflegegrad] = useState<number>(2);
  const [pflegeArt, setPflegeArt] = useState<PflegeArt>("ambulant");

  // Ambulant
  const [monatlicheKosten, setMonatlicheKosten] = useState(1500);
  const [nutztSachleistung, setNutztSachleistung] = useState(true);
  const [nutztEntlastung, setNutztEntlastung] = useState(true);

  // Stationär
  const [heimkosten, setHeimkosten] = useState(3500);
  const [investitionskosten, setInvestitionskosten] = useState(400);

  // Tagespflege
  const [tagespflegeKosten, setTagespflegeKosten] = useState(1200);
  const [tagepflegeTage, setTagespflegeTage] = useState(15);

  const ergebnis = useMemo(() => {
    if (pflegeArt === "ambulant") {
      const sachleistung = nutztSachleistung ? SACHLEISTUNG_AMBULANT[pflegegrad] : 0;
      const entlastung = nutztEntlastung ? ENTLASTUNGSBETRAG : 0;
      const geldleistung = nutztSachleistung ? 0 : PFLEGEGELD[pflegegrad];
      const gesamtLeistung = sachleistung + entlastung;
      const eigenanteil = Math.max(0, monatlicheKosten - gesamtLeistung);
      const netto = monatlicheKosten - geldleistung - gesamtLeistung;
      return {
        pflegeversicherung: gesamtLeistung,
        pflegegeld: geldleistung,
        eigenanteil,
        netto: Math.max(0, netto),
        details: [
          { label: "Monatliche Pflegekosten", wert: monatlicheKosten, farbe: "text-gray-800" },
          { label: nutztSachleistung ? "− Sachleistung (PG " + pflegegrad + ")" : "Pflegegeld (PG " + pflegegrad + ")", wert: nutztSachleistung ? sachleistung : geldleistung, farbe: "text-green-600" },
          ...(nutztEntlastung ? [{ label: "− Entlastungsbetrag", wert: entlastung, farbe: "text-green-600" }] : []),
          { label: "= Ihr Eigenanteil", wert: eigenanteil, farbe: "text-rose-600 font-bold" },
        ],
      };
    }

    if (pflegeArt === "stationaer") {
      const pflegeleistung = LEISTUNG_STATIONAER[pflegegrad];
      const gesamtKosten = heimkosten + investitionskosten + AUSBILDUNGSZUSCHLAG_MONAT;
      const eigenanteilPflege = Math.max(0, heimkosten - pflegeleistung);
      const eigenanteilGesamt = eigenanteilPflege + investitionskosten + AUSBILDUNGSZUSCHLAG_MONAT;
      return {
        pflegeversicherung: pflegeleistung,
        pflegegeld: 0,
        eigenanteil: eigenanteilGesamt,
        netto: eigenanteilGesamt,
        details: [
          { label: "Heimkosten (Pflege + Unterkunft/Verpflegung)", wert: heimkosten, farbe: "text-gray-800" },
          { label: "Investitionskosten (Eigenanteil)", wert: investitionskosten, farbe: "text-gray-800" },
          { label: "Ausbildungszuschlag", wert: AUSBILDUNGSZUSCHLAG_MONAT, farbe: "text-gray-800" },
          { label: "− Pflegeversicherungsleistung (PG " + pflegegrad + ")", wert: pflegeleistung, farbe: "text-green-600" },
          { label: "= Ihr Eigenanteil (gesamt)", wert: eigenanteilGesamt, farbe: "text-rose-600 font-bold" },
        ],
      };
    }

    // Tagespflege
    const leistung = LEISTUNG_TAGESPFLEGE[pflegegrad];
    const monatKosten = (tagespflegeKosten / 20) * tagepflegeTage; // pro Tag hochrechnen
    const eigenanteil = Math.max(0, monatKosten - leistung - ENTLASTUNGSBETRAG);
    return {
      pflegeversicherung: leistung + ENTLASTUNGSBETRAG,
      pflegegeld: 0,
      eigenanteil,
      netto: eigenanteil,
      details: [
        { label: `Tagespflegekosten (${tagepflegeTage} Tage/Monat)`, wert: monatKosten, farbe: "text-gray-800" },
        { label: "− Tagespflegeleistung (PG " + pflegegrad + ")", wert: leistung, farbe: "text-green-600" },
        { label: "− Entlastungsbetrag", wert: ENTLASTUNGSBETRAG, farbe: "text-green-600" },
        { label: "= Ihr Eigenanteil", wert: eigenanteil, farbe: "text-rose-600 font-bold" },
      ],
    };
  }, [pflegegrad, pflegeArt, monatlicheKosten, nutztSachleistung, nutztEntlastung, heimkosten, investitionskosten, tagespflegeKosten, tagepflegeTage]);

  const pflegeArtConfig: Array<{ id: PflegeArt; label: string; icon: React.ElementType; desc: string }> = [
    { id: "ambulant",   label: "Ambulant",   icon: Activity, desc: "Pflegedienst zu Hause" },
    { id: "stationaer", label: "Stationär",  icon: Home,     desc: "Pflegeheim / vollstationär" },
    { id: "tagespflege",label: "Tagespflege",icon: Sun,      desc: "Teilstationäre Tagesbetreuung" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/familie" className="inline-flex items-center gap-1 text-sm text-[--muted-foreground] hover:text-[--foreground] mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Zurück zum Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Calculator className="h-6 w-6 text-[--primary]" />
          Pflegeleistungen-Kostenrechner
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Berechnen Sie Ihren Eigenanteil nach SGB XI — Angaben 2024, ohne Gewähr.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Linke Seite: Eingaben */}
        <div className="space-y-4">
          {/* Pflegegrad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pflegegrad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setPflegegrad(pg)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                      pflegegrad === pg
                        ? "bg-[--primary] text-white border-[--primary] shadow-sm"
                        : "bg-white text-[--foreground] border-[--border] hover:border-[--primary]/50"
                    }`}
                  >
                    PG {pg}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-[--muted-foreground] bg-[--muted] rounded-lg p-2.5">
                {pflegegrad === 1 && "Geringe Beeinträchtigung der Selbstständigkeit — keine Sachleistungen"}
                {pflegegrad === 2 && "Erhebliche Beeinträchtigung — Sachleistung bis 761 €/Monat"}
                {pflegegrad === 3 && "Schwere Beeinträchtigung — Sachleistung bis 1.432 €/Monat"}
                {pflegegrad === 4 && "Schwerste Beeinträchtigung — Sachleistung bis 1.778 €/Monat"}
                {pflegegrad === 5 && "Schwerste Beeinträchtigung, besonderer Bedarf — bis 2.200 €/Monat"}
              </div>
            </CardContent>
          </Card>

          {/* Pflegeart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Art der Pflege</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pflegeArtConfig.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => setPflegeArt(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      pflegeArt === id
                        ? "border-[--primary] bg-[--primary]/5"
                        : "border-[--border] hover:border-[--primary]/40"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${pflegeArt === id ? "bg-[--primary]/10" : "bg-[--muted]"}`}>
                      <Icon className={`h-4 w-4 ${pflegeArt === id ? "text-[--primary]" : "text-[--muted-foreground]"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${pflegeArt === id ? "text-[--primary]" : "text-[--foreground]"}`}>{label}</p>
                      <p className="text-xs text-[--muted-foreground]">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Kosteneingaben je nach Pflegeart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kosten & Leistungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {pflegeArt === "ambulant" && (
                <>
                  <Slider
                    label="Monatliche Pflegedienstkosten"
                    value={monatlicheKosten}
                    min={0} max={5000} step={50}
                    onChange={setMonatlicheKosten}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[--foreground]">Leistungsart</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={nutztSachleistung}
                        onChange={() => setNutztSachleistung(true)}
                        className="accent-[--primary]"
                      />
                      <span className="text-sm">Sachleistung (Pflegedienstabrechnung)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!nutztSachleistung}
                        onChange={() => setNutztSachleistung(false)}
                        className="accent-[--primary]"
                      />
                      <span className="text-sm">Pflegegeld (Angehörigenpflege)</span>
                    </label>
                  </div>
                  {nutztSachleistung && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nutztEntlastung}
                        onChange={(e) => setNutztEntlastung(e.target.checked)}
                        className="accent-[--primary] h-4 w-4"
                      />
                      <span className="text-sm">Entlastungsbetrag (125 €/Monat) einrechnen</span>
                    </label>
                  )}
                </>
              )}

              {pflegeArt === "stationaer" && (
                <>
                  <Slider
                    label="Monatliche Heimkosten (Pflege + Unterkunft/Verpflegung)"
                    value={heimkosten}
                    min={1500} max={8000} step={50}
                    onChange={setHeimkosten}
                  />
                  <Slider
                    label="Investitionskosten (Eigenanteil)"
                    value={investitionskosten}
                    min={0} max={800} step={25}
                    onChange={setInvestitionskosten}
                  />
                  <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Ausbildungszuschlag (~456 €/Monat) wird automatisch addiert.
                  </div>
                </>
              )}

              {pflegeArt === "tagespflege" && (
                <>
                  <Slider
                    label="Tagespflegekosten pro Tag"
                    value={tagespflegeKosten}
                    min={0} max={200} step={5}
                    onChange={setTagespflegeKosten}
                    suffix="€/Tag"
                  />
                  <Slider
                    label="Tage pro Monat"
                    value={tagepflegeTage}
                    min={1} max={22} step={1}
                    onChange={setTagespflegeTage}
                    suffix="Tage"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rechte Seite: Ergebnis */}
        <div className="space-y-4">
          {/* Eigenanteil Hero */}
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
            <CardContent className="pt-6 pb-6 text-center">
              <TrendingDown className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm text-[--muted-foreground] mb-1">Ihr geschätzter Eigenanteil</p>
              <p className="text-4xl font-bold text-rose-600">{fmt(ergebnis.eigenanteil)}</p>
              <p className="text-xs text-[--muted-foreground] mt-1">pro Monat</p>
              {ergebnis.pflegeversicherung > 0 && (
                <div className="mt-4 flex justify-center">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    Pflegeversicherung übernimmt {fmt(ergebnis.pflegeversicherung)}/Monat
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aufschlüsselung */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Kostenaufschlüsselung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {ergebnis.details.map((d, i) => (
                  <div key={i} className={`flex justify-between items-center text-sm ${i === ergebnis.details.length - 1 ? "pt-2 border-t border-[--border]" : ""}`}>
                    <span className="text-[--muted-foreground]">{d.label}</span>
                    <span className={`font-semibold ${d.farbe}`}>{fmt(d.wert)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Referenzwerte */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SGB XI Leistungsbeträge 2024 (PG {pflegegrad})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pflegeArt === "ambulant" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Pflegegeld</span>
                    <span className="font-medium">{fmt(PFLEGEGELD[pflegegrad])}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Sachleistung</span>
                    <span className="font-medium">{fmt(SACHLEISTUNG_AMBULANT[pflegegrad])}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Entlastungsbetrag</span>
                    <span className="font-medium">{fmt(ENTLASTUNGSBETRAG)}</span>
                  </div>
                </>
              )}
              {pflegeArt === "stationaer" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Pflegeversicherungsleistung</span>
                    <span className="font-medium">{fmt(LEISTUNG_STATIONAER[pflegegrad])}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Ausbildungszuschlag</span>
                    <span className="font-medium">{fmt(AUSBILDUNGSZUSCHLAG_MONAT)}</span>
                  </div>
                </>
              )}
              {pflegeArt === "tagespflege" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Tagespflegeleistung</span>
                    <span className="font-medium">{fmt(LEISTUNG_TAGESPFLEGE[pflegegrad])}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--muted-foreground]">Entlastungsbetrag</span>
                    <span className="font-medium">{fmt(ENTLASTUNGSBETRAG)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Hinweis */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <strong>Hinweis:</strong> Alle Angaben basieren auf den SGB XI Leistungsbeträgen 2024 und dienen nur zur
              Orientierung. Tatsächliche Kosten können abweichen. Wenden Sie sich an Ihre Pflegekasse oder einen
              zugelassenen Pflegeberater für eine individuelle Beratung.
            </div>
          </div>

          {/* CTA */}
          <Link href="/familie/finanzen" className="flex items-center justify-between p-3 rounded-xl bg-[--primary]/5 border border-[--primary]/20 hover:bg-[--primary]/10 transition-colors group">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[--primary]" />
              <span className="text-sm font-medium text-[--primary]">Zum Finanz-Hub</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[--primary] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
