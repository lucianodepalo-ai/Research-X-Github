import { AddRepoForm } from "@/components/repos/AddRepoForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewRepoPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/repos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Biblioteca
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold mono text-primary">Agregar Repositorio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega un repo de GitHub manualmente a tu biblioteca
        </p>
      </div>

      <AddRepoForm />
    </div>
  );
}
