
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
    exam.jour,
    exam.duree,
    exam.heure_debut,
    exam.heure_fin,
    exam.activite,
    exam.faculte,
    exam.code_examen,
    exam.salle,
    exam.etudiants,
    exam.enseignants
  ];
  return flat.some(v => v && v.toString().toLowerCase().includes(q));
}

export function ExamenListeComplete() {
  const { data: activeSession } = useActiveSession();
  const [search, setSearch] = useState("");
  // On suppose que toutes les colonnes nécessaires sont présentes dans la table examens
  const { data, isLoading } = useQuery({
    queryKey: ["examens-all", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from("examens")
        .select(`
          id,
          date_examen,
          heure_debut,
          heure_fin,
          matiere,
          faculte,
          code_examen,
          salle,
          nombre_surveillants,
          etudiants,
          enseignants,
          activite,
          duree
        `)
        .eq("session_id", activeSession.id)
        .order("date_examen", { ascending: true })
        .order("heure_debut", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id,
  });

  // Transformation : "Jour" et "duree"
  const examens = useMemo(() => {
    const examsArray = data || [];

    if (!search.trim()) {
      return examsArray;
    }
    const q = search.trim().toLowerCase();
    return examsArray.filter(exam => searchAllFields(exam, q));
  }, [data, search]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center max-w-lg gap-2 mb-2">
        <Search className="h-5 w-5 text-gray-500 shrink-0" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Recherche sur toutes les colonnes..."
          className="w-full"
        />
        <span className="ml-3 text-xs text-gray-500">{examens.length} résultat(s)</span>
      </div>
      <div className="overflow-auto border rounded bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead>Jour</TableHead>
              <TableHead>Durée (h)</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Activité</TableHead>
              <TableHead>Faculté / Secrétariat</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Auditoires</TableHead>
              <TableHead>Étudiants</TableHead>
              <TableHead>Enseignants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10}>Chargement...</TableCell>
              </TableRow>
            ) : examens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">Aucun examen trouvé</TableCell>
              </TableRow>
            ) : (
              examens.map((exam: any) => (
                <TableRow key={exam.id}>
                  <TableCell>{ exam.date_examen || "-" }</TableCell>
                  <TableCell>
                    {
                      typeof exam.duree === "number"
                        ? (exam.duree % 1 === 0 ? `${exam.duree}h` : `${Math.floor(exam.duree)}h${Math.round((exam.duree % 1) * 60).toString().padStart(2, '0')}`)
                        : exam.duree || (exam.heure_debut && exam.heure_fin ? getDuration(exam.heure_debut, exam.heure_fin) : "-")
                    }
                  </TableCell>
                  <TableCell>{ formatHeure(exam.heure_debut) }</TableCell>
                  <TableCell>{ formatHeure(exam.heure_fin) }</TableCell>
                  <TableCell>{ exam.activite || exam.matiere || "-" }</TableCell>
                  <TableCell>{ exam.faculte || "-" }</TableCell>
                  <TableCell className="font-mono">{ exam.code_examen || "-" }</TableCell>
                  <TableCell>{ exam.salle || "-" }</TableCell>
                  <TableCell>{ exam.etudiants || "-" }</TableCell>
                  <TableCell>{ exam.enseignants || "-" }</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-gray-400">
        Colonnes affichées : correspondance exacte à l'import Excel ({examens.length} examens affichés).
      </div>
    </div>
  );
}

export default ExamenListeComplete;
