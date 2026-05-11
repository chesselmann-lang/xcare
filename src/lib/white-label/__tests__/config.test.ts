import { describe, it, expect } from "vitest";
import { generateCssVariables, DEFAULT_CONFIG, type WhiteLabelConfig } from "../config";

const AOK_CONFIG: WhiteLabelConfig = {
  id: "test-aok",
  slug: "aok",
  organisation: "AOK",
  logo_url: null,
  favicon_url: null,
  color_primary: "#006633",
  color_secondary: "#004d26",
  color_accent: "#00a64f",
  font_family: "Inter",
  features: {
    ki_lotse: true,
    anbieter_suche: true,
    pflegekrafte: true,
    traeger_portal: true,
    dokumente_tresor: true,
    chat: true,
  },
  impressum_url: "https://aok.de/impressum",
  datenschutz_url: "https://aok.de/datenschutz",
  support_email: "pflege@aok.de",
  support_tel: null,
};

describe("generateCssVariables", () => {
  it("generiert gültige CSS-Custom-Properties", () => {
    const css = generateCssVariables(AOK_CONFIG);
    expect(css).toContain("--primary: #006633");
    expect(css).toContain("--primary-dark: #004d26");
    expect(css).toContain("--accent: #00a64f");
    expect(css).toContain("--wl-font:");
  });

  it("enthält :root Selektor", () => {
    const css = generateCssVariables(AOK_CONFIG);
    expect(css).toContain(":root");
  });

  it("primary-light enthält 20% Opacity-Suffix", () => {
    const css = generateCssVariables(AOK_CONFIG);
    expect(css).toContain("--primary-light: #00663320");
  });

  it("funktioniert mit DEFAULT_CONFIG", () => {
    const css = generateCssVariables(DEFAULT_CONFIG);
    expect(css).toContain("--primary: #2563eb");
    expect(css).toContain("--wl-font: 'Inter'");
  });

  it("escaped Font-Family korrekt in CSS", () => {
    const config = { ...AOK_CONFIG, font_family: "Open Sans" };
    const css = generateCssVariables(config);
    expect(css).toContain("'Open Sans'");
  });
});

describe("DEFAULT_CONFIG", () => {
  it("hat alle Pflicht-Felder", () => {
    expect(DEFAULT_CONFIG.id).toBe("default");
    expect(DEFAULT_CONFIG.slug).toBe("xcare");
    expect(DEFAULT_CONFIG.color_primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_CONFIG.color_secondary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_CONFIG.color_accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("hat alle Features aktiviert", () => {
    const features = DEFAULT_CONFIG.features;
    expect(features.ki_lotse).toBe(true);
    expect(features.anbieter_suche).toBe(true);
    expect(features.chat).toBe(true);
  });

  it("hat gültige Support-E-Mail", () => {
    expect(DEFAULT_CONFIG.support_email).toMatch(/@/);
  });
});
