/**
 * JSON-LD Structured Data components for Schema.org markup.
 * These render as <script type="application/ld+json"> in the <head>.
 */

interface LocalBusinessProps {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  telephone?: string | null;
  email?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string;
  };
  geo?: {
    lat: number;
    lng: number;
  };
  image?: string | null;
  priceRange?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  openingHours?: string[];
  serviceType?: string[];
}

export function LocalBusinessJsonLd({
  id,
  name,
  description,
  url,
  telephone,
  email,
  address,
  geo,
  image,
  priceRange,
  aggregateRating,
  openingHours,
  serviceType,
}: LocalBusinessProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name,
    url,
  };

  if (description) schema.description = description;
  if (telephone) schema.telephone = telephone;
  if (email) schema.email = email;
  if (image) schema.image = image;
  if (priceRange) schema.priceRange = priceRange;
  if (openingHours?.length) schema.openingHoursSpecification = openingHours;

  if (address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: address.street ?? undefined,
      addressLocality: address.city ?? undefined,
      postalCode: address.postalCode ?? undefined,
      addressCountry: address.country ?? "DE",
    };
  }

  if (geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lng,
    };
  }

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (serviceType?.length) {
    schema.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Leistungen",
      itemListElement: serviceType.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s },
      })),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http")
        ? item.href
        : `https://xcare.de${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "xcare",
    url: "https://xcare.de",
    description: "Digitales Pflege-Ökosystem für Deutschland – KI-Lotse, Anbietersuche und Fallmanagement",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://xcare.de/suche?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "xcare",
      url: "https://xcare.de",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
