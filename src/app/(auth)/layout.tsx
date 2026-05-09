import { Heart } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 bg-[--muted]">
      <Link href="/" className="flex items-center gap-2 font-bold text-[--primary] mb-8">
        <Heart className="h-6 w-6 fill-[--primary]" />
        <span className="text-2xl">xcare</span>
      </Link>
      {children}
    </div>
  );
}
