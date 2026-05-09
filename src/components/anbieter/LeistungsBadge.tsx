import {
  Heart, Building2, Sun, Clock, MessageSquare, Gift,
  Activity, Home, Baby, Users, HandHeart, Flower2,
  Ribbon, MoreHorizontal,
} from "lucide-react";

const KATEGORIE_ICON: Record<string, React.ElementType> = {
  pflege_ambulant: Heart,
  pflege_stationaer: Building2,
  tagespflege: Sun,
  kurzzeitpflege: Clock,
  beratung: MessageSquare,
  foerderung: Gift,
  therapie: Activity,
  haushaltshilfe: Home,
  kinderbetreuung: Baby,
  jugendhilfe: Users,
  eingliederungshilfe: HandHeart,
  hospizdienst: Flower2,
  trauerhilfe: Ribbon,
  sonstiges: MoreHorizontal,
};

const KATEGORIE_LABEL: Record<string, string> = {
  pflege_ambulant: "Ambulante Pflege",
  pflege_stationaer: "Stationäre Pflege",
  tagespflege: "Tagespflege",
  kurzzeitpflege: "Kurzzeitpflege",
  beratung: "Beratung",
  foerderung: "Förderung",
  therapie: "Therapie",
  haushaltshilfe: "Haushaltshilfe",
  kinderbetreuung: "Kinderbetreuung",
  jugendhilfe: "Jugendhilfe",
  eingliederungshilfe: "Eingliederungshilfe",
  hospizdienst: "Hospizdienst",
  trauerhilfe: "Trauerhilfe",
  sonstiges: "Sonstiges",
};

const KATEGORIE_COLOR: Record<string, string> = {
  pflege_ambulant: "bg-rose-50 text-rose-700 border-rose-200",
  pflege_stationaer: "bg-red-50 text-red-700 border-red-200",
  tagespflege: "bg-orange-50 text-orange-700 border-orange-200",
  kurzzeitpflege: "bg-amber-50 text-amber-700 border-amber-200",
  beratung: "bg-blue-50 text-blue-700 border-blue-200",
  foerderung: "bg-purple-50 text-purple-700 border-purple-200",
  therapie: "bg-teal-50 text-teal-700 border-teal-200",
  haushaltshilfe: "bg-lime-50 text-lime-700 border-lime-200",
  kinderbetreuung: "bg-pink-50 text-pink-700 border-pink-200",
  jugendhilfe: "bg-indigo-50 text-indigo-700 border-indigo-200",
  eingliederungshilfe: "bg-cyan-50 text-cyan-700 border-cyan-200",
  hospizdienst: "bg-violet-50 text-violet-700 border-violet-200",
  trauerhilfe: "bg-slate-50 text-slate-600 border-slate-200",
  sonstiges: "bg-gray-50 text-gray-600 border-gray-200",
};

interface LeistungsBadgeProps {
  kategorie: string;
  size?: "sm" | "md";
}

export function LeistungsBadge({ kategorie, size = "sm" }: LeistungsBadgeProps) {
  const Icon = KATEGORIE_ICON[kategorie] ?? MoreHorizontal;
  const label = KATEGORIE_LABEL[kategorie] ?? kategorie;
  const color = KATEGORIE_COLOR[kategorie] ?? "bg-gray-50 text-gray-600 border-gray-200";

  if (size === "md") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${color}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

/** Renders a set of LeistungsBadges for a list of kategorie strings (deduped). */
export function LeistungsBadgeGroup({
  kategorien,
  max = 4,
  size = "sm",
}: {
  kategorien: string[];
  max?: number;
  size?: "sm" | "md";
}) {
  const unique = [...new Set(kategorien)];
  const visible = unique.slice(0, max);
  const rest = unique.length - max;

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((k) => (
        <LeistungsBadge key={k} kategorie={k} size={size} />
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
          +{rest} weitere
        </span>
      )}
    </div>
  );
}
