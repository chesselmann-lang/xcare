import { SprachassistentClient } from "@/components/sprachassistent/SprachassistentClient";

export default function SprachassistentPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Sprachassistent</h1>
      <p className="text-gray-500 mb-6">Steuern Sie xcare per Stimme — für Menschen mit eingeschränkter Mobilität.</p>
      <SprachassistentClient />
    </div>
  );
}
