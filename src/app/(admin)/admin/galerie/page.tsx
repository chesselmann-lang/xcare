import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Images, Building2, Calendar, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { GalerieDeleteAction } from "./GalerieDeleteAction";

export const metadata = { title: "Galerie-Moderation — xcare Admin" };

const PAGE_SIZE = 30;

export default async function GalerieModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; anbieter?: string }>;
}) {
  const { page: pageStr = "1", anbieter: anbieterFilter = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  const adminEmail = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
  if (adminProfile?.role !== "admin" && user.email !== adminEmail) redirect("/");

  // Build query
  let query = supabase
    .from("anbieter_galerie")
    .select("id, storage_pfad, alt_text, position, created_at, anbieter_id, anbieter:anbieter_id(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (anbieterFilter) {
    // filter by anbieter name (text search in anbieter table)
    const { data: matchingAnbieter } = await supabase
      .from("anbieter")
      .select("id")
      .ilike("name", `%${anbieterFilter}%`);
    const ids = matchingAnbieter?.map((a) => a.id) ?? [];
    if (ids.length > 0) query = query.in("anbieter_id", ids);
    else query = query.eq("anbieter_id", "00000000-0000-0000-0000-000000000000"); // no match
  }

  const { data: bilder, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Images className="h-6 w-6 text-[--primary]" />
            Galerie-Moderation
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            {count ?? 0} Bilder insgesamt · Seite {page} von {Math.max(1, totalPages)}
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="mb-6 flex gap-2">
        <input
          type="text"
          name="anbieter"
          defaultValue={anbieterFilter}
          placeholder="Nach Anbieter filtern…"
          className="flex-1 rounded-lg border border-[--border] bg-[--card] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
        />
        <Button type="submit" size="sm">Filtern</Button>
        {anbieterFilter && (
          <Link href="/admin/galerie">
            <Button variant="outline" size="sm">Zurücksetzen</Button>
          </Link>
        )}
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Images className="h-5 w-5 text-[--primary]" />
            <div>
              <p className="text-xs text-[--muted-foreground]">Bilder gesamt</p>
              <p className="text-xl font-bold">{count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gallery Grid */}
      {!bilder || bilder.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <Images className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Keine Bilder gefunden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bilder.map((bild) => {
            const anbieter = bild.anbieter as { id: string; name: string } | null;
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/anbieter-galerie/${bild.storage_pfad}`;

            return (
              <Card key={bild.id} className="overflow-hidden">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={publicUrl}
                    alt={bild.alt_text ?? "Galerie-Bild"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={() => {}}
                  />
                </div>
                <CardContent className="p-4 space-y-2">
                  {/* Anbieter */}
                  {anbieter && (
                    <Link
                      href={`/admin/anbieter?search=${encodeURIComponent(anbieter.name)}`}
                      className="flex items-center gap-1.5 text-sm font-medium hover:text-[--primary] transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[--muted-foreground]" />
                      {anbieter.name}
                    </Link>
                  )}

                  {/* Alt text */}
                  {bild.alt_text && (
                    <p className="text-xs text-[--muted-foreground] italic truncate">
                      {bild.alt_text}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                      <Calendar className="h-3 w-3" />
                      {formatDate(bild.created_at)}
                    </span>
                    <GalerieDeleteAction
                      bildId={bild.id}
                      storagePfad={bild.storage_pfad}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <Link href={`/admin/galerie?page=${page - 1}${anbieterFilter ? `&anbieter=${anbieterFilter}` : ""}`}>
              <Button variant="outline" size="sm">← Zurück</Button>
            </Link>
          )}
          <span className="text-sm text-[--muted-foreground]">
            Seite {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/galerie?page=${page + 1}${anbieterFilter ? `&anbieter=${anbieterFilter}` : ""}`}>
              <Button variant="outline" size="sm">Weiter →</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
