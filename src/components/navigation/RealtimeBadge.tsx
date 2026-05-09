"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeBadgeProps {
  anbieterIdOrFamilieId: string;
  role: "anbieter" | "familie";
  initialCount: number;
}

export function useRealtimeAnfragenCount(props: RealtimeBadgeProps | null): number {
  const [count, setCount] = useState(props?.initialCount ?? 0);
  const supabase = createClient();

  useEffect(() => {
    if (!props) return;
    const { anbieterIdOrFamilieId, role, initialCount } = props;
    setCount(initialCount);

    const column = role === "anbieter" ? "anbieter_id" : "familie_id";

    const channel = supabase
      .channel(`anfragen-realtime-${anbieterIdOrFamilieId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anfragen",
          filter: `${column}=eq.${anbieterIdOrFamilieId}`,
        },
        () => {
          setCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "anfragen",
          filter: `${column}=eq.${anbieterIdOrFamilieId}`,
        },
        (payload) => {
          if (role === "anbieter") {
            const wasOffen = payload.old?.status === "offen";
            const isOffen = payload.new?.status === "offen";
            if (wasOffen && !isOffen) setCount((c) => Math.max(0, c - 1));
            if (!wasOffen && isOffen) setCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.anbieterIdOrFamilieId, props?.role]);

  return count;
}
