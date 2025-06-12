
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Search, User, Clock, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
}

interface Attribution {
  id: string;
  examen: {
    id: string;
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
    matiere: string;
    salle: string;
    type_requis: string;
  };
  session: {
    id: string;
    name: string;
    year: number;
    period: number;
  };
  is_pre_assigne: boolean;
  is_obligatoire: boolean;
}

const SurveillanceHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<Surveillant | null>(null);

  // Récupérer tous les surveillants
  const { data: surveillants, isLoading: loadingSurveillants } = useQuery({
    queryKey: ['surveillants-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .select('*')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data as Surveillant[];
    }
  });

  // Récupérer l'historique d'un surveillant spécifique
  const { data: attributions, isLoading: loadingAttributions } = useQuery({
    queryKey: ['attributions-history', selectedSurveillant?.id],
    queryFn: async () => {
      if (!selectedSurveillant) return [];
      
      const { data, error } = await supabase
        .from('attributions')
        .select(`
          id,
          is_pre_assigne,
          is_obligatoire,
          examen:examens (
            id,
            date_examen,
            heure_debut,
            heure_fin,
            matiere,
            salle,
            type_requis
          ),
          session:sessions (
            id,
            name,
            year,
            period
          )
        `)
        .eq('surveillant_id', selectedSurveillant.id)
        .order('examen.date_examen', { ascending: false });
      
      if (error) throw error;
      return data as Attribution[];
    },
    enabled: !!selectedSurveillant
  });

  const filteredSurveillants = surveillants?.filter(surveillant =>
    `${surveillant.nom} ${surveillant.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    surveillant.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const calculateDuration = (heureDebut: string, heureFin: string) => {
    const debut = new Date(`2000-01-01T${heureDebut}`);
    const fin = new Date(`2000-01-01T${heureFin}`);
    const diff = fin.getTime() - debut.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'professeur': return 'bg-blue-100 text-blue-800';
      case 'jobiste': return 'bg-purple-100 text-purple-800';
      case 'assistant': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Historique des Surveillances</span>
          </CardTitle>
          <CardDescription>
            Consultez l'historique complet des surveillances pour chaque surveillant, toutes sessions confondues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barre de recherche */}
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un surveillant (nom, prénom, email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Liste des surveillants */}
          {loadingSurveillants ? (
            <div className="text-center py-8">Chargement des surveillants...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveillants.map((surveillant) => (
                  <TableRow key={surveillant.id}>
                    <TableCell className="font-medium">{surveillant.nom}</TableCell>
                    <TableCell>{surveillant.prenom}</TableCell>
                    <TableCell>{surveillant.email}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(surveillant.type)}>
                        {surveillant.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatutColor(surveillant.statut)}>
                        {surveillant.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSurveillant(surveillant)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir historique
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <User className="h-5 w-5" />
                              <span>
                                Historique de {surveillant.nom} {surveillant.prenom}
                              </span>
                            </DialogTitle>
                            <DialogDescription>
                              Détail de toutes les surveillances effectuées ou programmées
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {/* Informations du surveillant */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Informations</CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Email :</span>
                                  <p>{surveillant.email}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Type :</span>
                                  <Badge className={`${getTypeColor(surveillant.type)} ml-2`}>
                                    {surveillant.type}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>

                            <Separator />

                            {/* Historique des attributions */}
                            <div>
                              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                                <Calendar className="h-5 w-5" />
                                <span>Historique des surveillances</span>
                              </h3>

                              {loadingAttributions ? (
                                <div className="text-center py-8">Chargement de l'historique...</div>
                              ) : attributions && attributions.length > 0 ? (
                                <div className="space-y-4">
                                  {attributions.map((attribution) => (
                                    <Card key={attribution.id} className="border-l-4 border-l-blue-500">
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-base">
                                            {attribution.examen.matiere}
                                          </CardTitle>
                                          <div className="flex space-x-2">
                                            {attribution.is_obligatoire && (
                                              <Badge variant="destructive">Obligatoire</Badge>
                                            )}
                                            {attribution.is_pre_assigne && (
                                              <Badge variant="secondary">Pré-assigné</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <CardDescription>
                                          Session : {attribution.session.name}
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-sm font-medium text-gray-500">Date :</span>
                                          <p>{formatDate(attribution.examen.date_examen)}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-500">Salle :</span>
                                          <p>{attribution.examen.salle}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-500">Horaires :</span>
                                          <p className="flex items-center space-x-1">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                              {attribution.examen.heure_debut} - {attribution.examen.heure_fin}
                                            </span>
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-500">Durée :</span>
                                          <p>{calculateDuration(attribution.examen.heure_debut, attribution.examen.heure_fin)}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <span className="text-sm font-medium text-gray-500">Type requis :</span>
                                          <Badge className="ml-2">{attribution.examen.type_requis}</Badge>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  Aucune surveillance enregistrée pour ce surveillant
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredSurveillants.length === 0 && !loadingSurveillants && (
            <div className="text-center py-8 text-gray-500">
              Aucun surveillant trouvé avec ces critères de recherche
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveillanceHistory;
