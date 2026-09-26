"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { resolveOwnedStore } from "@/lib/current-store";

export default function StoreRedirectPage() {
  const router = useRouter();
  const { data: store, isLoading } = useQuery({
    queryKey: ["store-redirect"],
    queryFn: () => resolveOwnedStore(),
  });

  useEffect(() => {
    if (isLoading) return;
    if (store?.id) {
      router.replace(`/dashboard/store/${store.id}`);
      return;
    }
    router.replace("/dashboard/create-store");
  }, [isLoading, store?.id, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}
