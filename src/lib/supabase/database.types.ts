export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anbieter: {
        Row: {
          abwesend: boolean
          abwesend_bis: string | null
          abwesend_notiz: string | null
          aktiv: boolean
          beschreibung: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          geo: unknown
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          oeffnungszeiten: Json | null
          ort: string | null
          plan: string
          plan_expires_at: string | null
          plz: string | null
          profile_id: string
          search_vector: unknown
          social_media: Json | null
          strasse: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telefon: string | null
          traeger: string | null
          updated_at: string
          verfuegbarkeit: string | null
          verifiziert: boolean
          views_total: number
          website: string | null
          zertifiziert: boolean
        }
        Insert: {
          abwesend?: boolean
          abwesend_bis?: string | null
          abwesend_notiz?: string | null
          aktiv?: boolean
          beschreibung?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          geo?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          oeffnungszeiten?: Json | null
          ort?: string | null
          plan?: string
          plan_expires_at?: string | null
          plz?: string | null
          profile_id: string
          search_vector?: unknown
          social_media?: Json | null
          strasse?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefon?: string | null
          traeger?: string | null
          updated_at?: string
          verfuegbarkeit?: string | null
          verifiziert?: boolean
          views_total?: number
          website?: string | null
          zertifiziert?: boolean
        }
        Update: {
          abwesend?: boolean
          abwesend_bis?: string | null
          abwesend_notiz?: string | null
          aktiv?: boolean
          beschreibung?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          geo?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          oeffnungszeiten?: Json | null
          ort?: string | null
          plan?: string
          plan_expires_at?: string | null
          plz?: string | null
          profile_id?: string
          search_vector?: unknown
          social_media?: Json | null
          strasse?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefon?: string | null
          traeger?: string | null
          updated_at?: string
          verfuegbarkeit?: string | null
          verifiziert?: boolean
          views_total?: number
          website?: string | null
          zertifiziert?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anbieter_dokumente: {
        Row: {
          anbieter_id: string
          created_at: string
          id: string
          name: string
          oeffentlich: boolean
          path: string
          size: number
          typ: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          id?: string
          name: string
          oeffentlich?: boolean
          path: string
          size?: number
          typ?: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          id?: string
          name?: string
          oeffentlich?: boolean
          path?: string
          size?: number
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_dokumente_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_dokumente_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_dokumente_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      anbieter_galerie: {
        Row: {
          alt_text: string | null
          anbieter_id: string
          created_at: string
          id: string
          position: number
          storage_pfad: string
        }
        Insert: {
          alt_text?: string | null
          anbieter_id: string
          created_at?: string
          id?: string
          position?: number
          storage_pfad: string
        }
        Update: {
          alt_text?: string | null
          anbieter_id?: string
          created_at?: string
          id?: string
          position?: number
          storage_pfad?: string
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_galerie_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_galerie_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_galerie_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      anbieter_mitglieder: {
        Row: {
          anbieter_id: string
          created_at: string
          id: string
          profile_id: string
          rolle: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          id?: string
          profile_id: string
          rolle?: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          rolle?: string
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_mitglieder_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_mitglieder_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_mitglieder_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_mitglieder_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anbieter_profil_aufrufe: {
        Row: {
          anbieter_id: string
          created_at: string
          id: string
          referrer: string | null
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          id?: string
          referrer?: string | null
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          id?: string
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_profil_aufrufe_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_profil_aufrufe_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_profil_aufrufe_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      anbieter_team: {
        Row: {
          anbieter_id: string
          created_at: string
          id: string
          profile_id: string
          rolle: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          id?: string
          profile_id: string
          rolle?: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          rolle?: string
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_team_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_team_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_team_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anbieter_zuletzt_angesehen: {
        Row: {
          anbieter_id: string
          familie_id: string
          gesehen_am: string
          id: string
        }
        Insert: {
          anbieter_id: string
          familie_id: string
          gesehen_am?: string
          id?: string
        }
        Update: {
          anbieter_id?: string
          familie_id?: string
          gesehen_am?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anbieter_zuletzt_angesehen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anbieter_zuletzt_angesehen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_zuletzt_angesehen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anbieter_zuletzt_angesehen_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anfrage_dokumente: {
        Row: {
          anfrage_id: string
          created_at: string
          dateiname: string
          familie_id: string
          groesse_bytes: number
          id: string
          mime_typ: string
          storage_pfad: string
        }
        Insert: {
          anfrage_id: string
          created_at?: string
          dateiname: string
          familie_id: string
          groesse_bytes?: number
          id?: string
          mime_typ?: string
          storage_pfad: string
        }
        Update: {
          anfrage_id?: string
          created_at?: string
          dateiname?: string
          familie_id?: string
          groesse_bytes?: number
          id?: string
          mime_typ?: string
          storage_pfad?: string
        }
        Relationships: [
          {
            foreignKeyName: "anfrage_dokumente_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfrage_dokumente_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anfrage_notizen: {
        Row: {
          anbieter_id: string
          anfrage_id: string
          created_at: string
          id: string
          inhalt: string
          tag: string | null
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          anfrage_id: string
          created_at?: string
          id?: string
          inhalt: string
          tag?: string | null
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          anfrage_id?: string
          created_at?: string
          id?: string
          inhalt?: string
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anfrage_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfrage_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anfrage_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anfrage_notizen_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
        ]
      }
      anfragen: {
        Row: {
          anbieter_id: string | null
          beschreibung: string
          created_at: string
          crm_tags: string[]
          familie_id: string
          id: string
          ki_empfehlung: string | null
          lebenslage: string
          leistung_id: string | null
          status: string
          updated_at: string
          wichtig: boolean
        }
        Insert: {
          anbieter_id?: string | null
          beschreibung: string
          created_at?: string
          crm_tags?: string[]
          familie_id: string
          id?: string
          ki_empfehlung?: string | null
          lebenslage: string
          leistung_id?: string | null
          status?: string
          updated_at?: string
          wichtig?: boolean
        }
        Update: {
          anbieter_id?: string | null
          beschreibung?: string
          created_at?: string
          crm_tags?: string[]
          familie_id?: string
          id?: string
          ki_empfehlung?: string | null
          lebenslage?: string
          leistung_id?: string | null
          status?: string
          updated_at?: string
          wichtig?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "anfragen_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_leistung_id_fkey"
            columns: ["leistung_id"]
            isOneToOne: false
            referencedRelation: "leistungen"
            referencedColumns: ["id"]
          },
        ]
      }
      anfragen_historie: {
        Row: {
          alter_status: string | null
          anfrage_id: string
          created_at: string
          geaendert_von: string | null
          id: string
          neuer_status: string
          notiz: string | null
        }
        Insert: {
          alter_status?: string | null
          anfrage_id: string
          created_at?: string
          geaendert_von?: string | null
          id?: string
          neuer_status: string
          notiz?: string | null
        }
        Update: {
          alter_status?: string | null
          anfrage_id?: string
          created_at?: string
          geaendert_von?: string | null
          id?: string
          neuer_status?: string
          notiz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anfragen_historie_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_historie_geaendert_von_fkey"
            columns: ["geaendert_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anfragen_statusverlauf: {
        Row: {
          alter_status: string | null
          anfrage_id: string
          created_at: string
          geaendert_von: string | null
          id: string
          kommentar: string | null
          neuer_status: string
        }
        Insert: {
          alter_status?: string | null
          anfrage_id: string
          created_at?: string
          geaendert_von?: string | null
          id?: string
          kommentar?: string | null
          neuer_status: string
        }
        Update: {
          alter_status?: string | null
          anfrage_id?: string
          created_at?: string
          geaendert_von?: string | null
          id?: string
          kommentar?: string | null
          neuer_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "anfragen_statusverlauf_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_statusverlauf_geaendert_von_fkey"
            columns: ["geaendert_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anspruchs_profile: {
        Row: {
          bezeichnung: string | null
          created_at: string
          ergebnis: Json
          gesamt_jaehrlich_eur: number | null
          gesamt_monatlich_eur: number | null
          id: string
          lebenslage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bezeichnung?: string | null
          created_at?: string
          ergebnis: Json
          gesamt_jaehrlich_eur?: number | null
          gesamt_monatlich_eur?: number | null
          id?: string
          lebenslage: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bezeichnung?: string | null
          created_at?: string
          ergebnis?: Json
          gesamt_jaehrlich_eur?: number | null
          gesamt_monatlich_eur?: number | null
          id?: string
          lebenslage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      avv_partner: {
        Row: {
          avv_unterzeichnet: boolean
          created_at: string
          dienst: string
          id: string
          naechste_pruefung: string | null
          name: string
          notizen: string | null
          unterzeichnet_am: string | null
          updated_at: string
        }
        Insert: {
          avv_unterzeichnet?: boolean
          created_at?: string
          dienst: string
          id?: string
          naechste_pruefung?: string | null
          name: string
          notizen?: string | null
          unterzeichnet_am?: string | null
          updated_at?: string
        }
        Update: {
          avv_unterzeichnet?: boolean
          created_at?: string
          dienst?: string
          id?: string
          naechste_pruefung?: string | null
          name?: string
          notizen?: string | null
          unterzeichnet_am?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      benachrichtigungen: {
        Row: {
          created_at: string
          gelesen: boolean
          id: string
          link: string | null
          nachricht: string
          profile_id: string
          titel: string
          typ: string
        }
        Insert: {
          created_at?: string
          gelesen?: boolean
          id?: string
          link?: string | null
          nachricht: string
          profile_id: string
          titel: string
          typ: string
        }
        Update: {
          created_at?: string
          gelesen?: boolean
          id?: string
          link?: string | null
          nachricht?: string
          profile_id?: string
          titel?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "benachrichtigungen_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beschwerden: {
        Row: {
          anbieter_id: string
          beschreibung: string
          created_at: string
          eingegangen_am: string
          ergebnis: string | null
          erstellt_von: string | null
          familie_profile_id: string | null
          frist_am: string
          geloest_am: string | null
          id: string
          kategorie: string
          massnahmen: string | null
          schweregrad: string
          status: string
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          beschreibung: string
          created_at?: string
          eingegangen_am?: string
          ergebnis?: string | null
          erstellt_von?: string | null
          familie_profile_id?: string | null
          frist_am?: string
          geloest_am?: string | null
          id?: string
          kategorie: string
          massnahmen?: string | null
          schweregrad?: string
          status?: string
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          beschreibung?: string
          created_at?: string
          eingegangen_am?: string
          ergebnis?: string | null
          erstellt_von?: string | null
          familie_profile_id?: string | null
          frist_am?: string
          geloest_am?: string | null
          id?: string
          kategorie?: string
          massnahmen?: string | null
          schweregrad?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beschwerden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschwerden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "beschwerden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "beschwerden_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschwerden_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bewertungen: {
        Row: {
          anbieter_id: string
          anfrage_id: string | null
          antwort: string | null
          antwort_at: string | null
          created_at: string
          familie_id: string
          gemeldet: boolean
          id: string
          kommentar: string | null
          sterne: number
        }
        Insert: {
          anbieter_id: string
          anfrage_id?: string | null
          antwort?: string | null
          antwort_at?: string | null
          created_at?: string
          familie_id: string
          gemeldet?: boolean
          id?: string
          kommentar?: string | null
          sterne: number
        }
        Update: {
          anbieter_id?: string
          anfrage_id?: string | null
          antwort?: string | null
          antwort_at?: string | null
          created_at?: string
          familie_id?: string
          gemeldet?: boolean
          id?: string
          kommentar?: string | null
          sterne?: number
        }
        Relationships: [
          {
            foreignKeyName: "bewertungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bewertungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "bewertungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "bewertungen_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bewertungen_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_transaktionen: {
        Row: {
          beleg_url: string | null
          beschreibung: string | null
          betrag: number
          budget_id: string
          created_at: string
          datum: string
          id: string
        }
        Insert: {
          beleg_url?: string | null
          beschreibung?: string | null
          betrag: number
          budget_id: string
          created_at?: string
          datum?: string
          id?: string
        }
        Update: {
          beleg_url?: string | null
          beschreibung?: string | null
          betrag?: number
          budget_id?: string
          created_at?: string
          datum?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transaktionen_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "pflegekassen_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      care_worker_anfragen: {
        Row: {
          anbieter_id: string
          care_worker_id: string
          created_at: string
          familie_id: string | null
          id: string
          nachricht: string | null
          start_datum: string | null
          status: string
          stunden_pro_woche: number | null
        }
        Insert: {
          anbieter_id: string
          care_worker_id: string
          created_at?: string
          familie_id?: string | null
          id?: string
          nachricht?: string | null
          start_datum?: string | null
          status?: string
          stunden_pro_woche?: number | null
        }
        Update: {
          anbieter_id?: string
          care_worker_id?: string
          created_at?: string
          familie_id?: string | null
          id?: string
          nachricht?: string | null
          start_datum?: string | null
          status?: string
          stunden_pro_woche?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "care_worker_anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_worker_anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_anfragen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_anfragen_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_worker_anfragen_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_worker_zertifikate: {
        Row: {
          anbieter_id: string
          ausgestellt_am: string | null
          ausstellende_stelle: string | null
          bezeichnung: string
          care_worker_id: string
          created_at: string
          dokument_url: string | null
          gueltig_bis: string | null
          id: string
          typ: string
          zertifikat_nr: string | null
        }
        Insert: {
          anbieter_id: string
          ausgestellt_am?: string | null
          ausstellende_stelle?: string | null
          bezeichnung: string
          care_worker_id: string
          created_at?: string
          dokument_url?: string | null
          gueltig_bis?: string | null
          id?: string
          typ?: string
          zertifikat_nr?: string | null
        }
        Update: {
          anbieter_id?: string
          ausgestellt_am?: string | null
          ausstellende_stelle?: string | null
          bezeichnung?: string
          care_worker_id?: string
          created_at?: string
          dokument_url?: string | null
          gueltig_bis?: string | null
          id?: string
          typ?: string
          zertifikat_nr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      care_workers: {
        Row: {
          abwesend_bis: string | null
          aktiv: boolean
          anbieter_id: string
          berufserfahrung_jahre: number | null
          bio: string | null
          created_at: string
          fuehrungszeugnis_datum: string | null
          fuehrungszeugnis_vorhanden: boolean
          geburtsjahr: number | null
          id: string
          max_stunden_woche: number | null
          nachname: string
          ort: string | null
          plz: string | null
          qualifikationen: string[] | null
          sprachen: string[] | null
          standort: unknown
          stundensatz_ct: number
          updated_at: string
          verfuegbar_ab: string | null
          vorname: string
          zertifikate: string[] | null
        }
        Insert: {
          abwesend_bis?: string | null
          aktiv?: boolean
          anbieter_id: string
          berufserfahrung_jahre?: number | null
          bio?: string | null
          created_at?: string
          fuehrungszeugnis_datum?: string | null
          fuehrungszeugnis_vorhanden?: boolean
          geburtsjahr?: number | null
          id?: string
          max_stunden_woche?: number | null
          nachname: string
          ort?: string | null
          plz?: string | null
          qualifikationen?: string[] | null
          sprachen?: string[] | null
          standort?: unknown
          stundensatz_ct?: number
          updated_at?: string
          verfuegbar_ab?: string | null
          vorname: string
          zertifikate?: string[] | null
        }
        Update: {
          abwesend_bis?: string | null
          aktiv?: boolean
          anbieter_id?: string
          berufserfahrung_jahre?: number | null
          bio?: string | null
          created_at?: string
          fuehrungszeugnis_datum?: string | null
          fuehrungszeugnis_vorhanden?: boolean
          geburtsjahr?: number | null
          id?: string
          max_stunden_woche?: number | null
          nachname?: string
          ort?: string | null
          plz?: string | null
          qualifikationen?: string[] | null
          sprachen?: string[] | null
          standort?: unknown
          stundensatz_ct?: number
          updated_at?: string
          verfuegbar_ab?: string | null
          vorname?: string
          zertifikate?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "care_workers_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_workers_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_workers_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          anbieter_id: string
          bereich: string
          created_at: string
          erfuellt: boolean | null
          erstellt_von: string | null
          faellig_am: string | null
          id: string
          kriterium: string
          letzte_pruefung: string | null
          nachweis: string | null
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          bereich: string
          created_at?: string
          erfuellt?: boolean | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          kriterium: string
          letzte_pruefung?: string | null
          nachweis?: string | null
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          bereich?: string
          created_at?: string
          erfuellt?: boolean | null
          erstellt_von?: string | null
          faellig_am?: string | null
          id?: string
          kriterium?: string
          letzte_pruefung?: string | null
          nachweis?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "compliance_checks_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "compliance_checks_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosen: {
        Row: {
          arzt: string | null
          bezeichnung: string
          chronisch: boolean | null
          created_at: string | null
          erstdiagnose: string | null
          icd10_code: string | null
          id: string
          notizen: string | null
          profil_id: string
        }
        Insert: {
          arzt?: string | null
          bezeichnung: string
          chronisch?: boolean | null
          created_at?: string | null
          erstdiagnose?: string | null
          icd10_code?: string | null
          id?: string
          notizen?: string | null
          profil_id: string
        }
        Update: {
          arzt?: string | null
          bezeichnung?: string
          chronisch?: boolean | null
          created_at?: string | null
          erstdiagnose?: string | null
          icd10_code?: string | null
          id?: string
          notizen?: string | null
          profil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosen_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dokumente: {
        Row: {
          ablaufdatum: string | null
          created_at: string | null
          geteilt_mit: string[] | null
          groesse_bytes: number | null
          haushalt_id: string | null
          id: string
          kategorie: string
          mime_type: string | null
          name: string
          notizen: string | null
          ocr_text: string | null
          profil_id: string
          storage_path: string
          updated_at: string | null
          verschluesselt: boolean | null
        }
        Insert: {
          ablaufdatum?: string | null
          created_at?: string | null
          geteilt_mit?: string[] | null
          groesse_bytes?: number | null
          haushalt_id?: string | null
          id?: string
          kategorie: string
          mime_type?: string | null
          name: string
          notizen?: string | null
          ocr_text?: string | null
          profil_id: string
          storage_path: string
          updated_at?: string | null
          verschluesselt?: boolean | null
        }
        Update: {
          ablaufdatum?: string | null
          created_at?: string | null
          geteilt_mit?: string[] | null
          groesse_bytes?: number | null
          haushalt_id?: string | null
          id?: string
          kategorie?: string
          mime_type?: string | null
          name?: string
          notizen?: string | null
          ocr_text?: string | null
          profil_id?: string
          storage_path?: string
          updated_at?: string | null
          verschluesselt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dokumente_haushalt_id_fkey"
            columns: ["haushalt_id"]
            isOneToOne: false
            referencedRelation: "haushalte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumente_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dsgvo_loeschanfragen: {
        Row: {
          angefragt_am: string
          email: string
          erledigt_am: string | null
          id: string
          notizen: string | null
          profil_id: string | null
          status: string
        }
        Insert: {
          angefragt_am?: string
          email: string
          erledigt_am?: string | null
          id?: string
          notizen?: string | null
          profil_id?: string | null
          status?: string
        }
        Update: {
          angefragt_am?: string
          email?: string
          erledigt_am?: string | null
          id?: string
          notizen?: string | null
          profil_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsgvo_loeschanfragen_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      familie_anbieter_notizen: {
        Row: {
          anbieter_id: string
          created_at: string
          familie_id: string
          id: string
          notiz: string
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          familie_id: string
          id?: string
          notiz: string
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          familie_id?: string
          id?: string
          notiz?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "familie_anbieter_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "familie_anbieter_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "familie_anbieter_notizen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "familie_anbieter_notizen_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      familie_pinnwand: {
        Row: {
          created_at: string
          erledigt: boolean | null
          erledigt_am: string | null
          erstellt_von: string | null
          erstellt_von_rolle: string | null
          familie_profile_id: string
          id: string
          inhalt: string
          pinned: boolean | null
          typ: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          erledigt?: boolean | null
          erledigt_am?: string | null
          erstellt_von?: string | null
          erstellt_von_rolle?: string | null
          familie_profile_id: string
          id?: string
          inhalt: string
          pinned?: boolean | null
          typ?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          erledigt?: boolean | null
          erledigt_am?: string | null
          erstellt_von?: string | null
          erstellt_von_rolle?: string | null
          familie_profile_id?: string
          id?: string
          inhalt?: string
          pinned?: boolean | null
          typ?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "familie_pinnwand_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "familie_pinnwand_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favoriten: {
        Row: {
          anbieter_id: string
          created_at: string
          familie_id: string
          id: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          familie_id: string
          id?: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          familie_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoriten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoriten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "favoriten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "favoriten_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gespeicherte_suchen: {
        Row: {
          created_at: string
          id: string
          lebenslage: string | null
          name: string
          plz: string | null
          profile_id: string
          radius_km: number | null
          suchtext: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lebenslage?: string | null
          name: string
          plz?: string | null
          profile_id: string
          radius_km?: number | null
          suchtext?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lebenslage?: string | null
          name?: string
          plz?: string | null
          profile_id?: string
          radius_km?: number | null
          suchtext?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gespeicherte_suchen_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      haushalte: {
        Row: {
          created_at: string | null
          erstellt_von: string | null
          id: string
          name: string
          ort: string | null
          plz: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          name: string
          ort?: string | null
          plz?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          name?: string
          ort?: string | null
          plz?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haushalte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      haushaltsmitglieder: {
        Row: {
          created_at: string | null
          gdb: number | null
          geburtsdatum: string | null
          haushalt_id: string
          id: string
          kann_anfragen_sehen: boolean | null
          kann_dokumente_sehen: boolean | null
          kann_verwalten: boolean | null
          nachname: string | null
          pflegegrad: number | null
          profile_id: string | null
          rolle: Database["public"]["Enums"]["haushalt_rolle"]
          updated_at: string | null
          vorname: string | null
        }
        Insert: {
          created_at?: string | null
          gdb?: number | null
          geburtsdatum?: string | null
          haushalt_id: string
          id?: string
          kann_anfragen_sehen?: boolean | null
          kann_dokumente_sehen?: boolean | null
          kann_verwalten?: boolean | null
          nachname?: string | null
          pflegegrad?: number | null
          profile_id?: string | null
          rolle: Database["public"]["Enums"]["haushalt_rolle"]
          updated_at?: string | null
          vorname?: string | null
        }
        Update: {
          created_at?: string | null
          gdb?: number | null
          geburtsdatum?: string | null
          haushalt_id?: string
          id?: string
          kann_anfragen_sehen?: boolean | null
          kann_dokumente_sehen?: boolean | null
          kann_verwalten?: boolean | null
          nachname?: string | null
          pflegegrad?: number | null
          profile_id?: string | null
          rolle?: Database["public"]["Enums"]["haushalt_rolle"]
          updated_at?: string | null
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haushaltsmitglieder_haushalt_id_fkey"
            columns: ["haushalt_id"]
            isOneToOne: false
            referencedRelation: "haushalte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haushaltsmitglieder_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      haushaltsscheck_daten: {
        Row: {
          aktiv: boolean
          arbeitgeber_adresse: string
          arbeitgeber_name: string
          arbeitnehmer_name: string
          arbeitnehmer_svnr: string
          beginn_datum: string
          created_at: string
          id: string
          profil_id: string
          stunden_pro_woche: number
          stundenlohn: number
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          arbeitgeber_adresse: string
          arbeitgeber_name: string
          arbeitnehmer_name: string
          arbeitnehmer_svnr: string
          beginn_datum: string
          created_at?: string
          id?: string
          profil_id: string
          stunden_pro_woche: number
          stundenlohn: number
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          arbeitgeber_adresse?: string
          arbeitgeber_name?: string
          arbeitnehmer_name?: string
          arbeitnehmer_svnr?: string
          beginn_datum?: string
          created_at?: string
          id?: string
          profil_id?: string
          stunden_pro_woche?: number
          stundenlohn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haushaltsscheck_daten_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      impfungen: {
        Row: {
          arzt: string | null
          charge: string | null
          created_at: string | null
          datum: string
          id: string
          impfstoff: string
          krankheit: string
          naechste_impfung: string | null
          profil_id: string
        }
        Insert: {
          arzt?: string | null
          charge?: string | null
          created_at?: string | null
          datum: string
          id?: string
          impfstoff: string
          krankheit: string
          naechste_impfung?: string | null
          profil_id: string
        }
        Update: {
          arzt?: string | null
          charge?: string | null
          created_at?: string | null
          datum?: string
          id?: string
          impfstoff?: string
          krankheit?: string
          naechste_impfung?: string | null
          profil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impfungen_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ki_audit_log: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_05: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_06: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_07: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_08: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_09: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_10: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_11: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2026_12: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2027_01: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2027_02: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2027_03: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      ki_audit_log_2027_04: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          id: string
          input_schema: string | null
          latency_ms: number | null
          model_version: string
          prompt_hash: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_pseudo_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version: string
          prompt_hash: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          input_schema?: string | null
          latency_ms?: number | null
          model_version?: string
          prompt_hash?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_pseudo_id?: string
        }
        Relationships: []
      }
      leistungen: {
        Row: {
          aktiv: boolean
          anbieter_id: string
          beschreibung: string | null
          created_at: string
          id: string
          kapazitaet: number | null
          kategorie: string
          kostentraeger: string[] | null
          lebenslage: string[] | null
          name: string
          preis_bis: number | null
          preis_einheit: string | null
          preis_von: number | null
          sgb_paragraf: string | null
          wartezeit_wochen: number | null
        }
        Insert: {
          aktiv?: boolean
          anbieter_id: string
          beschreibung?: string | null
          created_at?: string
          id?: string
          kapazitaet?: number | null
          kategorie: string
          kostentraeger?: string[] | null
          lebenslage?: string[] | null
          name: string
          preis_bis?: number | null
          preis_einheit?: string | null
          preis_von?: number | null
          sgb_paragraf?: string | null
          wartezeit_wochen?: number | null
        }
        Update: {
          aktiv?: boolean
          anbieter_id?: string
          beschreibung?: string | null
          created_at?: string
          id?: string
          kapazitaet?: number | null
          kategorie?: string
          kostentraeger?: string[] | null
          lebenslage?: string[] | null
          name?: string
          preis_bis?: number | null
          preis_einheit?: string | null
          preis_von?: number | null
          sgb_paragraf?: string | null
          wartezeit_wochen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leistungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leistungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "leistungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      leistungen_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          lebenslage: string | null
          leistung_beschreibung: string
          leistung_code: string
          leistung_titel: string
          max_betrag_eur: number | null
          rechtsgrundlage: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          lebenslage?: string | null
          leistung_beschreibung: string
          leistung_code: string
          leistung_titel: string
          max_betrag_eur?: number | null
          rechtsgrundlage?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          lebenslage?: string | null
          leistung_beschreibung?: string
          leistung_code?: string
          leistung_titel?: string
          max_betrag_eur?: number | null
          rechtsgrundlage?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medikamente: {
        Row: {
          abends: number | null
          aktiv: boolean | null
          bis_datum: string | null
          created_at: string | null
          darreichungsform: string | null
          einheit: string | null
          hinweis: string | null
          id: string
          mittags: number | null
          morgens: number | null
          nachts: number | null
          name: string
          profil_id: string
          seit_datum: string | null
          staerke: string | null
          updated_at: string | null
          verordnet_von: string | null
          wirkstoff: string | null
        }
        Insert: {
          abends?: number | null
          aktiv?: boolean | null
          bis_datum?: string | null
          created_at?: string | null
          darreichungsform?: string | null
          einheit?: string | null
          hinweis?: string | null
          id?: string
          mittags?: number | null
          morgens?: number | null
          nachts?: number | null
          name: string
          profil_id: string
          seit_datum?: string | null
          staerke?: string | null
          updated_at?: string | null
          verordnet_von?: string | null
          wirkstoff?: string | null
        }
        Update: {
          abends?: number | null
          aktiv?: boolean | null
          bis_datum?: string | null
          created_at?: string | null
          darreichungsform?: string | null
          einheit?: string | null
          hinweis?: string | null
          id?: string
          mittags?: number | null
          morgens?: number | null
          nachts?: number | null
          name?: string
          profil_id?: string
          seit_datum?: string | null
          staerke?: string | null
          updated_at?: string | null
          verordnet_von?: string | null
          wirkstoff?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medikamente_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medikamenten_plan: {
        Row: {
          aktiv: boolean
          anbieter_id: string
          created_at: string
          dosis: string
          einheit: string | null
          familie_profile_id: string
          hinweis: string | null
          id: string
          medikament: string
          mit_mahlzeit: boolean | null
          valid_until: string | null
          verordnet_am: string | null
          verordnet_von: string | null
          wirkstoff: string | null
          zeiten: string[]
        }
        Insert: {
          aktiv?: boolean
          anbieter_id: string
          created_at?: string
          dosis: string
          einheit?: string | null
          familie_profile_id: string
          hinweis?: string | null
          id?: string
          medikament: string
          mit_mahlzeit?: boolean | null
          valid_until?: string | null
          verordnet_am?: string | null
          verordnet_von?: string | null
          wirkstoff?: string | null
          zeiten: string[]
        }
        Update: {
          aktiv?: boolean
          anbieter_id?: string
          created_at?: string
          dosis?: string
          einheit?: string | null
          familie_profile_id?: string
          hinweis?: string | null
          id?: string
          medikament?: string
          mit_mahlzeit?: boolean | null
          valid_until?: string | null
          verordnet_am?: string | null
          verordnet_von?: string | null
          wirkstoff?: string | null
          zeiten?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "medikamenten_plan_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medikamenten_plan_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "medikamenten_plan_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "medikamenten_plan_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medikamentenplaene: {
        Row: {
          aktiv: boolean | null
          anbieter_id: string | null
          bis_datum: string | null
          created_at: string | null
          darreichungsform: string | null
          dauermedikation: boolean | null
          dosierung_abends: number | null
          dosierung_mittags: number | null
          dosierung_morgens: number | null
          dosierung_nachts: number | null
          einheit: string | null
          erstellt_von: string | null
          familie_profile_id: string
          hinweise: string | null
          id: string
          indikation: string | null
          medikament_name: string
          mit_mahlzeit: boolean | null
          staerke: string | null
          updated_at: string | null
          verordnet_von: string | null
          von_datum: string | null
          wirkstoff: string | null
        }
        Insert: {
          aktiv?: boolean | null
          anbieter_id?: string | null
          bis_datum?: string | null
          created_at?: string | null
          darreichungsform?: string | null
          dauermedikation?: boolean | null
          dosierung_abends?: number | null
          dosierung_mittags?: number | null
          dosierung_morgens?: number | null
          dosierung_nachts?: number | null
          einheit?: string | null
          erstellt_von?: string | null
          familie_profile_id: string
          hinweise?: string | null
          id?: string
          indikation?: string | null
          medikament_name: string
          mit_mahlzeit?: boolean | null
          staerke?: string | null
          updated_at?: string | null
          verordnet_von?: string | null
          von_datum?: string | null
          wirkstoff?: string | null
        }
        Update: {
          aktiv?: boolean | null
          anbieter_id?: string | null
          bis_datum?: string | null
          created_at?: string | null
          darreichungsform?: string | null
          dauermedikation?: boolean | null
          dosierung_abends?: number | null
          dosierung_mittags?: number | null
          dosierung_morgens?: number | null
          dosierung_nachts?: number | null
          einheit?: string | null
          erstellt_von?: string | null
          familie_profile_id?: string
          hinweise?: string | null
          id?: string
          indikation?: string | null
          medikament_name?: string
          mit_mahlzeit?: boolean | null
          staerke?: string | null
          updated_at?: string | null
          verordnet_von?: string | null
          von_datum?: string | null
          wirkstoff?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medikamentenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medikamentenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "medikamentenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "medikamentenplaene_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medikamentenplaene_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merkliste: {
        Row: {
          anbieter_id: string
          created_at: string
          familie_id: string
          id: string
          notiz: string | null
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          familie_id: string
          id?: string
          notiz?: string | null
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          familie_id?: string
          id?: string
          notiz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merkliste_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merkliste_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "merkliste_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "merkliste_familie_id_fkey"
            columns: ["familie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten: {
        Row: {
          anfrage_id: string
          created_at: string
          gelesen: boolean
          id: string
          inhalt: string
          sender_id: string
          typ: string
        }
        Insert: {
          anfrage_id: string
          created_at?: string
          gelesen?: boolean
          id?: string
          inhalt: string
          sender_id: string
          typ?: string
        }
        Update: {
          anfrage_id?: string
          created_at?: string
          gelesen?: boolean
          id?: string
          inhalt?: string
          sender_id?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten_vorlagen: {
        Row: {
          anbieter_id: string
          created_at: string
          id: string
          inhalt: string
          titel: string
        }
        Insert: {
          anbieter_id: string
          created_at?: string
          id?: string
          inhalt: string
          titel: string
        }
        Update: {
          anbieter_id?: string
          created_at?: string
          id?: string
          inhalt?: string
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_vorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_vorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "nachrichten_vorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      notfallkontakte: {
        Row: {
          adresse: string | null
          beziehung: string | null
          created_at: string | null
          email: string | null
          id: string
          ist_hauptkontakt: boolean | null
          name: string
          profil_id: string
          sortierung: number | null
          telefon: string | null
        }
        Insert: {
          adresse?: string | null
          beziehung?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ist_hauptkontakt?: boolean | null
          name: string
          profil_id: string
          sortierung?: number | null
          telefon?: string | null
        }
        Update: {
          adresse?: string | null
          beziehung?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ist_hauptkontakt?: boolean | null
          name?: string
          profil_id?: string
          sortierung?: number | null
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notfallkontakte_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notfallplaene: {
        Row: {
          aktiv: boolean
          allergien: string | null
          anbieter_id: string | null
          besondere_hinweise: string | null
          blutgruppe: string | null
          chronische_erkrankungen: string | null
          created_at: string
          dnr_verfuegung: boolean | null
          familie_profile_id: string
          hausarzt_name: string | null
          hausarzt_telefon: string | null
          id: string
          implantate: string | null
          krankenhaus_adresse: string | null
          krankenhaus_name: string | null
          krankenkasse: string | null
          medikamente_notfall: string | null
          patientenverfuegung_vorhanden: boolean | null
          updated_at: string
          versicherungsnummer: string | null
        }
        Insert: {
          aktiv?: boolean
          allergien?: string | null
          anbieter_id?: string | null
          besondere_hinweise?: string | null
          blutgruppe?: string | null
          chronische_erkrankungen?: string | null
          created_at?: string
          dnr_verfuegung?: boolean | null
          familie_profile_id: string
          hausarzt_name?: string | null
          hausarzt_telefon?: string | null
          id?: string
          implantate?: string | null
          krankenhaus_adresse?: string | null
          krankenhaus_name?: string | null
          krankenkasse?: string | null
          medikamente_notfall?: string | null
          patientenverfuegung_vorhanden?: boolean | null
          updated_at?: string
          versicherungsnummer?: string | null
        }
        Update: {
          aktiv?: boolean
          allergien?: string | null
          anbieter_id?: string | null
          besondere_hinweise?: string | null
          blutgruppe?: string | null
          chronische_erkrankungen?: string | null
          created_at?: string
          dnr_verfuegung?: boolean | null
          familie_profile_id?: string
          hausarzt_name?: string | null
          hausarzt_telefon?: string | null
          id?: string
          implantate?: string | null
          krankenhaus_adresse?: string | null
          krankenhaus_name?: string | null
          krankenkasse?: string | null
          medikamente_notfall?: string | null
          patientenverfuegung_vorhanden?: boolean | null
          updated_at?: string
          versicherungsnummer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notfallplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notfallplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "notfallplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "notfallplaene_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_anfragen: boolean
          email_nachrichten: boolean
          email_statusupdate: boolean
          email_wochenbericht: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          email_anfragen?: boolean
          email_nachrichten?: boolean
          email_statusupdate?: boolean
          email_wochenbericht?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          email_anfragen?: boolean
          email_nachrichten?: boolean
          email_statusupdate?: boolean
          email_wochenbericht?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegeaufgaben: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          created_at: string | null
          erledigt_heute: boolean | null
          haeufigkeit: string | null
          id: string
          profil_id: string
          titel: string
          uhrzeit: string | null
          verantwortlich: string | null
          ziel_id: string | null
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          erledigt_heute?: boolean | null
          haeufigkeit?: string | null
          id?: string
          profil_id: string
          titel: string
          uhrzeit?: string | null
          verantwortlich?: string | null
          ziel_id?: string | null
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          erledigt_heute?: boolean | null
          haeufigkeit?: string | null
          id?: string
          profil_id?: string
          titel?: string
          uhrzeit?: string | null
          verantwortlich?: string | null
          ziel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pflegeaufgaben_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pflegeaufgaben_ziel_id_fkey"
            columns: ["ziel_id"]
            isOneToOne: false
            referencedRelation: "pflegeziele"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegedokumentation: {
        Row: {
          anbieter_id: string
          blutdruck_dia: number | null
          blutdruck_sys: number | null
          blutzucker: number | null
          care_worker_id: string | null
          created_at: string
          ereignis_datum: string
          erstellt_von: string | null
          familie_profile_id: string | null
          gewicht: number | null
          id: string
          inhalt: string
          kategorie: string
          medikament_dosis: string | null
          medikament_gegeben: boolean | null
          medikament_name: string | null
          puls: number | null
          sauerstoff: number | null
          temperatur: number | null
          titel: string | null
          unterschrieben: boolean
          unterschrift_ts: string | null
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          blutdruck_dia?: number | null
          blutdruck_sys?: number | null
          blutzucker?: number | null
          care_worker_id?: string | null
          created_at?: string
          ereignis_datum?: string
          erstellt_von?: string | null
          familie_profile_id?: string | null
          gewicht?: number | null
          id?: string
          inhalt: string
          kategorie: string
          medikament_dosis?: string | null
          medikament_gegeben?: boolean | null
          medikament_name?: string | null
          puls?: number | null
          sauerstoff?: number | null
          temperatur?: number | null
          titel?: string | null
          unterschrieben?: boolean
          unterschrift_ts?: string | null
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          blutdruck_dia?: number | null
          blutdruck_sys?: number | null
          blutzucker?: number | null
          care_worker_id?: string | null
          created_at?: string
          ereignis_datum?: string
          erstellt_von?: string | null
          familie_profile_id?: string | null
          gewicht?: number | null
          id?: string
          inhalt?: string
          kategorie?: string
          medikament_dosis?: string | null
          medikament_gegeben?: boolean | null
          medikament_name?: string | null
          puls?: number | null
          sauerstoff?: number | null
          temperatur?: number | null
          titel?: string | null
          unterschrieben?: boolean
          unterschrift_ts?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegedokumentation_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegedokumentation_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegedokumentation_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegegrad_einschaetzungen: {
        Row: {
          aktueller_pflegegrad: number | null
          anbieter_id: string | null
          created_at: string
          einschaetzung_datum: string
          erstellt_von: string | null
          familie_profile_id: string
          gesamtpunkte: number | null
          id: string
          m1_bettpositionswechsel: number | null
          m1_fortbewegung_innen: number | null
          m1_halten_sitzposition: number | null
          m1_treppensteigen: number | null
          m1_umsetzen: number | null
          m2_alltagsgegenstaende: number | null
          m2_oertliche_orientierung: number | null
          m2_personen_erkennen: number | null
          m2_risiken_erkennen: number | null
          m2_zeitliche_orientierung: number | null
          m3_abwehrverhalten: number | null
          m3_motorische_unruhe: number | null
          m3_naechtliche_unruhe: number | null
          m4_an_auskleiden: number | null
          m4_ernaehrung: number | null
          m4_koerperpflege: number | null
          m4_toilettennutzung: number | null
          m4_trinken: number | null
          m4_waschen_gesicht: number | null
          m5_arztbesuche: number | null
          m5_hilfsmittel: number | null
          m5_medikamente: number | null
          m6_freizeitgestaltung: number | null
          m6_kontakte: number | null
          m6_tagesstruktur: number | null
          notizen: string | null
          pflegegrad_empfehlung: number | null
        }
        Insert: {
          aktueller_pflegegrad?: number | null
          anbieter_id?: string | null
          created_at?: string
          einschaetzung_datum?: string
          erstellt_von?: string | null
          familie_profile_id: string
          gesamtpunkte?: number | null
          id?: string
          m1_bettpositionswechsel?: number | null
          m1_fortbewegung_innen?: number | null
          m1_halten_sitzposition?: number | null
          m1_treppensteigen?: number | null
          m1_umsetzen?: number | null
          m2_alltagsgegenstaende?: number | null
          m2_oertliche_orientierung?: number | null
          m2_personen_erkennen?: number | null
          m2_risiken_erkennen?: number | null
          m2_zeitliche_orientierung?: number | null
          m3_abwehrverhalten?: number | null
          m3_motorische_unruhe?: number | null
          m3_naechtliche_unruhe?: number | null
          m4_an_auskleiden?: number | null
          m4_ernaehrung?: number | null
          m4_koerperpflege?: number | null
          m4_toilettennutzung?: number | null
          m4_trinken?: number | null
          m4_waschen_gesicht?: number | null
          m5_arztbesuche?: number | null
          m5_hilfsmittel?: number | null
          m5_medikamente?: number | null
          m6_freizeitgestaltung?: number | null
          m6_kontakte?: number | null
          m6_tagesstruktur?: number | null
          notizen?: string | null
          pflegegrad_empfehlung?: number | null
        }
        Update: {
          aktueller_pflegegrad?: number | null
          anbieter_id?: string | null
          created_at?: string
          einschaetzung_datum?: string
          erstellt_von?: string | null
          familie_profile_id?: string
          gesamtpunkte?: number | null
          id?: string
          m1_bettpositionswechsel?: number | null
          m1_fortbewegung_innen?: number | null
          m1_halten_sitzposition?: number | null
          m1_treppensteigen?: number | null
          m1_umsetzen?: number | null
          m2_alltagsgegenstaende?: number | null
          m2_oertliche_orientierung?: number | null
          m2_personen_erkennen?: number | null
          m2_risiken_erkennen?: number | null
          m2_zeitliche_orientierung?: number | null
          m3_abwehrverhalten?: number | null
          m3_motorische_unruhe?: number | null
          m3_naechtliche_unruhe?: number | null
          m4_an_auskleiden?: number | null
          m4_ernaehrung?: number | null
          m4_koerperpflege?: number | null
          m4_toilettennutzung?: number | null
          m4_trinken?: number | null
          m4_waschen_gesicht?: number | null
          m5_arztbesuche?: number | null
          m5_hilfsmittel?: number | null
          m5_medikamente?: number | null
          m6_freizeitgestaltung?: number | null
          m6_kontakte?: number | null
          m6_tagesstruktur?: number | null
          notizen?: string | null
          pflegegrad_empfehlung?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pflegegrad_einschaetzungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegegrad_einschaetzungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegegrad_einschaetzungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegegrad_einschaetzungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegegrad_einschaetzungen_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegekassen_budgets: {
        Row: {
          created_at: string
          id: string
          jahr: number
          jahresbudget: number
          leistungsart: string
          profil_id: string
          updated_at: string
          verbraucht: number
        }
        Insert: {
          created_at?: string
          id?: string
          jahr: number
          jahresbudget: number
          leistungsart: string
          profil_id: string
          updated_at?: string
          verbraucht?: number
        }
        Update: {
          created_at?: string
          id?: string
          jahr?: number
          jahresbudget?: number
          leistungsart?: string
          profil_id?: string
          updated_at?: string
          verbraucht?: number
        }
        Relationships: [
          {
            foreignKeyName: "pflegekassen_budgets_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegekosten: {
        Row: {
          belegnummer: string | null
          beschreibung: string | null
          betrag: number
          buchungsdatum: string
          created_at: string | null
          erstattung: boolean | null
          id: string
          kategorie: string
          profil_id: string
        }
        Insert: {
          belegnummer?: string | null
          beschreibung?: string | null
          betrag: number
          buchungsdatum?: string
          created_at?: string | null
          erstattung?: boolean | null
          id?: string
          kategorie: string
          profil_id: string
        }
        Update: {
          belegnummer?: string | null
          beschreibung?: string | null
          betrag?: number
          buchungsdatum?: string
          created_at?: string | null
          erstattung?: boolean | null
          id?: string
          kategorie?: string
          profil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pflegekosten_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pflegetagebuch: {
        Row: {
          aktivitaeten: string | null
          created_at: string | null
          eintrag_datum: string
          erstellt_von: string | null
          id: string
          notizen: string | null
          profil_id: string
          schlaf_stunden: number | null
          schmerzen: number | null
          stimmung: number | null
        }
        Insert: {
          aktivitaeten?: string | null
          created_at?: string | null
          eintrag_datum?: string
          erstellt_von?: string | null
          id?: string
          notizen?: string | null
          profil_id: string
          schlaf_stunden?: number | null
          schmerzen?: number | null
          stimmung?: number | null
        }
        Update: {
          aktivitaeten?: string | null
          created_at?: string | null
          eintrag_datum?: string
          erstellt_von?: string | null
          id?: string
          notizen?: string | null
          profil_id?: string
          schlaf_stunden?: number | null
          schmerzen?: number | null
          stimmung?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pflegetagebuch_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pflegetagebuch_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pflegetermine: {
        Row: {
          anbieter_id: string | null
          beschreibung: string | null
          created_at: string | null
          datum: string
          dauer_minuten: number | null
          erinnerung_tage: number | null
          erledigt: boolean | null
          id: string
          notizen: string | null
          ort: string | null
          profil_id: string
          termin_typ: string | null
          titel: string
        }
        Insert: {
          anbieter_id?: string | null
          beschreibung?: string | null
          created_at?: string | null
          datum: string
          dauer_minuten?: number | null
          erinnerung_tage?: number | null
          erledigt?: boolean | null
          id?: string
          notizen?: string | null
          ort?: string | null
          profil_id: string
          termin_typ?: string | null
          titel: string
        }
        Update: {
          anbieter_id?: string | null
          beschreibung?: string | null
          created_at?: string | null
          datum?: string
          dauer_minuten?: number | null
          erinnerung_tage?: number | null
          erledigt?: boolean | null
          id?: string
          notizen?: string | null
          ort?: string | null
          profil_id?: string
          termin_typ?: string | null
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "pflegetermine_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegetermine_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegetermine_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegetermine_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pflegeziele: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          erreicht: boolean | null
          id: string
          kategorie: string | null
          prioritaet: number | null
          profil_id: string
          titel: string
          updated_at: string | null
          ziel_datum: string | null
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          erreicht?: boolean | null
          id?: string
          kategorie?: string | null
          prioritaet?: number | null
          profil_id: string
          titel: string
          updated_at?: string | null
          ziel_datum?: string | null
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          erreicht?: boolean | null
          id?: string
          kategorie?: string | null
          prioritaet?: number | null
          profil_id?: string
          titel?: string
          updated_at?: string | null
          ziel_datum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pflegeziele_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          email_prefs: Json
          haushalt_id: string | null
          haushalt_rolle: Database["public"]["Enums"]["haushalt_rolle"] | null
          id: string
          nachname: string | null
          onboarding_done: boolean
          ort: string | null
          plz: string | null
          role: string
          telefon: string | null
          ui_modus: string
          updated_at: string
          user_id: string
          vorname: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          email_prefs?: Json
          haushalt_id?: string | null
          haushalt_rolle?: Database["public"]["Enums"]["haushalt_rolle"] | null
          id?: string
          nachname?: string | null
          onboarding_done?: boolean
          ort?: string | null
          plz?: string | null
          role?: string
          telefon?: string | null
          ui_modus?: string
          updated_at?: string
          user_id: string
          vorname?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          email_prefs?: Json
          haushalt_id?: string | null
          haushalt_rolle?: Database["public"]["Enums"]["haushalt_rolle"] | null
          id?: string
          nachname?: string | null
          onboarding_done?: boolean
          ort?: string | null
          plz?: string | null
          role?: string
          telefon?: string | null
          ui_modus?: string
          updated_at?: string
          user_id?: string
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_haushalt_id_fkey"
            columns: ["haushalt_id"]
            isOneToOne: false
            referencedRelation: "haushalte"
            referencedColumns: ["id"]
          },
        ]
      }
      qualitaetspruefungen: {
        Row: {
          abgeschlossen: boolean
          anbieter_id: string
          bericht_url: string | null
          created_at: string
          ergebnis: string | null
          erstellt_von: string | null
          id: string
          massnahmen: string | null
          naechste_pruefung: string | null
          note_gesamt: number | null
          pruefung_datum: string
          pruefung_typ: string
          updated_at: string
        }
        Insert: {
          abgeschlossen?: boolean
          anbieter_id: string
          bericht_url?: string | null
          created_at?: string
          ergebnis?: string | null
          erstellt_von?: string | null
          id?: string
          massnahmen?: string | null
          naechste_pruefung?: string | null
          note_gesamt?: number | null
          pruefung_datum: string
          pruefung_typ: string
          updated_at?: string
        }
        Update: {
          abgeschlossen?: boolean
          anbieter_id?: string
          bericht_url?: string | null
          created_at?: string
          ergebnis?: string | null
          erstellt_von?: string | null
          id?: string
          massnahmen?: string | null
          naechste_pruefung?: string | null
          note_gesamt?: number | null
          pruefung_datum?: string
          pruefung_typ?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualitaetspruefungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualitaetspruefungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "qualitaetspruefungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "qualitaetspruefungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schichten: {
        Row: {
          abgesagt_am: string | null
          absage_grund: string | null
          anbieter_id: string
          beschreibung: string | null
          bestaetigt_am: string | null
          care_worker_id: string
          created_at: string
          ende_ts: string
          erstellt_von: string | null
          familie_profile_id: string | null
          id: string
          schichttyp: string
          start_ts: string
          status: string
          stunden_geplant: number | null
          stundensatz_ct: number | null
          titel: string | null
          updated_at: string
        }
        Insert: {
          abgesagt_am?: string | null
          absage_grund?: string | null
          anbieter_id: string
          beschreibung?: string | null
          bestaetigt_am?: string | null
          care_worker_id: string
          created_at?: string
          ende_ts: string
          erstellt_von?: string | null
          familie_profile_id?: string | null
          id?: string
          schichttyp?: string
          start_ts: string
          status?: string
          stunden_geplant?: number | null
          stundensatz_ct?: number | null
          titel?: string | null
          updated_at?: string
        }
        Update: {
          abgesagt_am?: string | null
          absage_grund?: string | null
          anbieter_id?: string
          beschreibung?: string | null
          bestaetigt_am?: string | null
          care_worker_id?: string
          created_at?: string
          ende_ts?: string
          erstellt_von?: string | null
          familie_profile_id?: string | null
          id?: string
          schichttyp?: string
          start_ts?: string
          status?: string
          stunden_geplant?: number | null
          stundensatz_ct?: number | null
          titel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "schichten_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schichten_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schichten_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stripe_connect_accounts: {
        Row: {
          anbieter_id: string
          charges_enabled: boolean
          country: string
          created_at: string
          details_submitted: boolean
          email: string | null
          id: string
          onboarding_complete: boolean
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          anbieter_id: string
          charges_enabled?: boolean
          country?: string
          created_at?: string
          details_submitted?: boolean
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          anbieter_id?: string
          charges_enabled?: boolean
          country?: string
          created_at?: string
          details_submitted?: boolean
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: true
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connect_accounts_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: true
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "stripe_connect_accounts_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: true
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
        ]
      }
      stundennachweise: {
        Row: {
          anbieter_id: string
          approved_at: string | null
          beschreibung: string | null
          betrag_ct: number | null
          care_worker_id: string
          created_at: string
          datum: string
          familie_profile_id: string | null
          id: string
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          status: string
          stripe_charge_id: string | null
          stunden: number
          stundensatz_ct: number
        }
        Insert: {
          anbieter_id: string
          approved_at?: string | null
          beschreibung?: string | null
          betrag_ct?: number | null
          care_worker_id: string
          created_at?: string
          datum: string
          familie_profile_id?: string | null
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string
          stripe_charge_id?: string | null
          stunden: number
          stundensatz_ct: number
        }
        Update: {
          anbieter_id?: string
          approved_at?: string | null
          beschreibung?: string | null
          betrag_ct?: number | null
          care_worker_id?: string
          created_at?: string
          datum?: string
          familie_profile_id?: string | null
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string
          stripe_charge_id?: string | null
          stunden?: number
          stundensatz_ct?: number
        }
        Relationships: [
          {
            foreignKeyName: "stundennachweise_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stundennachweise_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "stundennachweise_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "stundennachweise_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stundennachweise_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traeger_klienten: {
        Row: {
          created_at: string | null
          geburtsjahr: number | null
          id: string
          klienten_nr: string
          lebenslage: string | null
          letzte_pruefung_at: string | null
          nachname: string | null
          notizen: string | null
          pflegegrad: number | null
          plz: string | null
          pruefungs_ergebnis: Json | null
          status: string
          traeger_id: string
          updated_at: string | null
          vorname: string | null
        }
        Insert: {
          created_at?: string | null
          geburtsjahr?: number | null
          id?: string
          klienten_nr: string
          lebenslage?: string | null
          letzte_pruefung_at?: string | null
          nachname?: string | null
          notizen?: string | null
          pflegegrad?: number | null
          plz?: string | null
          pruefungs_ergebnis?: Json | null
          status?: string
          traeger_id: string
          updated_at?: string | null
          vorname?: string | null
        }
        Update: {
          created_at?: string | null
          geburtsjahr?: number | null
          id?: string
          klienten_nr?: string
          lebenslage?: string | null
          letzte_pruefung_at?: string | null
          nachname?: string | null
          notizen?: string | null
          pflegegrad?: number | null
          plz?: string | null
          pruefungs_ergebnis?: Json | null
          status?: string
          traeger_id?: string
          updated_at?: string | null
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traeger_klienten_traeger_id_fkey"
            columns: ["traeger_id"]
            isOneToOne: false
            referencedRelation: "traeger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traeger_massenpruefungen: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dateiname: string
          ergebnis_url: string | null
          fehler: string | null
          id: string
          status: string
          traeger_id: string
          zeilen_gesamt: number | null
          zeilen_verarbeitet: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dateiname: string
          ergebnis_url?: string | null
          fehler?: string | null
          id?: string
          status?: string
          traeger_id: string
          zeilen_gesamt?: number | null
          zeilen_verarbeitet?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dateiname?: string
          ergebnis_url?: string | null
          fehler?: string | null
          id?: string
          status?: string
          traeger_id?: string
          zeilen_gesamt?: number | null
          zeilen_verarbeitet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "traeger_massenpruefungen_traeger_id_fkey"
            columns: ["traeger_id"]
            isOneToOne: false
            referencedRelation: "traeger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traeger_profiles: {
        Row: {
          abo_plan: string
          created_at: string | null
          id: string
          max_klienten: number
          organisation: string
          ort: string | null
          plz: string | null
          profile_id: string
          strasse: string | null
          telefon: string | null
          typ: string
          updated_at: string | null
          verified: boolean
          website: string | null
        }
        Insert: {
          abo_plan?: string
          created_at?: string | null
          id?: string
          max_klienten?: number
          organisation: string
          ort?: string | null
          plz?: string | null
          profile_id: string
          strasse?: string | null
          telefon?: string | null
          typ?: string
          updated_at?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          abo_plan?: string
          created_at?: string | null
          id?: string
          max_klienten?: number
          organisation?: string
          ort?: string | null
          plz?: string | null
          profile_id?: string
          strasse?: string | null
          telefon?: string | null
          typ?: string
          updated_at?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traeger_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uebergabeprotokolle: {
        Row: {
          allgemeinzustand: string | null
          anbieter_id: string
          besonderheiten: string | null
          bestaetigt: boolean | null
          bestaetigt_am: string | null
          care_worker_bis: string | null
          care_worker_von: string | null
          created_at: string
          erstellt_am: string
          familie_profile_id: string | null
          id: string
          medikamente_status: string | null
          offene_aufgaben: string | null
          schicht_bis_id: string | null
          schicht_von_id: string | null
          stimmung: string | null
          vitalwerte_auffaellig: boolean | null
        }
        Insert: {
          allgemeinzustand?: string | null
          anbieter_id: string
          besonderheiten?: string | null
          bestaetigt?: boolean | null
          bestaetigt_am?: string | null
          care_worker_bis?: string | null
          care_worker_von?: string | null
          created_at?: string
          erstellt_am?: string
          familie_profile_id?: string | null
          id?: string
          medikamente_status?: string | null
          offene_aufgaben?: string | null
          schicht_bis_id?: string | null
          schicht_von_id?: string | null
          stimmung?: string | null
          vitalwerte_auffaellig?: boolean | null
        }
        Update: {
          allgemeinzustand?: string | null
          anbieter_id?: string
          besonderheiten?: string | null
          bestaetigt?: boolean | null
          bestaetigt_am?: string | null
          care_worker_bis?: string | null
          care_worker_von?: string | null
          created_at?: string
          erstellt_am?: string
          familie_profile_id?: string | null
          id?: string
          medikamente_status?: string | null
          offene_aufgaben?: string | null
          schicht_bis_id?: string | null
          schicht_von_id?: string | null
          stimmung?: string | null
          vitalwerte_auffaellig?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "uebergabeprotokolle_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_care_worker_bis_fkey"
            columns: ["care_worker_bis"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_care_worker_von_fkey"
            columns: ["care_worker_von"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_bis_id_fkey"
            columns: ["schicht_bis_id"]
            isOneToOne: false
            referencedRelation: "schicht_konflikte"
            referencedColumns: ["schicht_a_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_bis_id_fkey"
            columns: ["schicht_bis_id"]
            isOneToOne: false
            referencedRelation: "schicht_konflikte"
            referencedColumns: ["schicht_b_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_bis_id_fkey"
            columns: ["schicht_bis_id"]
            isOneToOne: false
            referencedRelation: "schichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_von_id_fkey"
            columns: ["schicht_von_id"]
            isOneToOne: false
            referencedRelation: "schicht_konflikte"
            referencedColumns: ["schicht_a_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_von_id_fkey"
            columns: ["schicht_von_id"]
            isOneToOne: false
            referencedRelation: "schicht_konflikte"
            referencedColumns: ["schicht_b_id"]
          },
          {
            foreignKeyName: "uebergabeprotokolle_schicht_von_id_fkey"
            columns: ["schicht_von_id"]
            isOneToOne: false
            referencedRelation: "schichten"
            referencedColumns: ["id"]
          },
        ]
      }
      vollmachten: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          bevollmaechtigter_id: string | null
          created_at: string | null
          dokument_id: string | null
          gueltig_ab: string | null
          gueltig_bis: string | null
          haushalt_id: string
          id: string
          notariell: boolean | null
          registriert_beim: string | null
          titel: string
          typ: Database["public"]["Enums"]["vollmacht_typ"]
          updated_at: string | null
          vollmachtgeber_id: string | null
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          bevollmaechtigter_id?: string | null
          created_at?: string | null
          dokument_id?: string | null
          gueltig_ab?: string | null
          gueltig_bis?: string | null
          haushalt_id: string
          id?: string
          notariell?: boolean | null
          registriert_beim?: string | null
          titel: string
          typ: Database["public"]["Enums"]["vollmacht_typ"]
          updated_at?: string | null
          vollmachtgeber_id?: string | null
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          bevollmaechtigter_id?: string | null
          created_at?: string | null
          dokument_id?: string | null
          gueltig_ab?: string | null
          gueltig_bis?: string | null
          haushalt_id?: string
          id?: string
          notariell?: boolean | null
          registriert_beim?: string | null
          titel?: string
          typ?: Database["public"]["Enums"]["vollmacht_typ"]
          updated_at?: string | null
          vollmachtgeber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vollmachten_bevollmaechtigter_id_fkey"
            columns: ["bevollmaechtigter_id"]
            isOneToOne: false
            referencedRelation: "haushaltsmitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vollmachten_haushalt_id_fkey"
            columns: ["haushalt_id"]
            isOneToOne: false
            referencedRelation: "haushalte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vollmachten_vollmachtgeber_id_fkey"
            columns: ["vollmachtgeber_id"]
            isOneToOne: false
            referencedRelation: "haushaltsmitglieder"
            referencedColumns: ["id"]
          },
        ]
      }
      white_label_configs: {
        Row: {
          aktiv: boolean
          color_accent: string
          color_primary: string
          color_secondary: string
          created_at: string
          datenschutz_url: string | null
          domain: string | null
          favicon_url: string | null
          features: Json
          font_family: string
          id: string
          impressum_url: string | null
          logo_url: string | null
          organisation: string
          slug: string
          support_email: string | null
          support_tel: string | null
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          color_accent?: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          datenschutz_url?: string | null
          domain?: string | null
          favicon_url?: string | null
          features?: Json
          font_family?: string
          id?: string
          impressum_url?: string | null
          logo_url?: string | null
          organisation: string
          slug: string
          support_email?: string | null
          support_tel?: string | null
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          color_accent?: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          datenschutz_url?: string | null
          domain?: string | null
          favicon_url?: string | null
          features?: Json
          font_family?: string
          id?: string
          impressum_url?: string | null
          logo_url?: string | null
          organisation?: string
          slug?: string
          support_email?: string | null
          support_tel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wiedervorlagen: {
        Row: {
          anbieter_id: string
          anfrage_id: string
          created_at: string
          erledigt: boolean
          faellig_am: string
          id: string
          notiz: string | null
        }
        Insert: {
          anbieter_id: string
          anfrage_id: string
          created_at?: string
          erledigt?: boolean
          faellig_am: string
          id?: string
          notiz?: string | null
        }
        Update: {
          anbieter_id?: string
          anfrage_id?: string
          created_at?: string
          erledigt?: boolean
          faellig_am?: string
          id?: string
          notiz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiedervorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiedervorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wiedervorlagen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wiedervorlagen_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
        ]
      }
      wochenplaene: {
        Row: {
          aktiv: boolean
          anbieter_id: string
          care_worker_id: string
          created_at: string
          familie_profile_id: string | null
          gueltig_ab: string
          gueltig_bis: string | null
          id: string
          muster: Json
          name: string
        }
        Insert: {
          aktiv?: boolean
          anbieter_id: string
          care_worker_id: string
          created_at?: string
          familie_profile_id?: string | null
          gueltig_ab?: string
          gueltig_bis?: string | null
          id?: string
          muster?: Json
          name: string
        }
        Update: {
          aktiv?: boolean
          anbieter_id?: string
          care_worker_id?: string
          created_at?: string
          familie_profile_id?: string | null
          gueltig_ab?: string
          gueltig_bis?: string | null
          id?: string
          muster?: Json
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wochenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wochenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wochenplaene_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wochenplaene_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wochenplaene_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wohlbefinden: {
        Row: {
          anbieter_id: string | null
          appetit: number | null
          created_at: string
          erfasst_am: string
          erfasst_von_rolle: string | null
          erstellt_von: string | null
          familie_profile_id: string
          id: string
          mobilitaet: number | null
          notiz: string | null
          schlaf: number | null
          schmerz: number | null
          stimmung: number | null
        }
        Insert: {
          anbieter_id?: string | null
          appetit?: number | null
          created_at?: string
          erfasst_am?: string
          erfasst_von_rolle?: string | null
          erstellt_von?: string | null
          familie_profile_id: string
          id?: string
          mobilitaet?: number | null
          notiz?: string | null
          schlaf?: number | null
          schmerz?: number | null
          stimmung?: number | null
        }
        Update: {
          anbieter_id?: string | null
          appetit?: number | null
          created_at?: string
          erfasst_am?: string
          erfasst_von_rolle?: string | null
          erstellt_von?: string | null
          familie_profile_id?: string
          id?: string
          mobilitaet?: number | null
          notiz?: string | null
          schlaf?: number | null
          schmerz?: number | null
          stimmung?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wohlbefinden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wohlbefinden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wohlbefinden_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wohlbefinden_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wohlbefinden_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wundversorgung: {
        Row: {
          anbieter_id: string
          care_worker_id: string | null
          created_at: string
          ereignis_datum: string
          familie_profile_id: string
          foto_url: string | null
          heilungsverlauf: string | null
          id: string
          naechste_kontrolle: string | null
          wundbehandlung: string | null
          wundgroesse_cm: number | null
          wundlokalisation: string
          wundstadium: number | null
          wundtiefe: string | null
        }
        Insert: {
          anbieter_id: string
          care_worker_id?: string | null
          created_at?: string
          ereignis_datum?: string
          familie_profile_id: string
          foto_url?: string | null
          heilungsverlauf?: string | null
          id?: string
          naechste_kontrolle?: string | null
          wundbehandlung?: string | null
          wundgroesse_cm?: number | null
          wundlokalisation: string
          wundstadium?: number | null
          wundtiefe?: string | null
        }
        Update: {
          anbieter_id?: string
          care_worker_id?: string | null
          created_at?: string
          ereignis_datum?: string
          familie_profile_id?: string
          foto_url?: string | null
          heilungsverlauf?: string | null
          id?: string
          naechste_kontrolle?: string | null
          wundbehandlung?: string | null
          wundgroesse_cm?: number | null
          wundlokalisation?: string
          wundstadium?: number | null
          wundtiefe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wundversorgung_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wundversorgung_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wundversorgung_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wundversorgung_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wundversorgung_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wundversorgungen: {
        Row: {
          anbieter_id: string | null
          created_at: string | null
          dokumentiert_von: string | null
          exsudat: string | null
          familie_profile_id: string
          foto_url: string | null
          id: string
          lokalisation: string
          massnahmen: string | null
          naechster_verbandwechsel: string | null
          notizen: string | null
          schmerz_nrs: number | null
          tiefe_grad: number | null
          verbandsmaterial: string | null
          wundart: string | null
          wunde_id: string | null
          wundgroesse_cm2: number | null
          wundrand: string | null
          wundzustand: string | null
        }
        Insert: {
          anbieter_id?: string | null
          created_at?: string | null
          dokumentiert_von?: string | null
          exsudat?: string | null
          familie_profile_id: string
          foto_url?: string | null
          id?: string
          lokalisation: string
          massnahmen?: string | null
          naechster_verbandwechsel?: string | null
          notizen?: string | null
          schmerz_nrs?: number | null
          tiefe_grad?: number | null
          verbandsmaterial?: string | null
          wundart?: string | null
          wunde_id?: string | null
          wundgroesse_cm2?: number | null
          wundrand?: string | null
          wundzustand?: string | null
        }
        Update: {
          anbieter_id?: string | null
          created_at?: string | null
          dokumentiert_von?: string | null
          exsudat?: string | null
          familie_profile_id?: string
          foto_url?: string | null
          id?: string
          lokalisation?: string
          massnahmen?: string | null
          naechster_verbandwechsel?: string | null
          notizen?: string | null
          schmerz_nrs?: number | null
          tiefe_grad?: number | null
          verbandsmaterial?: string | null
          wundart?: string | null
          wunde_id?: string | null
          wundgroesse_cm2?: number | null
          wundrand?: string | null
          wundzustand?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wundversorgungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wundversorgungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wundversorgungen_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "wundversorgungen_dokumentiert_von_fkey"
            columns: ["dokumentiert_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wundversorgungen_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zahlungen_log: {
        Row: {
          anbieter_id: string
          beschreibung: string | null
          brutto_ct: number
          created_at: string
          familie_profile_id: string | null
          id: string
          netto_ct: number
          paid_at: string | null
          payment_intent_id: string
          provision_ct: number
          status: string
          stripe_account_id: string
          stripe_charge_id: string | null
          stripe_transfer_id: string | null
          stundennachweis_id: string | null
        }
        Insert: {
          anbieter_id: string
          beschreibung?: string | null
          brutto_ct: number
          created_at?: string
          familie_profile_id?: string | null
          id?: string
          netto_ct: number
          paid_at?: string | null
          payment_intent_id: string
          provision_ct: number
          status?: string
          stripe_account_id: string
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          stundennachweis_id?: string | null
        }
        Update: {
          anbieter_id?: string
          beschreibung?: string | null
          brutto_ct?: number
          created_at?: string
          familie_profile_id?: string | null
          id?: string
          netto_ct?: number
          paid_at?: string | null
          payment_intent_id?: string
          provision_ct?: number
          status?: string
          stripe_account_id?: string
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          stundennachweis_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zahlungen_log_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahlungen_log_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "zahlungen_log_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "zahlungen_log_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahlungen_log_stundennachweis_id_fkey"
            columns: ["stundennachweis_id"]
            isOneToOne: false
            referencedRelation: "stundennachweise"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      anbieter_zahlungs_uebersicht: {
        Row: {
          anbieter_id: string | null
          anbieter_name: string | null
          charges_enabled: boolean | null
          offen_ct: number | null
          onboarding_complete: boolean | null
          payouts_enabled: boolean | null
          stripe_account_id: string | null
          stunden_approved: number | null
          stunden_paid: number | null
          stunden_pending: number | null
          umsatz_ct: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      ki_audit_stats: {
        Row: {
          avg_latency_ms: number | null
          day: string | null
          endpoint: string | null
          error_count: number | null
          model_version: string | null
          success_rate_pct: number | null
          total_calls: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
        }
        Relationships: []
      }
      mdk_compliance_uebersicht: {
        Row: {
          anbieter_id: string | null
          anbieter_name: string | null
          betreute_personen: number | null
          checks_erfuellt: number | null
          checks_gesamt: number | null
          doku_eintraege_90d: number | null
          doku_signiert_90d: number | null
          kritische_beschwerden: number | null
          letzte_mdk_pruefung: string | null
          letzter_mdk_note: number | null
          offene_beschwerden: number | null
          ueberfaellige_checks: number | null
        }
        Relationships: []
      }
      schicht_konflikte: {
        Row: {
          a_ende: string | null
          a_start: string | null
          b_ende: string | null
          b_start: string | null
          care_worker_id: string | null
          schicht_a_id: string | null
          schicht_b_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schichten_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      schichten_wochenuebersicht: {
        Row: {
          absagen: number | null
          anbieter_id: string | null
          anzahl_schichten: number | null
          care_worker_id: string | null
          care_worker_name: string | null
          geleistete_stunden: number | null
          geplante_stunden: number | null
          kalenderwoche: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "schichten_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "schichten_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      vitalwert_verlauf: {
        Row: {
          anbieter_id: string | null
          anzahl_messungen: number | null
          avg_blutzucker: number | null
          avg_dia: number | null
          avg_gewicht: number | null
          avg_puls: number | null
          avg_sys: number | null
          avg_temp: number | null
          datum: string | null
          familie_profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegedokumentation_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "pflegedokumentation_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wohlbefinden_verlauf: {
        Row: {
          anzahl_eintraege: number | null
          avg_appetit: number | null
          avg_mobilitaet: number | null
          avg_schlaf: number | null
          avg_schmerz: number | null
          avg_stimmung: number | null
          familie_profile_id: string | null
          woche: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wohlbefinden_familie_profile_id_fkey"
            columns: ["familie_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zertifikat_ablaufwarnungen: {
        Row: {
          anbieter_id: string | null
          bezeichnung: string | null
          care_worker_id: string | null
          care_worker_name: string | null
          gueltig_bis: string | null
          id: string | null
          status: string | null
          tage_bis_ablauf: number | null
          typ: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "anbieter_zahlungs_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_anbieter_id_fkey"
            columns: ["anbieter_id"]
            isOneToOne: false
            referencedRelation: "mdk_compliance_uebersicht"
            referencedColumns: ["anbieter_id"]
          },
          {
            foreignKeyName: "care_worker_zertifikate_care_worker_id_fkey"
            columns: ["care_worker_id"]
            isOneToOne: false
            referencedRelation: "care_workers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      anbieter_im_umkreis: {
        Args: { lat_eingabe: number; lng_eingabe: number; radius_km?: number }
        Returns: {
          entfernung_m: number
          id: string
          lat: number
          lng: number
          name: string
          ort: string
          plz: string
          verifiziert: boolean
        }[]
      }
      create_ki_audit_partition: {
        Args: { target_month: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      match_leistungen: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          lebenslage: string
          leistung_beschreibung: string
          leistung_code: string
          leistung_titel: string
          max_betrag_eur: number
          rechtsgrundlage: string
          similarity: number
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      suche_care_workers_geo: {
        Args: {
          p_fuehrungszeugnis?: boolean
          p_lat: number
          p_limit?: number
          p_lng: number
          p_max_stundensatz?: number
          p_offset?: number
          p_qualifikation?: string
          p_radius_m?: number
          p_sprache?: string
          p_verfuegbar_ab?: string
        }
        Returns: {
          anbieter_id: string
          anbieter_logo_url: string
          anbieter_name: string
          anbieter_verifiziert: boolean
          berufserfahrung_jahre: number
          bio: string
          entfernung_m: number
          fuehrungszeugnis_vorhanden: boolean
          id: string
          max_stunden_woche: number
          nachname: string
          ort: string
          plz: string
          qualifikationen: string[]
          sprachen: string[]
          stundensatz_ct: number
          verfuegbar_ab: string
          vorname: string
          zertifikate: string[]
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      anbieter_plan: "free" | "starter" | "professional" | "enterprise"
      haushalt_rolle:
        | "pflegebeduerftig"
        | "pflegeperson"
        | "betreuer"
        | "vormund"
        | "bevollmaechtigter"
        | "kind"
        | "angehoeriger"
      vollmacht_typ:
        | "generalvollmacht"
        | "vorsorgevollmacht"
        | "betreuungsverfuegung"
        | "patientenverfuegung"
        | "sorgerechtsverfuegung"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      anbieter_plan: ["free", "starter", "professional", "enterprise"],
      haushalt_rolle: [
        "pflegebeduerftig",
        "pflegeperson",
        "betreuer",
        "vormund",
        "bevollmaechtigter",
        "kind",
        "angehoeriger",
      ],
      vollmacht_typ: [
        "generalvollmacht",
        "vorsorgevollmacht",
        "betreuungsverfuegung",
        "patientenverfuegung",
        "sorgerechtsverfuegung",
      ],
    },
  },
} as const
