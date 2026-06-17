// ============================================================
// API: /api/ki-beratung/[id]/chat
// POST — KI-Pflegeberater Chat (SSE Streaming, Tool-Use)
// Auth: required
// Rate-Limit: 30 req/min
// ============================================================

import { NextRequest } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import {
  PFLEGEBERATER_SYSTEM_PROMPT,
  KI_TOOLS,
  PFLEGEGRAD_LEISTUNGEN,
  getDokumentVorlage,
  type DokumentTyp,
} from '@/lib/ki-beratung/system-prompt'
import { logger } from "@/lib/logger";

const ChatSchema = z.object({
  nachricht: z.string().min(1).max(5000),
})

// ── Tool-Handler ───────────────────────────────────────────────────────────────

async function handleSearchAnbieter(
  input: { plz: string; leistungsart?: string; radius_km?: number },
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { plz, leistungsart } = input
  try {
    let query = supabase
      .from('anbieter')
      .select('id, name, beschreibung, plz, ort, telefon, email, website, verifiziert')
      .eq('aktiv', true)
      .limit(6)

    // PLZ-Präfix-Suche (gleiche PLZ zuerst, dann 2-stellig gleich)
    if (plz) {
      query = query.or(`plz.eq.${plz},plz.like.${plz.slice(0, 2)}%`)
    }

    if (leistungsart) {
      // Join über leistungen
      const { data: providerIds } = await supabase
        .from('leistungen')
        .select('anbieter_id')
        .ilike('kategorie', `%${leistungsart}%`)
        .limit(50)

      if (providerIds && providerIds.length > 0) {
        const ids = providerIds.map((r) => r.anbieter_id).filter(Boolean)
        if (ids.length > 0) {
          query = query.in('id', ids as string[])
        }
      }
    }

    const { data, error } = await query

    if (error || !data) {
      return { anbieter: [], hinweis: 'Anbieter-Suche momentan nicht verfügbar.' }
    }

    return {
      anbieter: data.map((a) => ({
        name: a.name,
        ort: a.ort,
        plz: a.plz,
        telefon: a.telefon,
        email: a.email,
        website: a.website,
        verifiziert: a.verifiziert,
      })),
      anzahl: data.length,
      hinweis:
        data.length === 0
          ? 'Keine Anbieter in dieser PLZ gefunden. Bitte versuchen Sie eine benachbarte PLZ.'
          : undefined,
    }
  } catch {
    return { anbieter: [], hinweis: 'Anbieter-Suche nicht verfügbar.' }
  }
}

