"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GitFork, Loader2 } from "lucide-react";

export function AddRepoForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/repos/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al agregar el repositorio");
    } else {
      router.push(`/repos/${data.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          URL del repositorio GitHub
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <GitFork className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              required
            />
          </div>
          <Button type="submit" disabled={loading || !url}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs text-muted-foreground">
        Se va a obtener metadata de la GitHub API (nombre, descripción, estrellas, lenguaje).
        El score y el análisis IA no se generan para repos manuales.
      </p>
    </form>
  );
}
