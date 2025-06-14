
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";

export function PlanningGlobal() {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Charger tous les examens + surveillants attribués
  const { data: examens = [], isFetching } = useQuery({
    queryKey: ["examens-all-planning"],
    queryFn: async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("examens")
        .select(`
          *,
          attributions(
            id,
            surveillants (nom, prenom, email)
          )
        `)
        .order("date_examen")
        .order("heure_debut");
      setIsLoading(false);
      if (error) throw error;
      return data || [];
    },
  });

  // Traitement des filtres
  function filterExamens(examens: any[], search: string) {
    if (!search.trim()) return examens;
    const keyword = search.trim().toLowerCase();
    return examens.filter(ex => {
      // match surveillant nom/prenom/email ou matière/salle côté exam
      const surveillants = ex.attributions?.map((a: any) => a.surveillants) || [];
      const matchSurveillant = surveillants.some(
        (s: any) =>
          (s?.nom || "").toLowerCase().includes(keyword) ||
          (s?.prenom || "").toLowerCase().includes(keyword) ||
          (s?.email || "").toLowerCase().includes(keyword)
      );
      // Option : aussi filtrer sur matière et salle
      const matchMatiere = (ex.matiere || "").toLowerCase().includes(keyword);
      const matchSalle = (ex.salle || "").toLowerCase().includes(keyword);
      return matchSurveillant || matchMatiere || matchSalle;
    });
  }

  const filtered = filterExamens(examens, search);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning de surveillance – Vue globale
          </CardTitle>
          <CardDescription>
            Retrouvez tous les examens, salles, horaires et leurs surveillants attribués.<br />
            Utilisez la recherche pour filtrer sur un surveillant (nom, prénom ou email), une matière ou une salle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer par nom, email, matière ou salle..."
              className="w-full"
            />
          </div>
          {isFetching || isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Chargement du planning…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucun créneau trouvé avec les critères choisis.
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((examen: any) => (
                <div
                  key={examen.id}
                  className="p-4 border rounded-lg bg-white shadow hover:bg-blue-50 transition"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="min-w-fit">
                      {formatDateWithDayBelgian(examen.date_examen)}
                    </Badge>
                    <Badge variant="outline">{examen.heure_debut} – {examen.heure_fin}</Badge>
                    <Badge variant="secondary">{examen.salle}</Badge>
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold text-gray-800">{examen.matiere}</span>
                    {" "}
                    <span className="text-xs text-muted-foreground">({examen.type_requis})</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Surveillants :</span>
                    {examen.attributions && examen.attributions.length > 0 ? (
                      <ul className="flex flex-wrap gap-2 mt-1">
                        {examen.attributions.map((a: any, i: number) =>
                          a.surveillants ? (
                            <li key={i} className="px-2 py-1 bg-blue-50 rounded border border-blue-200 text-blue-900">
                              {a.surveillants.prenom} {a.surveillants.nom}
                              {a.surveillants.email && (
                                <span className="text-xs text-blue-600 ml-1">
                                  [{a.surveillants.email}]
                                </span>
                              )}
                            </li>
                          ) : null
                        )}
                      </ul>
                    ) : (
                      <span className="ml-2 text-gray-500 italic">Aucun surveillant attribué</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
