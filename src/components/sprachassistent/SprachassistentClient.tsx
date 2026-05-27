"use client";
import { useState, useEffect, useRef } from "react";

const COMMANDS: Record<string, { action: string | null; description: string }> = {
  "notfall": { action: "/familie/notfall", description: "Notfallplan öffnen" },
  "termin buchen": { action: "/familie/pflegeboerse", description: "Zur Pflegebörse" },
  "pflegegrad": { action: "/familie/pflegegrad-coach", description: "Pflegegrad-Coach öffnen" },
  "arztbrief": { action: "/familie/arztbrief", description: "Arztbrief generieren" },
  "vitaldaten": { action: "/familie/gesundheit", description: "Vitaldaten eingeben" },
  "kosten": { action: "/familie/kosten", description: "Kostenübersicht anzeigen" },
  "antrag stellen": { action: "/familie/antraege/neu", description: "Antrag erstellen" },
  "hilfe": { action: null, description: "Verfügbare Befehle anzeigen" },
};

export function SprachassistentClient() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript.toLowerCase().trim();
      setTranscript(text);

      if (result.isFinal) {
        setStatus("processing");
        // Find matching command
        const match = Object.entries(COMMANDS).find(([cmd]) => text.includes(cmd));
        if (match) {
          const [cmd, { action, description }] = match;
          setMessage(`✓ Verstanden: "${description}"`);
          setStatus("success");
          if (action) {
            setTimeout(() => window.location.href = action, 1000);
          }
        } else {
          setMessage(`Befehl nicht erkannt: "${text}". Sagen Sie "Hilfe" für verfügbare Befehle.`);
          setStatus("error");
        }
        setIsListening(false);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setStatus("error"); setMessage("Mikrofon-Fehler"); setIsListening(false); };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setStatus("listening");
    setTranscript("");
    setMessage("");
    setIsListening(true);
    (recognitionRef.current as any).start();
  };

  const stopListening = () => {
    if (recognitionRef.current) (recognitionRef.current as any).stop();
    setIsListening(false);
    setStatus("idle");
  };

  if (!supported) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
      Ihr Browser unterstützt keine Spracheingabe. Bitte verwenden Sie Chrome oder Edge.
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main button */}
      <div className="flex flex-col items-center gap-4 py-10 bg-white rounded-2xl border border-gray-200">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl transition-all shadow-lg ${
            isListening
              ? "bg-red-500 hover:bg-red-600 scale-110 shadow-red-300 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
          }`}
        >
          {isListening ? "⏹" : "🎤"}
        </button>
        <p className="text-gray-600 font-medium">
          {isListening ? "Ich höre zu..." : "Tippen zum Sprechen"}
        </p>
        {transcript && (
          <div className="bg-gray-50 rounded-xl px-4 py-2 text-gray-700 italic max-w-xs text-center">
            "{transcript}"
          </div>
        )}
        {message && (
          <div className={`rounded-xl px-4 py-2 text-sm font-medium ${
            status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Available commands */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Verfügbare Sprachbefehle:</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COMMANDS).map(([cmd, { description }]) => (
            <div key={cmd} className="flex items-center gap-2 text-sm">
              <span className="text-blue-500">▸</span>
              <div>
                <span className="font-mono bg-gray-200 rounded px-1">"{cmd}"</span>
                <span className="text-gray-500 ml-1">→ {description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