function handleCheckAnsprueche(input: { pflegegrad: number; wohnsituation?: 'zuhause' | 'heim' }) {
  const { pflegegrad, wohnsituation = 'zuhause' } = input
  const leistungen = PFLEGEGRAD_LEISTUNGEN.find((l) => l.pflegegrad === pflegegrad)

  if (!leistungen) {
    return { fehler: `Ungültiger Pflegegrad: ${pflegegrad}. Gültige Werte: 1–5.` }
  }

  const basis = [
    {
      leistung: 'Entlastungsbetrag (§ 45b SGB XI)',
      betrag_monatlich_eur: leistungen.entlastungsbetrag_eur,
      hinweis: 'Zweckgebunden für anerkannte Entlastungsleistungen',
    },
    {
      leistung: 'Pflegehilfsmittel zum Verbrauch (§ 40 SGB XI)',
      betrag_monatlich_eur: leistungen.pflegehilfsmittel_eur,
      hinweis: 'z.B. Einmalhandschuhe, Bettschutzeinlagen',
    },
  ]

  if (wohnsituation === 'zuhause') {
    return {
      pflegegrad,
      wohnsituation,
      leistungen: [
        ...(leistungen.pflegegeld_eur > 0
          ? [
              {
                leistung: 'Pflegegeld (§ 37 SGB XI)',
                betrag_monatlich_eur: leistungen.pflegegeld_eur,
                hinweis: 'Bei Versorgung durch private Pflegeperson',
              },
            ]
          : []),
        ...(leistungen.sachleistung_eur > 0
          ? [
              {
                leistung: 'Pflegesachleistung (§ 36 SGB XI)',
                betrag_monatlich_eur: leistungen.sachleistung_eur,
                hinweis: 'Für zugelassene ambulante Pflegedienste',
              },
            ]
          : []),
        ...(leistungen.tagespflege_eur > 0
          ? [
              {
                leistung: 'Tagespflege (§ 41 SGB XI)',
                betrag_monatlich_eur: leistungen.tagespflege_eur,
                hinweis: 'Für Tagespflegeeinrichtungen',
              },
            ]
          : []),
        ...basis,
      ],
      jaehrlich: {
        kurzzeitpflege: leistungen.kurzzeitpflege_eur,
        verhinderungspflege: leistungen.verhinderungspflege_eur,
      },
      hinweis: 'Pflegegeld und Sachleistung können anteilig kombiniert werden (§ 38 SGB XI).',
      rechtsstand: '2025',
    }
  }

  // Heim
  return {
    pflegegrad,
    wohnsituation,
    leistungen: [
      {
        leistung: 'Pflegeleistung stationär (§ 43 SGB XI)',
        betrag_monatlich_eur: leistungen.sachleistung_eur,
        hinweis: 'Wird direkt an das Pflegeheim ausgezahlt',
      },
      ...basis,
    ],
    hinweis:
      'Der Eigenanteil im Heim ist einrichtungsabhängig. Seit 2022 sinkt der Eigenanteil mit zunehmender Heimdauer (Leistungszuschlag nach § 43c SGB XI).',
    rechtsstand: '2025',
  }
}

function handleBerechneKosten(input: {
  pflegegrad: number
  leistungsart: 'ambulant' | 'stationaer' | 'tagespflege' | 'kurzzeitpflege'
  monatliche_kosten_eur?: number
}) {
  const { pflegegrad, leistungsart, monatliche_kosten_eur } = input
  const leistungen = PFLEGEGRAD_LEISTUNGEN.find((l) => l.pflegegrad === pflegegrad)
  if (!leistungen) return { fehler: 'Ungültiger Pflegegrad' }

  let kassenleistung = 0
  switch (leistungsart) {
    case 'ambulant':
      kassenleistung = leistungen.sachleistung_eur
      break
    case 'stationaer':
      kassenleistung = leistungen.sachleistung_eur
      break
    case 'tagespflege':
      kassenleistung = leistungen.tagespflege_eur
      break
    case 'kurzzeitpflege':
      kassenleistung = leistungen.kurzzeitpflege_eur
      break
  }

  const gesamtkosten = monatliche_kosten_eur ?? 0
  const eigenanteil = Math.max(0, gesamtkosten - kassenleistung)
  const steuerersparnis = Math.min(eigenanteil * 0.2, 4000 / 12) // § 35a EStG max. 4.000 €/Jahr

  return {
    kassenleistung_monatlich_eur: kassenleistung,
    eigenanteil_monatlich_eur: gesamtkosten > 0 ? eigenanteil : null,
    steuerersparnis_monatlich_eur: gesamtkosten > 0 ? Math.round(steuerersparnis) : null,
    hinweis:
      'Steuerersparnis nach § 35a EStG (20 % der Kosten, max. 4.000 €/Jahr). Tatsächliche Erstattung von einem Steuerberater prüfen lassen.',
    pflegegrad,
    leistungsart,
  }
}

function handleGenerateDocument(input: { typ: string; personendaten?: Record<string, unknown> }) {
  const gueltigeTypen = ['pflegegeld_antrag', 'widerspruch', 'vollmacht', 'freistellung']
  if (!gueltigeTypen.includes(input.typ)) {
    return { fehler: `Ungültiger Dokumenttyp: ${input.typ}` }
  }
  return getDokumentVorlage(input.typ as DokumentTyp, input.personendaten)
}

