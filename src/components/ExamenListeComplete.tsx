
import { useActiveSession } from "@/hooks/useSessions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

function formatHeure(heure: string | null) {
  if (!heure) return "-";
  return heure.slice(0, 5);
}

function getDuration(heureDebut: string, heureFin: string) {
  if (!heureDebut || !heureFin) return "-";
  const [h1, m1] = heureDebut.split(":").map(Number);
  const [h2, m2] = heureFin.split(":").map(Number);
  let min1 = h1 * 60 + m1, min2 = h2 * 60 + m2;
  let d = min2 - min1;
  if (d < 0) d += 24 * 60;
  return `${Math.floor(d / 60)}h${(d % 60).toString().padStart(2, '0')}`;
}

function searchAllFields(exam: any, q: string) {
  const flat = [
    exam.code_examen,
    exam.matiere,
    exam.date_examen,
    exam.heure_debut,
    exam.heure_fin,
    exam.salle,
    exam.nombre_surveillants?.toString?.(),
    exam.enseignant_nom,
    exam.enseignant_email
  ];
  return flat.some(v => v && v.toLowerCase().includes(q));
}

export function ExamenListeComplete() {
  const { data: activeSession } = useActiveSession();
  const [search, setSearch] = useState("");
  // Récupérer TOUS les examens de la session active !
  const { data, isLoading } = useQuery({
    queryKey: ["examens-all", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from("examens")
        .select("id,code_examen,matiere,date_examen,heure_debut,heure_fin,salle,nombre_surveillants,statut_validation,enseignant_nom,enseignant_email")
        .eq("session_id", activeSession.id)
        .order("date_examen", { ascending: true })
        .order("heure_debut", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id,
  });

  const examens = useMemo(() => {
    if (!search.trim()) return data || [];
    const q = search.trim().toLowerCase();
    return (data || []).filter(exam => searchAllFields(exam, q));
  }, [data, search]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center max-w-lg gap-2 mb-2">
        <Search className="h-5 w-5 text-gray-500 shrink-0" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Recherche par code, matière, date, auditoire..."
          className="w-full"
        />
        <span className="ml-3 text-xs text-gray-500">{examens.length} résultat(s)</span>
      </div>
      <div className="overflow-auto border rounded bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead>Date</TableHead>
              <TableHead>Créneau</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Code examen</TableHead>
              <TableHead>Matière</TableHead>
              <TableHead>Auditoire(s)</TableHead>
              <TableHead>Surveillants requis</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8}>Chargement...</TableCell></TableRow>
            ) : examens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Aucun examen trouvé</TableCell>
              </TableRow>
            ) : (
              examens.map((exam: any) => (
                <TableRow key={exam.id}>
                  <TableCell>{exam.date_examen}</TableCell>
                  <TableCell>
                    {formatHeure(exam.heure_debut)} - {formatHeure(exam.heure_fin)}
                  </TableCell>
                  <TableCell>
                    {exam.heure_debut && exam.heure_fin ? getDuration(exam.heure_debut, exam.heure_fin) : "-"}
                  </TableCell>
                  <TableCell className="font-mono">{exam.code_examen || "-"}</TableCell>
                  <TableCell>{exam.matiere || "-"}</TableCell>
                  <TableCell>{exam.salle || "-"}</TableCell>
                  <TableCell className="text-center font-bold">{exam.nombre_surveillants ?? "-"}</TableCell>
                  <TableCell>
                    <span className={
                      exam.statut_validation === "VALIDE"
                        ? "text-emerald-600 font-semibold"
                        : exam.statut_validation === "REJETE"
                        ? "text-red-600 font-semibold"
                        : "text-gray-500 font-medium"
                    }>
                      {exam.statut_validation}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-gray-400">
        La colonne "Nombre surveillants" correspond à la contrainte définie par auditoire.<br />
        Vue lecture seule complète pour tous les examens importés de la session.
      </div>
    </div>
  );
}

export default ExamenListeComplete;
