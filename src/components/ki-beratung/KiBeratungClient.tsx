'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from 'react'
import {
  Bot,
  User,
  Plus,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Search,
  FileText,
  Calculator,
  Calendar,
  Wrench,
  Download,
  X,
  Pencil,
  MessageSquare,
  Clock,
  MapPin,
  Scale,
  Stethoscope,
  FolderOpen,
  Euro,
  HelpCircle,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

type Thema =
  | 'pflegegrad'
  | 'ansprueche'
  | 'anbieter'
  | 'kosten'
  | 'rechtliches'
  | 'medizinisch'
  | 'organisation'
  | 'dokumente'
  | 'sonstiges'

type BeratungStatus = 'aktiv' | 'archiviert' | 'eskaliert'

interface Beratung {
  id: string
  titel: string | null
  thema: Thema | null
  status: BeratungStatus
  nachrichten_count: number
  letzte_nachricht_am: string
  erstellt_am: string
}

interface ToolCall {
  name: string
  input: unknown
  output: unknown
}

interface DokumentGeneriert {
  typ: string
  titel: string
  inhalt: string
}

interface ChatMessage {
  id: string
  rolle: 'user' | 'assistant' | 'system'
  inhalt: string
  toolCalls?: ToolCall[]
  dokument?: DokumentGeneriert
  streaming?: boolean
}

interface Followup {
  id: string
  aufgabe: string
  faellig_am: string
  erledigt: boolean
  beratung_id: string
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface KiBeratungClientProps {
  initialBeratungen: Beratung[]
  initialFollowups: Followup[]
}

// ── Konstanten ─────────────────────────────────────────────────────────────────

const THEMA_LABELS: Record<Thema, string> = {
  pflegegrad: 'Pflegegrad',
  ansprueche: 'Ansprüche',
  anbieter: 'Anbieter',
  kosten: 'Kosten',
  rechtliches: 'Rechtliches',
  medizinisch: 'Medizinisch',
  organisation: 'Organisation',
  dokumente: 'Dokumente',
  sonstiges: 'Sonstiges',
}

const THEMA_ICONS: Record<Thema, React.ElementType> = {
  pflegegrad: Scale,
  ansprueche: CheckCircle2,
  anbieter: MapPin,
  kosten: Euro,
  rechtliches: Scale,
  medizinisch: Stethoscope,
  organisation: FolderOpen,
  dokumente: FileText,
  sonstiges: HelpCircle,
}

const TOOL_LABELS: Record<string, string> = {
  search_anbieter: 'Anbieter-Suche',
  check_ansprueche: 'Ansprüche prüfen',
  generate_document: 'Dokument erstellen',
  berechne_kosten: 'Kosten berechnen',
  schedule_followup: 'Erinnerung anlegen',
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  search_anbieter: Search,
  check_ansprueche: CheckCircle2,
  generate_document: FileText,
  berechne_kosten: Calculator,
  schedule_followup: Calendar,
}

const QUICK_STARTS = [
  { label: 'Pflegegrad beantragen', thema: 'pflegegrad' as Thema, nachricht: 'Wie beantrage ich einen Pflegegrad? Was muss ich beachten?' },
  { label: 'Anbieter finden', thema: 'anbieter' as Thema, nachricht: 'Ich suche einen Pflegedienst in meiner Nähe. Wie gehe ich vor?' },
  { label: 'Kosten berechnen', thema: 'kosten' as Thema, nachricht: 'Welche Kosten kommen bei der Pflege auf mich zu und was übernimmt die Kasse?' },
  { label: 'Widerspruch einlegen', thema: 'rechtliches' as Thema, nachricht: 'Ich möchte gegen meinen Pflegegrad-Bescheid Widerspruch einlegen. Wie geht das?' },
  { label: 'Antrag ausfüllen', thema: 'dokumente' as Thema, nachricht: 'Können Sie mir eine Vorlage für einen Pflegegeldantrag erstellen?' },
  { label: 'Wo anfangen?', thema: 'sonstiges' as Thema, nachricht: 'Mein Angehöriger braucht Pflege. Ich weiß nicht, wo ich anfangen soll. Können Sie mir helfen?' },
]

const THEMEN_FILTER: Array<{ value: Thema | 'alle'; label: string }> = [
  { value: 'alle', label: 'Alle' },
  { value: 'pflegegrad', label: 'Pflegegrad' },
  { value: 'ansprueche', label: 'Ansprüche' },
  { value: 'anbieter', label: 'Anbieter' },
  { value: 'kosten', label: 'Kosten' },
  { value: 'rechtliches', label: 'Rechtliches' },
]

// ── Helper ─────────────────────────────────────────────────────────────────────

function formatDatum(iso: string) {
  const d = new Date(iso)
  const heute = new Date()
  const gestern = new Date(heute)
  gestern.setDate(gestern.getDate() - 1)

  if (d.toDateString() === heute.toDateString()) {
    return `Heute ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (d.toDateString() === gestern.toDateString()) {
    return 'Gestern'
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDatumKurz(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Sub-Komponenten ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: BeratungStatus }) {
  const colors = {
    aktiv: 'bg-green-500',
    archiviert: 'bg-gray-400',
    eskaliert: 'bg-orange-500',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`}
      title={status === 'aktiv' ? 'Aktiv' : status === 'archiviert' ? 'Archiviert' : 'Eskaliert'}
    />
  )
}

function ThemaBadge({ thema }: { thema: Thema | null }) {
  if (!thema) return null
  const Icon = THEMA_ICONS[thema]
  return (
    <Badge variant="secondary" className="text-xs gap-1 py-0">
      <Icon className="h-2.5 w-2.5" />
      {THEMA_LABELS[thema]}
    </Badge>
  )
}

function ToolIndicator({ toolCall, expanded, onToggle }: {
  toolCall: ToolCall
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = TOOL_ICONS[toolCall.name] ?? Wrench
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name

  return (
    <div className="my-1.5">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Icon className="h-3 w-3" />
        {label} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div className="mt-1.5 ml-2 p-2.5 rounded-lg bg-[--muted] border border-[--border] text-xs font-mono text-[--muted-foreground] max-h-48 overflow-y-auto">
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(toolCall.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function DokumentKarte({ dokument }: { dokument: DokumentGeneriert }) {
  const [preview, setPreview] = useState(false)

  function download() {
    const blob = new Blob([dokument.inhalt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dokument.titel.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-2 border border-[--border] rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-[--muted] border-b border-[--border]">
        <FileText className="h-4 w-4 text-[--primary]" />
        <span className="text-sm font-medium text-[--foreground] flex-1 truncate">{dokument.titel}</span>
        <button
          onClick={() => setPreview(!preview)}
          className="text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
        >
          {preview ? 'Ausblenden' : 'Vorschau'}
        </button>
        <Button size="sm" variant="outline" onClick={download} className="h-6 text-xs gap-1 px-2">
          <Download className="h-3 w-3" />
          Herunterladen
        </Button>
      </div>
      {preview && (
        <div className="p-3 max-h-64 overflow-y-auto">
          <pre className="text-xs text-[--foreground] whitespace-pre-wrap font-sans leading-relaxed">
            {dokument.inhalt}
          </pre>
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--muted] text-[--primary] flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[--muted] border border-[--border]">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-[--muted-foreground] rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-[--muted-foreground] rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-[--muted-foreground] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set())
  const isUser = msg.rolle === 'user'
  const isSystem = msg.rolle === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-[--muted-foreground] bg-[--muted] px-3 py-1 rounded-full">
          {msg.inhalt}
        </span>
      </div>
    )
  }

  function toggleTool(idx: number) {
    setExpandedTools((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
          isUser ? 'bg-[--primary] text-white' : 'bg-[--muted] text-[--primary] border border-[--border]'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`max-w-[82%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tool calls (only for assistant) */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-col gap-0.5 w-full">
            {msg.toolCalls.map((tc, i) => (
              <ToolIndicator
                key={i}
                toolCall={tc}
                expanded={expandedTools.has(i)}
                onToggle={() => toggleTool(i)}
              />
            ))}
          </div>
        )}

        {/* Nachrichtenblase */}
        {msg.inhalt && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? 'bg-[--primary] text-white rounded-br-sm'
                : 'bg-white border border-[--border] text-[--foreground] rounded-bl-sm shadow-sm'
            } ${msg.streaming ? 'after:content-["▋"] after:text-[--primary] after:animate-pulse' : ''}`}
          >
            {msg.inhalt}
          </div>
        )}

        {/* Dokument-Karte */}
        {!isUser && msg.dokument && <DokumentKarte dokument={msg.dokument} />}
      </div>
    </div>
  )
}

function EskalationsModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: { kontaktzeit: string; beschreibung: string }) => void
}) {
  const [kontaktzeit, setKontaktzeit] = useState('')
  const [beschreibung, setBeschreibung] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4 flex items-center gap-3">
          <PhoneCall className="h-5 w-5 text-orange-600" />
          <div>
            <p className="font-semibold text-orange-900">Persönliche Beratung</p>
            <p className="text-xs text-orange-700">Zertifizierter Pflegeberater nach §7a SGB XI</p>
          </div>
          <button onClick={onClose} className="ml-auto text-orange-600 hover:text-orange-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[--muted-foreground]">
            Wir verbinden Sie mit einem zertifizierten Pflegeberater. Bitte teilen Sie uns kurz mit,
            wann wir Sie erreichen können und worum es geht.
          </p>
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Bevorzugte Kontaktzeit
            </label>
            <select
              value={kontaktzeit}
              onChange={(e) => setKontaktzeit(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-white text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring]"
            >
              <option value="">Bitte wählen…</option>
              <option value="morgens">Morgens (8–12 Uhr)</option>
              <option value="mittags">Mittags (12–14 Uhr)</option>
              <option value="nachmittags">Nachmittags (14–17 Uhr)</option>
              <option value="flexibel">Flexibel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Kurzbeschreibung Ihres Anliegens
            </label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              placeholder="z.B. Widerspruch gegen Pflegegrad-Einstufung, komplexe Familiensituation…"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-white text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--ring]"
            />
          </div>
          <Button
            onClick={() => {
              if (!kontaktzeit || !beschreibung.trim()) {
                toast.error('Bitte füllen Sie alle Felder aus.')
                return
              }
              onSubmit({ kontaktzeit, beschreibung })
            }}
            className="w-full"
          >
            Beratungsanfrage senden
          </Button>
          <p className="text-xs text-center text-[--muted-foreground]">
            Kostenlose Erstberatung · Rückruf innerhalb von 24h
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────

export function KiBeratungClient({ initialBeratungen, initialFollowups }: KiBeratungClientProps) {
  const [beratungen, setBeratungen] = useState<Beratung[]>(initialBeratungen)
  const [followups, setFollowups] = useState<Followup[]>(initialFollowups)
  const [activeBeratung, setActiveBeratung] = useState<Beratung | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [eingabe, setEingabe] = useState('')
  const [laden, setLaden] = useState(false)
  const [sidebarOffen, setSidebarOffen] = useState(true)
  const [themenFilter, setThemenFilter] = useState<Thema | 'alle'>('alle')
  const [titelBearbeiten, setTitelBearbeiten] = useState(false)
  const [titelDraft, setTitelDraft] = useState('')
  const [eskalationsModal, setEskalationsModal] = useState(false)
  const [activeToolStates, setActiveToolStates] = useState<string[]>([])
  const [beratungsladenSpinner, setBeratungsladenSpinner] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titelInputRef = useRef<HTMLInputElement>(null)

  // Nachrichten-Count für Empfehlung-Bar
  const nachrichtenSeitEmpfehlung = useRef(0)
  const [empfehlungSichtbar, setEmpfehlungSichtbar] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeToolStates])

  useEffect(() => {
    if (titelBearbeiten) {
      setTimeout(() => titelInputRef.current?.focus(), 50)
    }
  }, [titelBearbeiten])

  // ── Beratung laden ──────────────────────────────────────────────────────────

  async function beratungLaden(beratung: Beratung) {
    setActiveBeratung(beratung)
    setMessages([])
    setBeratungsladenSpinner(true)

    try {
      const res = await fetch(`/api/ki-beratung/${beratung.id}/nachrichten`)
      if (res.ok) {
        const json = await res.json() as { nachrichten: Array<{ id: string; rolle: 'user' | 'assistant'; inhalt: string; tool_aufrufe?: ToolCall[]; dokument_generiert?: DokumentGeneriert }> }
        const loaded: ChatMessage[] = (json.nachrichten ?? []).map((n) => ({
          id: n.id,
          rolle: n.rolle,
          inhalt: n.inhalt,
          toolCalls: n.tool_aufrufe ?? undefined,
          dokument: n.dokument_generiert ?? undefined,
        }))
        setMessages(loaded)
      } else {
        // Fallback: leerer Chat mit Begrüssung
        setMessages([
          {
            id: 'welcome',
            rolle: 'assistant',
            inhalt: `Guten Tag! Ich bin Ihr persönlicher Pflegeberater. Wie kann ich Ihnen heute helfen?`,
          },
        ])
      }
    } catch {
      setMessages([
        {
          id: 'welcome',
          rolle: 'assistant',
          inhalt: `Guten Tag! Ich bin Ihr persönlicher Pflegeberater. Wie kann ich Ihnen heute helfen?`,
        },
      ])
    } finally {
      setBeratungsladenSpinner(false)
    }
  }

  // ── Neue Beratung ───────────────────────────────────────────────────────────

  async function neueBeratung(thema?: Thema, ersteNachricht?: string) {
    setLaden(true)
    try {
      const res = await fetch('/api/ki-beratung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json() as { beratung: Beratung }
      const neu = json.beratung
      setBeratungen((prev) => [neu, ...prev])
      setActiveBeratung(neu)
      setMessages([
        {
          id: 'welcome',
          rolle: 'assistant',
          inhalt: `Guten Tag! Ich bin Ihr persönlicher Pflegeberater — 24/7 für Sie da.\n\nIch bin nach §7a SGB XI geschult und helfe Ihnen bei allen Fragen rund um Pflege, Ansprüche, Anbieter und Anträge. Was beschäftigt Sie?`,
        },
      ])
      if (ersteNachricht) {
        setTimeout(() => {
          setEingabe(ersteNachricht)
          textareaRef.current?.focus()
        }, 100)
      }
    } catch {
      toast.error('Neue Beratung konnte nicht erstellt werden.')
    } finally {
      setLaden(false)
    }
  }

  // ── Nachricht senden ────────────────────────────────────────────────────────

  const senden = useCallback(async () => {
    if (!activeBeratung || !eingabe.trim() || laden) return
    const text = eingabe.trim()
    setEingabe('')
    setLaden(true)

    const userMsgId = `user-${Date.now()}`
    const assistantMsgId = `assistant-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, rolle: 'user', inhalt: text },
      { id: assistantMsgId, rolle: 'assistant', inhalt: '', streaming: true },
    ])

    nachrichtenSeitEmpfehlung.current += 1
    if (nachrichtenSeitEmpfehlung.current % 3 === 0) {
      setEmpfehlungSichtbar(true)
    }

    try {
      const res = await fetch(`/api/ki-beratung/${activeBeratung.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nachricht: text }),
      })

      if (!res.ok || !res.body) {
        throw new Error('API-Fehler')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      const toolCalls: ToolCall[] = []
      let activeTools: string[] = []
      let dokument: DokumentGeneriert | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        const lines = raw.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          let event: Record<string, unknown>
          try {
            event = JSON.parse(payload) as Record<string, unknown>
          } catch {
            continue
          }

          if (event.type === 'text') {
            assistantText += (event.content as string) ?? ''
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, inhalt: assistantText, streaming: true } : m
              )
            )
          } else if (event.type === 'tool_start') {
            const toolName = event.tool as string
            activeTools = [...activeTools, toolName]
            setActiveToolStates([...activeTools])
          } else if (event.type === 'tool_end') {
            const toolName = event.tool as string
            activeTools = activeTools.filter((t) => t !== toolName)
            setActiveToolStates([...activeTools])
            toolCalls.push({
              name: toolName,
              input: {},
              output: event.result,
            })
          } else if (event.type === 'done') {
            const doneToolAufrufe = event.tool_aufrufe as ToolCall[] | undefined
            const doneDok = event.dokument_generiert as DokumentGeneriert | null | undefined
            if (doneDok) dokument = doneDok
            if (doneToolAufrufe) {
              toolCalls.splice(0, toolCalls.length, ...doneToolAufrufe)
            }
          } else if (event.type === 'error') {
            toast.error((event.message as string) ?? 'Fehler beim Laden der Antwort.')
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                inhalt: assistantText,
                streaming: false,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                dokument: dokument ?? undefined,
              }
            : m
        )
      )
      setActiveToolStates([])

      // Beratung in Liste aktualisieren
      setBeratungen((prev) =>
        prev.map((b) =>
          b.id === activeBeratung.id
            ? {
                ...b,
                nachrichten_count: b.nachrichten_count + 2,
                letzte_nachricht_am: new Date().toISOString(),
              }
            : b
        )
      )
    } catch {
      toast.error('Verbindung zum KI-Berater unterbrochen. Bitte versuchen Sie es erneut.')
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
    } finally {
      setLaden(false)
      setActiveToolStates([])
    }
  }, [activeBeratung, eingabe, laden])

  // ── Titel speichern ─────────────────────────────────────────────────────────

  async function titelSpeichern() {
    if (!activeBeratung || !titelDraft.trim()) {
      setTitelBearbeiten(false)
      return
    }
    const neuerTitel = titelDraft.trim()
    setTitelBearbeiten(false)
    setActiveBeratung((prev) => (prev ? { ...prev, titel: neuerTitel } : prev))
    setBeratungen((prev) =>
      prev.map((b) => (b.id === activeBeratung.id ? { ...b, titel: neuerTitel } : b))
    )
    await fetch(`/api/ki-beratung/${activeBeratung.id}/chat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titel: neuerTitel }),
    })
  }

  // ── Thema ändern ────────────────────────────────────────────────────────────

  async function themaSpeichern(thema: Thema) {
    if (!activeBeratung) return
    setActiveBeratung((prev) => (prev ? { ...prev, thema } : prev))
    setBeratungen((prev) =>
      prev.map((b) => (b.id === activeBeratung.id ? { ...b, thema } : b))
    )
    await fetch(`/api/ki-beratung/${activeBeratung.id}/chat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thema }),
    })
  }

  // ── Archivieren ─────────────────────────────────────────────────────────────

  async function archivieren() {
    if (!activeBeratung) return
    const neuerStatus: BeratungStatus = activeBeratung.status === 'archiviert' ? 'aktiv' : 'archiviert'
    setActiveBeratung((prev) => (prev ? { ...prev, status: neuerStatus } : prev))
    setBeratungen((prev) =>
      prev.map((b) => (b.id === activeBeratung.id ? { ...b, status: neuerStatus } : b))
    )
    await fetch(`/api/ki-beratung/${activeBeratung.id}/chat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: neuerStatus }),
    })
    toast.success(neuerStatus === 'archiviert' ? 'Beratung archiviert.' : 'Beratung wieder aktiviert.')
  }

  // ── Eskalation ──────────────────────────────────────────────────────────────

  async function eskalieren(data: { kontaktzeit: string; beschreibung: string }) {
    if (!activeBeratung) return
    setEskalationsModal(false)

    const email = 'beratung@xcare.de' // TODO: konfigurierbarer Pflegeberater-Kontakt
    await fetch(`/api/ki-beratung/${activeBeratung.id}/chat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'eskaliert', eskaliert_an: email }),
    })
    setActiveBeratung((prev) => (prev ? { ...prev, status: 'eskaliert' } : prev))
    setBeratungen((prev) =>
      prev.map((b) => (b.id === activeBeratung.id ? { ...b, status: 'eskaliert' } : b))
    )

    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        rolle: 'system',
        inhalt: `Ihre Anfrage wurde an einen Pflegeberater weitergeleitet. Bevorzugte Kontaktzeit: ${data.kontaktzeit}. Wir melden uns innerhalb von 24 Stunden.`,
      },
    ])
    toast.success('Eskalation erfolgreich. Ein Berater meldet sich bei Ihnen.')
  }

  // ── Followup erledigen ──────────────────────────────────────────────────────

  async function followupToggle(id: string, erledigt: boolean) {
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, erledigt } : f))
    )
    await fetch(`/api/ki-beratung/followups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erledigt }),
    })
  }

  // ── Keyboard handler ────────────────────────────────────────────────────────

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      senden()
    }
  }

  // ── Gefilterte Beratungen ───────────────────────────────────────────────────

  const gefilterteBeratungen = beratungen.filter(
    (b) => themenFilter === 'alle' || b.thema === themenFilter
  )

  // ── Aktive Followups dieser Beratung ────────────────────────────────────────

  const aktivFollowups = followups.filter(
    (f) => f.beratung_id === activeBeratung?.id && !f.erledigt
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[--background] rounded-xl border border-[--border] overflow-hidden shadow-sm">
      {/* ── Sidebar ── */}
      <div
        className={`flex flex-col border-r border-[--border] bg-[--muted]/40 transition-all duration-200 ${
          sidebarOffen ? 'w-72 min-w-[18rem]' : 'w-0 min-w-0 overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[--border]">
          <Button
            onClick={() => neueBeratung()}
            className="w-full gap-2"
            disabled={laden}
          >
            <Plus className="h-4 w-4" />
            Neue Beratung
          </Button>
        </div>

        {/* Themen-Filter */}
        <div className="px-3 py-2 border-b border-[--border]">
          <div className="flex flex-wrap gap-1">
            {THEMEN_FILTER.map((f) => (
              <button
                key={f.value}
                onClick={() => setThemenFilter(f.value)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  themenFilter === f.value
                    ? 'bg-[--primary] text-white border-[--primary]'
                    : 'bg-white border-[--border] text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Beratungs-Liste */}
        <div className="flex-1 overflow-y-auto">
          {gefilterteBeratungen.length === 0 ? (
            <div className="p-4 text-center text-sm text-[--muted-foreground]">
              Keine Beratungen vorhanden
            </div>
          ) : (
            gefilterteBeratungen.map((b) => (
              <button
                key={b.id}
                onClick={() => beratungLaden(b)}
                className={`w-full text-left px-3 py-3 border-b border-[--border] hover:bg-[--muted] transition-colors ${
                  activeBeratung?.id === b.id ? 'bg-[--muted] border-l-2 border-l-[--primary]' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <StatusDot status={b.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--foreground] truncate leading-tight">
                      {b.titel ?? 'Neue Beratung'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {b.thema && <ThemaBadge thema={b.thema} />}
                      <span className="text-xs text-[--muted-foreground]">
                        {formatDatum(b.letzte_nachricht_am)}
                      </span>
                    </div>
                  </div>
                  {b.nachrichten_count > 0 && (
                    <span className="flex-shrink-0 text-xs bg-[--primary]/10 text-[--primary] px-1.5 py-0.5 rounded-full font-medium">
                      {b.nachrichten_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Sidebar Toggle ── */}
      <button
        onClick={() => setSidebarOffen(!sidebarOffen)}
        className="flex-shrink-0 flex items-center justify-center w-5 bg-[--muted]/40 border-r border-[--border] hover:bg-[--muted] transition-colors"
        title={sidebarOffen ? 'Sidebar ausblenden' : 'Sidebar einblenden'}
      >
        {sidebarOffen ? (
          <ChevronLeft className="h-3.5 w-3.5 text-[--muted-foreground]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[--muted-foreground]" />
        )}
      </button>

      {/* ── Chat-Bereich ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeBeratung ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[--border] bg-white">
              {/* Titel (editierbar) */}
              {titelBearbeiten ? (
                <input
                  ref={titelInputRef}
                  value={titelDraft}
                  onChange={(e) => setTitelDraft(e.target.value)}
                  onBlur={titelSpeichern}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') titelSpeichern()
                    if (e.key === 'Escape') setTitelBearbeiten(false)
                  }}
                  className="flex-1 text-sm font-semibold border-b border-[--primary] outline-none bg-transparent text-[--foreground]"
                />
              ) : (
                <button
                  onClick={() => {
                    setTitelDraft(activeBeratung.titel ?? '')
                    setTitelBearbeiten(true)
                  }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[--foreground] hover:text-[--primary] transition-colors group"
                >
                  <span className="truncate max-w-[200px]">
                    {activeBeratung.titel ?? 'Neue Beratung'}
                  </span>
                  <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Thema-Auswahl */}
              <select
                value={activeBeratung.thema ?? ''}
                onChange={(e) => themaSpeichern(e.target.value as Thema)}
                className="text-xs border border-[--border] rounded-md px-2 py-1 bg-white text-[--muted-foreground] focus:outline-none focus:ring-1 focus:ring-[--ring]"
              >
                <option value="">Thema wählen…</option>
                {(Object.keys(THEMA_LABELS) as Thema[]).map((t) => (
                  <option key={t} value={t}>
                    {THEMA_LABELS[t]}
                  </option>
                ))}
              </select>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEskalationsModal(true)}
                  className="gap-1.5 text-xs h-7"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Eskalieren
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={archivieren}
                  className="gap-1.5 text-xs h-7 text-[--muted-foreground]"
                  title={activeBeratung.status === 'archiviert' ? 'Aktivieren' : 'Archivieren'}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {activeBeratung.status === 'archiviert' ? 'Aktivieren' : 'Archivieren'}
                </Button>
              </div>
            </div>

            {/* Nachrichten */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[--background]">
              {beratungsladenSpinner ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[--muted-foreground]" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}

                  {/* Aktive Tool-States */}
                  {activeToolStates.length > 0 && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--muted] text-[--primary] border border-[--border] flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        {activeToolStates.map((tool, i) => {
                          const Icon = TOOL_ICONS[tool] ?? Wrench
                          return (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <Icon className="h-3 w-3" />
                              {TOOL_LABELS[tool] ?? tool}…
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Typing Indicator */}
                  {laden && activeToolStates.length === 0 && messages.at(-1)?.streaming && messages.at(-1)?.inhalt === '' && (
                    <TypingIndicator />
                  )}

                  {/* Empfehlung-Bar */}
                  {empfehlungSichtbar && (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 text-sm text-orange-800">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Brauchen Sie persönliche Beratung?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEskalationsModal(true)}
                          className="text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          Pflegestützpunkt finden
                        </Button>
                        <button
                          onClick={() => setEmpfehlungSichtbar(false)}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Follow-up Panel */}
            {aktivFollowups.length > 0 && (
              <div className="border-t border-[--border] px-4 py-3 bg-[--muted]/40">
                <p className="text-xs font-semibold text-[--muted-foreground] mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Offene Aufgaben aus dieser Beratung
                </p>
                <div className="space-y-1.5">
                  {aktivFollowups.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => followupToggle(f.id, true)}
                        className="flex-shrink-0 text-[--muted-foreground] hover:text-green-600 transition-colors"
                      >
                        <Circle className="h-4 w-4" />
                      </button>
                      <span className="flex-1 text-[--foreground]">{f.aufgabe}</span>
                      <span className="text-xs text-[--muted-foreground]">
                        {formatDatumKurz(f.faellig_am)}
                      </span>
                      <a
                        href={`data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:${encodeURIComponent(f.aufgabe)}%0ADTSTART;VALUE=DATE:${f.faellig_am.replace(/-/g, '')}%0AEND:VEVENT%0AEND:VCALENDAR`}
                        download={`erinnerung-${f.id}.ics`}
                        className="text-xs text-[--primary] hover:underline flex items-center gap-0.5"
                        title="Zum Kalender hinzufügen"
                      >
                        <Calendar className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[--border] bg-white px-4 py-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={eingabe}
                    onChange={(e) => setEingabe(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Schreiben Sie Ihre Frage… (Enter = Senden, Shift+Enter = Neue Zeile)"
                    rows={1}
                    maxLength={5000}
                    disabled={laden || activeBeratung.status === 'archiviert'}
                    className="w-full border border-[--border] rounded-xl px-4 py-3 text-sm resize-none bg-[--background] text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] disabled:opacity-50 max-h-40 overflow-y-auto"
                    style={{ minHeight: '48px' }}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = 'auto'
                      t.style.height = `${Math.min(t.scrollHeight, 160)}px`
                    }}
                  />
                  {eingabe.length > 4000 && (
                    <span className="absolute bottom-1 right-2 text-xs text-orange-500">
                      {eingabe.length}/5000
                    </span>
                  )}
                </div>
                <Button
                  onClick={senden}
                  disabled={!eingabe.trim() || laden || activeBeratung.status === 'archiviert'}
                  size="icon"
                  className="h-12 w-12 rounded-xl flex-shrink-0"
                >
                  {laden ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {activeBeratung.status === 'archiviert' && (
                <p className="text-xs text-[--muted-foreground] mt-1.5 text-center">
                  Diese Beratung ist archiviert. Aktivieren Sie sie, um weiter zu schreiben.
                </p>
              )}
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[--primary]/10 flex items-center justify-center mb-6">
              <Bot className="h-8 w-8 text-[--primary]" />
            </div>
            <h2 className="text-xl font-bold text-[--foreground] mb-2">
              Ihr persönlicher Pflegeberater
            </h2>
            <p className="text-sm text-[--muted-foreground] mb-1 max-w-md">
              24/7 verfügbar · Zertifiziert nach §7a SGB XI · Deutsches Sozialrecht
            </p>
            <p className="text-xs text-[--muted-foreground] mb-8 max-w-sm">
              Starten Sie eine neue Beratung oder wählen Sie ein Thema aus den Schnelleinstiegen.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
              {QUICK_STARTS.map((qs) => {
                const Icon = THEMA_ICONS[qs.thema]
                return (
                  <button
                    key={qs.label}
                    onClick={() => neueBeratung(qs.thema, qs.nachricht)}
                    disabled={laden}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[--border] bg-white hover:border-[--primary] hover:bg-[--primary]/5 transition-colors text-left disabled:opacity-50"
                  >
                    <Icon className="h-5 w-5 text-[--primary]" />
                    <span className="text-xs font-medium text-[--foreground] text-center leading-tight">
                      {qs.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Eskalations-Modal */}
      {eskalationsModal && (
        <EskalationsModal
          onClose={() => setEskalationsModal(false)}
          onSubmit={eskalieren}
        />
      )}
    </div>
  )
}