async function handleScheduleFollowup(
  input: { aufgabe: string; faellig_am: string },
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  beratungId: string
) {
  const { error } = await supabase.from('ki_beratung_followups').insert({
    user_id: userId,
    beratung_id: beratungId,
    aufgabe: input.aufgabe,
    faellig_am: input.faellig_am,
    erledigt: false,
  })

  if (error) {
    return { erfolg: false, fehler: 'Erinnerung konnte nicht gespeichert werden.' }
  }

  return {
    erfolg: true,
    nachricht: `Erinnerung angelegt: "${input.aufgabe}" am ${input.faellig_am}`,
  }
}

// ── Hauptroute ────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: beratungId } = await params

  // Rate-Limit
  const rl = await rateLimit(request, { limit: 30, window: 60 })
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: 'Zu viele Anfragen. Bitte einen Moment warten.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Beratung prüfen (Ownership)
  const { data: beratung, error: beratungError } = await supabase
    .from('ki_beratungen')
    .select('id, status, nachrichten_count, titel')
    .eq('id', beratungId)
    .eq('user_id', user.id)
    .single()

  if (beratungError || !beratung) {
    return new Response(JSON.stringify({ error: 'Beratung nicht gefunden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Input validieren
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiges JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { nachricht } = parsed.data

  // Letzte 20 Nachrichten laden
  const { data: history } = await supabase
    .from('ki_beratung_nachrichten')
    .select('rolle, inhalt')
    .eq('beratung_id', beratungId)
    .in('rolle', ['user', 'assistant'])
    .order('erstellt_am', { ascending: true })
    .limit(20)

  // Nachrichtenverlauf aufbauen
  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({
      role: m.rolle as 'user' | 'assistant',
      content: m.inhalt,
    })),
    { role: 'user' as const, content: nachricht },
  ]

  // User-Nachricht sofort speichern
  await supabase.from('ki_beratung_nachrichten').insert({
    beratung_id: beratungId,
    rolle: 'user',
    inhalt: nachricht,
  })

  // Titel auto-generieren aus erster Nachricht (wenn noch keiner gesetzt)
  if (!beratung.titel && beratung.nachrichten_count === 0) {
    const autoTitel = nachricht.slice(0, 80) + (nachricht.length > 80 ? '…' : '')
    await supabase
      .from('ki_beratungen')
      .update({ titel: autoTitel })
      .eq('id', beratungId)
  }

  // ── SSE Stream ─────────────────────────────────────────────────────────────
  const encoder = new TextEncoder()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        let currentMessages = messages
        const allToolAufrufe: Array<{ name: string; input: unknown; output: unknown }> = []
        let dokumentGeneriert: { typ: string; titel: string; inhalt: string } | null = null
        let assistantText = ''
        let totalTokens = 0

        // Agentic loop (max 5 tool-use rounds)
        for (let round = 0; round < 5; round++) {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: PFLEGEBERATER_SYSTEM_PROMPT,
            tools: KI_TOOLS as Anthropic.Tool[],
            messages: currentMessages,
          })

          totalTokens += response.usage?.input_tokens ?? 0
          totalTokens += response.usage?.output_tokens ?? 0

          if (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of toolUseBlocks) {
              send({ type: 'tool_start', tool: block.name })

              let result: unknown
              try {
                if (block.name === 'search_anbieter') {
                  result = await handleSearchAnbieter(
                    block.input as { plz: string; leistungsart?: string; radius_km?: number },
                    supabase
                  )
                } else if (block.name === 'check_ansprueche') {
                  result = handleCheckAnsprueche(
                    block.input as { pflegegrad: number; wohnsituation?: 'zuhause' | 'heim' }
                  )
                } else if (block.name === 'generate_document') {
                  result = handleGenerateDocument(
                    block.input as { typ: string; personendaten?: Record<string, unknown> }
                  )
                  if (result && typeof result === 'object' && 'titel' in result && 'inhalt' in result) {
                    const typedResult = result as { titel: string; inhalt: string }
                    dokumentGeneriert = {
                      typ: (block.input as { typ: string }).typ,
                      titel: typedResult.titel,
                      inhalt: typedResult.inhalt,
                    }
                  }
                } else if (block.name === 'berechne_kosten') {
                  result = handleBerechneKosten(
                    block.input as {
                      pflegegrad: number
                      leistungsart: 'ambulant' | 'stationaer' | 'tagespflege' | 'kurzzeitpflege'
                      monatliche_kosten_eur?: number
                    }
                  )
                } else if (block.name === 'schedule_followup') {
                  result = await handleScheduleFollowup(
                    block.input as { aufgabe: string; faellig_am: string },
                    supabase,
                    user.id,
                    beratungId
                  )
                } else {
                  result = { fehler: `Unbekanntes Tool: ${block.name}` }
                }
              } catch {
                result = { fehler: 'Tool-Ausführung fehlgeschlagen' }
              }

              allToolAufrufe.push({ name: block.name, input: block.input, output: result })
              send({ type: 'tool_end', tool: block.name, result })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              })
            }

            // Messages für nächsten Loop erweitern
            currentMessages = [
              ...currentMessages,
              { role: 'assistant' as const, content: response.content },
              { role: 'user' as const, content: toolResults },
            ]
            continue
          }

          // stop_reason === 'end_turn' — Text extrahieren und streamen
          for (const block of response.content) {
            if (block.type === 'text') {
              assistantText += block.text

              // Text in Chunks streamen (alle ~20 Zeichen ein Chunk)
              const words = block.text.split(' ')
              let chunk = ''
              for (const word of words) {
                chunk += (chunk ? ' ' : '') + word
                if (chunk.length >= 20) {
                  send({ type: 'text', content: chunk })
                  chunk = ''
                  await new Promise((r) => setTimeout(r, 15))
                }
              }
              if (chunk) {
                send({ type: 'text', content: (chunk.length > 0 && assistantText.length > chunk.length ? ' ' : '') + chunk })
              }
            }
          }
          break
        }

        // Assistent-Antwort in DB speichern
        if (assistantText) {
          await supabase.from('ki_beratung_nachrichten').insert({
            beratung_id: beratungId,
            rolle: 'assistant',
            inhalt: assistantText,
            tool_aufrufe: allToolAufrufe.length > 0 ? allToolAufrufe : null,
            dokument_generiert: dokumentGeneriert,
            token_count: totalTokens,
          })

          // nachrichten_count + letzte_nachricht_am aktualisieren
          await supabase
            .from('ki_beratungen')
            .update({
              nachrichten_count: (beratung.nachrichten_count ?? 0) + 2,
              letzte_nachricht_am: new Date().toISOString(),
            })
            .eq('id', beratungId)
        }

        // Abschluss-Event
        send({
          type: 'done',
          tool_aufrufe: allToolAufrufe,
          dokument_generiert: dokumentGeneriert,
        })
      } catch (err) {
        logger.error('[ki-beratung chat]', { error: err })
        send({ type: 'error', message: 'KI-Dienst vorübergehend nicht verfügbar.' })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── PATCH: Beratung aktualisieren (Titel, Thema, Status) ──────────────────────

const PatchSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  thema: z
    .enum(['pflegegrad', 'ansprueche', 'anbieter', 'kosten', 'rechtliches', 'medizinisch', 'organisation', 'dokumente', 'sonstiges'])
    .optional(),
  status: z.enum(['aktiv', 'archiviert', 'eskaliert']).optional(),
  eskaliert_an: z.string().email().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: beratungId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiges JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase
    .from('ki_beratungen')
    .update(parsed.data)
    .eq('id', beratungId)
    .eq('user_id', user.id)
    .select('id, titel, thema, status, nachrichten_count, letzte_nachricht_am, erstellt_am')
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: 'Aktualisierung fehlgeschlagen' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ beratung: data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
