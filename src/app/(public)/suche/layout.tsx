import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anbieter suchen – Pflegedienste & Sozialleistungen | xcare",
  description:
    "Finden Sie geprüfte Pflegedienste, Tagespflege, Beratungsstellen und Sozialdienstleister in Ihrer Nähe. Kostenlose Suche nach PLZ – schnell, transparent und vergleichbar.",
  keywords: [
    "Pflegedienst suchen",
    "ambulante Pflege",
    "Tagespflege",
    "Pflegeberatung",
    "Sozialleistungen",
    "Eingliederungshilfe",
    "Jugendhilfe",
    "xcare",
  ],
  alternates: {
    canonical: "https://xcare.de/suche",
  },
  openGraph: {
    title: "Anbieter suchen – Pflegedienste & Sozialleistungen",
    description:
      "Geprüfte Pflegedienste, Beratungsstellen und Sozialdienstleister in Ihrer Nähe finden. Jetzt kostenlos per PLZ suchen.",
    url: "https://xcare.de/suche",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Anbieter suchen – xcare",
    description: "Geprüfte Pflegedienste und Sozialdienstleister in Ihrer Nähe.",
  },
};

export default function SucheLayout({ children }: { children: React.ReactNode }) {
  const searchActionSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Anbieter suchen",
    url: "https://xcare.de/suche",
    description:
      "Suche nach Pflegediensten, Beratungsstellen und Sozialleistungen in Deutschland",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://xcare.de/suche?plz={postal_code}&kategorie={service_category}",
      },
      "query-input": [
        "required name=postal_code",
        "optional name=service_category",
      ],
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: "https://xcare.de" },
        { "@type": "ListItem", position: 2, name: "Anbieter suchen", item: "https://xcare.de/suche" },
      ],
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pflegedienstleistungen in Deutschland",
    description: "Übersicht der verfügbaren Leistungskategorien auf xcare",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ambulante Pflege", item: "https://xcare.de/suche?kategorie=pflege_ambulant" },
      { "@type": "ListItem", position: 2, name: "Tagespflege", item: "https://xcare.de/suche?kategorie=tagespflege" },
      { "@type": "ListItem", position: 3, name: "Beratung", item: "https://xcare.de/suche?kategorie=beratung" },
      { "@type": "ListItem", position: 4, name: "Therapie", item: "https://xcare.de/suche?kategorie=therapie" },
      { "@type": "ListItem", position: 5, name: "Kinderbetreuung", item: "https://xcare.de/suche?kategorie=kinderbetreuung" },
      { "@type": "ListItem", position: 6, name: "Eingliederungshilfe", item: "https://xcare.de/suche?kategorie=eingliederungshilfe" },
      { "@type": "ListItem", position: 7, name: "Jugendhilfe", item: "https://xcare.de/suche?kategorie=jugendhilfe" },
      { "@type": "ListItem", position: 8, name: "Hospizdienst", item: "https://xcare.de/suche?kategorie=hospizdienst" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchActionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {children}
    </>
  );
}
