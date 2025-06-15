import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import * as XLSX from 'xlsx';

interface Candidature {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: string;
  statut_autre: string;
  traite: boolean;
  created_at: string;
  candidats_disponibilites: Array<{
    examen_id: string;
    est_disponible: boolean;
    examens: {
      date_examen: string;
      heure_debut: string;
      heure_fin: string;
      matiere: string;
      salle: string;
    };
  }>;
}

export const CandidaturesManager = () => {
  const { data: activeSession } = useActiveSession();

  const { data: candidatures, isLoading } = useQuery({
    queryKey: ['candidatures', activeSession?.id],
    queryFn: async (): Promise<Candidature[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('candidats_surveillance')
        .select(`
          *,
          candidats_disponibilites (
            examen_id,
            est_disponible,
            examens (
              date_examen,
              heure_debut,
              heure_fin,
              matiere,
              salle
            )
          )
        `)
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const exportToExcel = () => {
    if (!candidatures || candidatures.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune candidature à exporter.",
        variant: "destructive"
      });
      return;
    }

    // Préparer les données pour l'export
    const exportData = candidatures.flatMap(candidat => {
      if (candidat.candidats_disponibilites && candidat.candidats_disponibilites.length > 0) {
        return candidat.candidats_disponibilites.map(dispo => ({
          'Nom': candidat.nom,
          'Prénom': candidat.prenom,
          'Email': candidat.email,
          'Téléphone': candidat.telephone || '',
          'Statut': candidat.statut,
          'Statut Autre': candidat.statut_autre || '',
          'Date Examen': dispo.examens?.date_examen || '',
          'Heure Début': dispo.examens?.heure_debut || '',
          'Heure Fin': dispo.examens?.heure_fin || '',
          'Matière': dispo.examens?.matiere || '',
          'Salle': dispo.examens?.salle || '',
          'Disponible': dispo.est_disponible ? 'Oui' : 'Non',
          'Traité': candidat.traite ? 'Oui' : 'Non',
          'Date Candidature': new Date(candidat.created_at).toLocaleDateString('fr-FR')
        }));
      } else {
        return [{
          'Nom': candidat.nom,
          'Prénom': candidat.prenom,
          'Email': candidat.email,
          'Téléphone': candidat.telephone || '',
          'Statut': candidat.statut,
          'Statut Autre': candidat.statut_autre || '',
          'Date Examen': '',
          'Heure Début': '',
          'Heure Fin': '',
          'Matière': '',
          'Salle': '',
          'Disponible': '',
          'Traité': candidat.traite ? 'Oui' : 'Non',
          'Date Candidature': new Date(candidat.created_at).toLocaleDateString('fr-FR')
        }];
      }
    });

    // Créer le workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidatures");

    // Télécharger le fichier
    const fileName = `candidatures_surveillance_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `${candidatures.length} candidatures exportées vers ${fileName}`,
    });
  };

  const markAsProcessed = async (candidatId: string) => {
    const { error } = await supabase
      .from('candidats_surveillance')
      .update({ traite: true })
      .eq('id', candidatId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme traité.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succès",
        description: "Candidature marquée comme traitée.",
      });
    }
  };

  if (!activeSession) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Aucune session active. Activez une session pour voir les disponibilités envoyées.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Disponibilités envoyées</span>
            </div>
            <Button onClick={exportToExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - {candidatures?.length || 0} formulaire(s) reçu(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Chargement...</p>
          ) : candidatures && candidatures.length > 0 ? (
            <div className="space-y-4">
              {candidatures.map((candidat) => (
                <Card key={candidat.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {candidat.nom} {candidat.prenom}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={candidat.traite ? "default" : "secondary"}>
                          {candidat.traite ? "Traité" : "En attente"}
                        </Badge>
                        {!candidat.traite && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsProcessed(candidat.id)}
                          >
                            Marquer comme traité
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {candidat.email}</p>
                      <p>Téléphone: {candidat.telephone || 'Non renseigné'}</p>
                      <p>Statut: {candidat.statut} {candidat.statut_autre && `(${candidat.statut_autre})`}</p>
                      <p>Date candidature: {new Date(candidat.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-2">Disponibilités:</h4>
                    {candidat.candidats_disponibilites && candidat.candidats_disponibilites.length > 0 ? (
                      <div className="grid gap-2">
                        {candidat.candidats_disponibilites.map((dispo, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded">
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Disponible
                            </Badge>
                            <span>{dispo.examens?.date_examen}</span>
                            <span>{dispo.examens?.heure_debut} - {dispo.examens?.heure_fin}</span>
                            <span>{dispo.examens?.matiere}</span>
                            <span className="text-muted-foreground">({dispo.examens?.salle})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucune disponibilité renseignée</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Aucune disponibilité envoyée pour cette session.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
