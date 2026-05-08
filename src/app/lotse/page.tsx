"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, MapPin, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LebenslagePicker } from "@/components/lebenslage/LebenslagePicker";
import { LotseChat } from "@/components/ki/LotseChat";
import type { LebenslageTyp } from "@/lib/types";
import { LEBENSLAGEN } from "@/lib/constants";

type Schritt = "lebenslage" | "plz" | "chat";

export default function LotsePage() {
  const searchParams = useSearchParams();
  const initialLL = searchParams.get("lebenslage") as LebenslageTyp | null;

  const [schritt, setSchritt] = useState<Schritt>(initialLL ? "plz" : "lebenslage");
  const [lebenslage, setLebenslage] = useState<LebenslageTyp | null>(initialLL);
  const [plz, setPlz] = useState("");
  const [plzError, setPlzError] = useState("");

  function handleLebenslagSelect(ll: LebenslageTyp) {
    setLebenslage(ll);
    setSchritt("plz");
  }

  function handlePlzWeiter() {
    if (!/^\d{5}$/.test(plz)) {
      setPlzError("Bitte eine gültige 5-stellige PLZ eingeben");
      return;
    }
    setPlzError("");
    setSchritt("chat");
  }

  const ll = lebenslage ? LEBENSLAGEN[lebenslage] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {schritt !== "lebenslage" && (
            <button
              onClick={() => setSchritt(schritt === "chat" ? "plz" : "lebenslage")}
              className="text-[--muted-foreground] hover:text-[--foreground] flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            {(["lebenslage", "plz", "chat"] as Schritt[]).map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  schritt === s
                    ? "w-8 bg-[--primary]"
                    : i < ["lebenslage", "plz", "chat"].indexOf(schritt)
                    ? "w-2 bg-[--primary]"
                    : "w-2 bg-[--border]"
                }`}
              />
            ))}
          </div>
        </div>
        <h1 className="text-3xl font-bold">Lebenslage-Lotse</h1>
        <p className="text-[--muted-foreground] mt-1">
          Ihr persönlicher KI-Berater für Sozialleistungen und Pflegeangebote
        </p>
      </div>

      {/* Schritt 1: Lebenslage wählen */}
      {schritt === "lebenslage" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            In welcher Lebenssituation befinden Sie sich?
          </h2>
          <LebenslagePicker selected={lebenslage} onSelect={handleLebenslagSelect} />
        </div>
      )}

      {/* Schritt 2: PLZ */}
      {schritt === "plz" && ll && (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center pb-4">
            <span className="text-5xl mb-2 block">{ll.emoji}</span>
            <CardTitle>{ll.label}</CardTitle>
            <p className="text-sm text-[--muted-foreground]">{ll.beschreibung}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plz" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Ihre Postleitzahl
              </Label>
              <Input
                id="plz"
                placeholder="z.B. 10115"
                maxLength={5}
                value={plz}
                onChange={(e) => setPlz(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handlePlzWeiter()}
              />
              {plzError && <p className="text-xs text-[--danger]">{plzError}</p>}
              <p className="text-xs text-[--muted-foreground]">
                Wird nur für die Anbietersuche in Ihrer Nähe verwendet.
              </p>
            </div>
            <Button onClick={handlePlzWeiter} className="w-full gap-2">
              Lotse starten <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schritt 3: Chat */}
      {schritt === "chat" && lebenslage && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[--primary-light] border border-[--primary]/20">
            <span className="text-2xl">{ll?.emoji}</span>
            <div>
              <p className="font-medium text-sm">{ll?.label}</p>
              <p className="text-xs text-[--muted-foreground]">PLZ {plz}</p>
            </div>
            <button
              className="ml-auto text-xs text-[--primary] hover:underline"
              onClick={() => setSchritt("lebenslage")}
            >
              Ändern
            </button>
          </div>
          <LotseChat
            lebenslage={lebenslage}
            antworten={[]}
            plz={plz}
            initialMessage={`Ich befinde mich in der Lebenssituation "${ll?.label}". Was sind meine wichtigsten nächsten Schritte und welche Leistungen stehen mir zu?`}
          />
        </div>
      )}
    </div>
  );
}
