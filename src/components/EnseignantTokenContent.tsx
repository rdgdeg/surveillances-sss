import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnseignantTokenContent({ token }: { token?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examens, setExamens] = useState<any[]>([]);

  useEffect(() => {
    const fetchExamens = async () => {
      if (!token) {
        setError("Lien invalide.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("examens")
        .select("*")
        .eq("lien_enseignant_token", token)
        .order("date_examen")
        .order("heure_debut");

      if (error) {
        setError("Erreur lors du chargement : " + error.message);
        setExamens([]);
      } else if (!data || data.length === 0) {
        setError("Aucun examen associé à ce lien. Vérifiez votre lien ou contactez le support.");
        setExamens([]);
      } else {
        setExamens(data);
      }
      setLoading(false);
    };

    fetchExamens();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-10 gap-2">
        <Loader2 className="animate-spin w-10 h-10 text-blue-700" />
        <div>Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Cas : tous les examens déjà confirmés par l’enseignant
  const allConfirmed = examens.every((ex: any) => ex.besoins_confirmes_par_enseignant);

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Vos examens à confirmer</CardTitle>
          <CardDescription>
            Liste des examens rattachés à ce lien de confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allConfirmed ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <div className="text-green-700 font-bold">Tous vos besoins ont déjà été confirmés.<br />Merci !</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Examen</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examens.map((examen: any) => (
                  <TableRow key={examen.id}>
                    <TableCell>
                      <div className="font-semibold">{examen.matiere || "-"}</div>
                      <div className="text-xs text-gray-500">{examen.code_examen}</div>
                    </TableCell>
                    <TableCell>
                      {examen.date_examen}
                    </TableCell>
                    <TableCell>
                      {examen.heure_debut?.slice(0, 5)} - {examen.heure_fin?.slice(0, 5)}
                    </TableCell>
                    <TableCell>{examen.salle}</TableCell>
                    <TableCell>
                      {examen.besoins_confirmes_par_enseignant ? (
                        <Badge variant="default">Confirmé</Badge>
                      ) : (
                        <Badge variant="destructive">À confirmer</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Optionnel: bouton retour page d’accueil */}
      <div className="flex justify-center pt-6">
        <Button asChild variant="outline">
          <a href="/">Retour à l'accueil</a>
        </Button>
      </div>
    </div>
  );
}
