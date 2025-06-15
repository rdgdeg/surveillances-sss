
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SurveillantRes {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  quota: number;
}

interface DispoRes {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  commentaire_surveillance_obligatoire: string | null;
  nom_examen_obligatoire: string | null;
}

export function SuiviDisponibilitesAdmin() {
  const [surveillants, setSurveillants] = useState<SurveillantRes[]>([]);
  const [dispos, setDispos] = useState<DispoRes[]>([]);

  useEffect(() => {
    supabase
      .from("surveillants")
      .select("id,nom,prenom,email,type")
      .then(async ({ data, error }) => {
        if (data) {
          // Cherche quotas pour chaque surveillant dans cette session
          const res: SurveillantRes[] = [];
          for (const s of data) {
            const { data: session } = await supabase
              .from("surveillant_sessions")
              .select("quota")
              .eq("surveillant_id", s.id)
              .eq("is_active", true)
              .maybeSingle();
            res.push({ ...s, quota: session?.quota || 0 });
          }
          setSurveillants(res);
        }
      });

    supabase
      .from("disponibilites")
      .select("*")
      .then(({ data }) => setDispos(data || []));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Suivi des disponibilités surveillants</CardTitle>
          <CardDescription>Vue d’ensemble : qui a répondu, combien de créneaux, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surveillant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>Créneaux remplis</TableHead>
                <TableHead>Obligatoires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveillants.map(s => {
                const disp = dispos.filter(d => d.surveillant_id === s.id && d.est_disponible);
                const countDispo = disp.length;
                const countOblig = disp.filter(d => d.commentaire_surveillance_obligatoire).length;
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.nom} {s.prenom}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell><Badge>{s.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.quota}</Badge>
                    </TableCell>
                    <TableCell>{countDispo}</TableCell>
                    <TableCell>
                      <Badge variant={countOblig ? "default" : "outline"}>{countOblig}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
