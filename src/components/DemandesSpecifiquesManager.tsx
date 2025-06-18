
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, AlertTriangle, Search, Calendar, Clock, User, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface DemandeSpecifique {
  id: string;
  surveillant_id: string;
  surveillant_nom: string;
  surveillant_prenom: string;
  surveillant_email: string;
  surveillant_type: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  nom_examen_obligatoire: string;
  commentaire_surveillance_obligatoire: string;
  created_at: string;
}

export const DemandesSpecifiquesManager = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Récupérer toutes les demandes spécifiques (surveillances obligatoires)
  const { data: demandesSpecifiques = [], isLoading } = useQuery({
    queryKey: ['demandes-specifiques', activeSession?.id],
    queryFn: async (): Promise<DemandeSpecifique[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select(`
          *,
          surveillants!inner (
            nom,
            prenom,
            email,
            type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true)
        .eq('type_choix', 'obligatoire')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        surveillant_id: item.surveillant_id,
        surveillant_nom: item.surveillants.nom,
        surveillant_prenom: item.surveillants.prenom,
        surveillant_email: item.surveillants.email,
        surveillant_type: item.surveillants.type,
        date_examen: item.date_examen,
        heure_debut: item.heure_debut,
        heure_fin: item.heure_fin,
        nom_examen_obligatoire: item.nom_examen_obligatoire || '',
        commentaire_surveillance_obligatoire: item.commentaire_surveillance_obligatoire || '',
        created_at: item.created_at
      }));
    },
    enabled: !!activeSession?.id
  });

  // Filtrer les demandes
  const filteredDemandes = demandesSpecifiques.filter(demande => {
    const matchSearch = searchTerm === "" || 
      demande.surveillant_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.surveillant_prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.surveillant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.nom_examen_obligatoire.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (demande.commentaire_surveillance_obligatoire && 
       demande.commentaire_surveillance_obligatoire.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchSearch;
  });

  // Statistiques
  const stats = {
    total: demandesSpecifiques.length,
    avecCode: demandesSpecifiques.filter(d => d.nom_examen_obligatoire).length,
    avecCommentaire: demandesSpecifiques.filter(d => d.commentaire_surveillance_obligatoire).length,
    surveillantsUniques: new Set(demandesSpecifiques.map(d => d.surveillant_id)).size
  };

  // Grouper par surveillant
  const demandesParSurveillant = demandesSpecifiques.reduce((acc: Record<string, DemandeSpecifique[]>, demande) => {
    const key = demande.surveillant_id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(demande);
    return acc;
  }, {});

  // Exporter vers Excel
  const exportToExcel = () => {
    if (demandesSpecifiques.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune demande spécifique à exporter.",
        variant: "destructive"
      });
      return;
    }

    const exportData = demandesSpecifiques.map(demande => ({
      'Nom': demande.surveillant_nom,
      'Prénom': demande.surveillant_prenom,
      'Email': demande.surveillant_email,
      'Type': demande.surveillant_type,
      'Date': formatDateBelgian(demande.date_examen),
      'Horaire': formatTimeRange(demande.heure_debut, demande.heure_fin),
      'Code Examen': demande.nom_examen_obligatoire || '-',
      'Commentaire': demande.commentaire_surveillance_obligatoire || '-',
      'Date Demande': new Date(demande.created_at).toLocaleDateString('fr-FR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Demandes Spécifiques");

    const fileName = `demandes_specifiques_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `${demandesSpecifiques.length} demandes exportées vers ${fileName}`,
    });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir les demandes spécifiques.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="by-surveillant" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Par surveillant</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total demandes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.avecCode}</div>
                  <div className="text-sm text-gray-600">Avec code examen</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.avecCommentaire}</div>
                  <div className="text-sm text-gray-600">Avec commentaire</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.surveillantsUniques}</div>
                  <div className="text-sm text-gray-600">Surveillants</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Demandes de surveillance obligatoire</span>
                </div>
                <Button onClick={exportToExcel} className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exporter Excel</span>
                </Button>
              </CardTitle>
              <CardDescription>
                Session {activeSession.name} - Liste des surveillances obligatoires demandées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtres */}
              <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, email, code examen ou commentaire..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Tableau des demandes */}
              {isLoading ? (
                <p>Chargement...</p>
              ) : filteredDemandes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surveillant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date/Horaire</TableHead>
                        <TableHead>Code Examen</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead>Date demande</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDemandes.map((demande) => (
                        <TableRow key={demande.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {demande.surveillant_prenom} {demande.surveillant_nom}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {demande.surveillant_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{demande.surveillant_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{formatDateBelgian(demande.date_examen)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{formatTimeRange(demande.heure_debut, demande.heure_fin)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {demande.nom_examen_obligatoire ? (
                              <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                                {demande.nom_examen_obligatoire}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {demande.commentaire_surveillance_obligatoire ? (
                              <div className="text-sm bg-gray-50 p-2 rounded border">
                                {demande.commentaire_surveillance_obligatoire}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Aucune demande spécifique trouvée pour les critères sélectionnés.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="by-surveillant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Demandes groupées par surveillant</span>
              </CardTitle>
              <CardDescription>
                Vue organisée par surveillant avec toutes leurs demandes spécifiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(demandesParSurveillant).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(demandesParSurveillant).map(([surveillantId, demandes]) => {
                    const surveillant = demandes[0]; // Pour récupérer les infos du surveillant
                    return (
                      <Card key={surveillantId} className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {surveillant.surveillant_prenom} {surveillant.surveillant_nom}
                              </CardTitle>
                              <CardDescription>{surveillant.surveillant_email}</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{surveillant.surveillant_type}</Badge>
                              <Badge variant="secondary">{demandes.length} demande{demandes.length > 1 ? 's' : ''}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {demandes.map((demande) => (
                              <div key={demande.id} className="p-3 bg-gray-50 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4 text-gray-500" />
                                      <span className="font-medium">{formatDateBelgian(demande.date_examen)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4 text-gray-500" />
                                      <span>{formatTimeRange(demande.heure_debut, demande.heure_fin)}</span>
                                    </div>
                                  </div>
                                  {demande.nom_examen_obligatoire && (
                                    <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                                      {demande.nom_examen_obligatoire}
                                    </span>
                                  )}
                                </div>
                                {demande.commentaire_surveillance_obligatoire && (
                                  <div className="mt-2 p-2 bg-white rounded border">
                                    <div className="flex items-center space-x-1 mb-1">
                                      <FileText className="h-3 w-3 text-gray-500" />
                                      <span className="text-xs font-medium text-gray-600">Commentaire :</span>
                                    </div>
                                    <p className="text-sm">{demande.commentaire_surveillance_obligatoire}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Aucune demande spécifique trouvée.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
