"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWhiteLabel, updateWhiteLabel, type WhiteLabelFormData } from "./actions";

const FONT_OPTIONS = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Source Sans Pro"];

const FEATURE_LABELS: Record<string, string> = {
  ki_lotse: "KI-Lotse",
  anbieter_suche: "Anbieter-Suche",
  pflegekrafte: "Pflegekräfte",
  traeger_portal: "Träger-Portal",
  dokumente_tresor: "Dokumente-Tresor",
  chat: "Chat",
};

interface Props {
  mode: "create" | "edit";
  id?: string;
  defaultValues?: Partial<WhiteLabelFormData>;
}

const DEFAULTS: WhiteLabelFormData = {
  slug: "",
  organisation: "",
  domain: "",
  color_primary: "#2563eb",
  color_secondary: "#1e40af",
  color_accent: "#3b82f6",
  font_family: "Inter",
  impressum_url: "",
  datenschutz_url: "",
  support_email: "",
  support_tel: "",
  aktiv: true,
  feature_ki_lotse: true,
  feature_anbieter_suche: true,
  feature_pflegekrafte: true,
  feature_traeger_portal: false,
  feature_dokumente_tresor: true,
  feature_chat: true,
};

export default function WhiteLabelForm({ mode, id, defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const vals = { ...DEFAULTS, ...defaultValues };

  const [form, setForm] = useState<WhiteLabelFormData>(vals);

  function set<K extends keyof WhiteLabelFormData>(key: K, value: WhiteLabelFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = mode === "create"
        ? await createWhiteLabel(form)
        : await updateWhiteLabel(id!, form);

      if (result?.error) setError(result.error);
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Basis-Info ─────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basis-Informationen</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Organisation *</label>
            <input
              className={inputCls}
              value={form.organisation}
              onChange={e => set("organisation", e.target.value)}
              placeholder="z.B. AOK Bayern"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Slug * <span className="text-gray-400 font-normal">(URL-Kennung)</span></label>
            <input
              className={inputCls}
              value={form.slug}
              onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="z.B. aok-bayern"
              pattern="[a-z0-9-]+"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Domain <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className={inputCls}
              value={form.domain}
              onChange={e => set("domain", e.target.value)}
              placeholder="z.B. pflege.aok.de"
              type="text"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="aktiv"
              type="checkbox"
              checked={form.aktiv}
              onChange={e => set("aktiv", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="aktiv" className="text-sm font-medium text-gray-700">
              Partner aktiv (öffentlich sichtbar)
            </label>
          </div>
        </div>
      </section>

      {/* ── Branding ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Branding & Design</h2>

        <div className="grid sm:grid-cols-3 gap-6">
          {(["color_primary", "color_secondary", "color_accent"] as const).map(key => (
            <div key={key}>
              <label className={labelCls}>
                {key === "color_primary" ? "Primärfarbe" : key === "color_secondary" ? "Sekundärfarbe" : "Akzentfarbe"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="h-10 w-14 rounded-lg cursor-pointer border border-gray-300"
                />
                <input
                  className={inputCls}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  pattern="#[0-9a-fA-F]{6}"
                  placeholder="#2563eb"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-xs">
          <label className={labelCls}>Schriftart</label>
          <select
            className={inputCls}
            value={form.font_family}
            onChange={e => set("font_family", e.target.value)}
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Live preview */}
        <div
          className="rounded-xl p-4 text-white text-sm font-medium flex items-center gap-3"
          style={{ background: form.color_primary, fontFamily: `'${form.font_family}', Inter, sans-serif` }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: form.color_secondary }}
          >
            {(form.organisation || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div>{form.organisation || "Vorschau"}</div>
            <div className="text-xs opacity-75" style={{ color: form.color_accent }}>●  Portal aktiv</div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Feature-Flags</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(Object.keys(FEATURE_LABELS) as Array<keyof typeof FEATURE_LABELS>).map(key => {
            const formKey = `feature_${key}` as keyof WhiteLabelFormData;
            return (
              <label key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[formKey] as boolean}
                  onChange={e => set(formKey, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">{FEATURE_LABELS[key]}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ── Kontakt & Rechtliches ──────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Kontakt & Rechtliches</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Support-E-Mail</label>
            <input className={inputCls} type="email" value={form.support_email}
              onChange={e => set("support_email", e.target.value)} placeholder="pflege@example.de" />
          </div>
          <div>
            <label className={labelCls}>Support-Telefon</label>
            <input className={inputCls} type="tel" value={form.support_tel}
              onChange={e => set("support_tel", e.target.value)} placeholder="0800 123 456" />
          </div>
          <div>
            <label className={labelCls}>Impressum URL</label>
            <input className={inputCls} type="url" value={form.impressum_url}
              onChange={e => set("impressum_url", e.target.value)} placeholder="https://example.de/impressum" />
          </div>
          <div>
            <label className={labelCls}>Datenschutz URL</label>
            <input className={inputCls} type="url" value={form.datenschutz_url}
              onChange={e => set("datenschutz_url", e.target.value)} placeholder="https://example.de/datenschutz" />
          </div>
        </div>
      </section>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Speichern…" : mode === "create" ? "Partner erstellen" : "Änderungen speichern"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/white-label")}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
