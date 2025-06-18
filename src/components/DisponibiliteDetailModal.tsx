
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Star, CheckCircle } from "lucide-react";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";

interface Disponibilite {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: string;
  nom_examen_selectionne?: string;
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

interface DisponibiliteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveillant: {
    nom: string;
    prenom: string;
    email: string;
    type: string;
  } | null;
  disponibilites: Disponibilite[];
}

export const DisponibiliteDetailModal = ({ 
  isOpen, 
  onClose, 
  surveillant, 
  disponibilites 
}: DisponibiliteDetailModalProps) => {
  if (!surveillant) return null;

  const disponibilitesTriees = disponibilites.sort((a, b) => {
    const dateCompare = a.date_examen.localeCompare(b.date_examen);
    if (dateCompare !== 0) return dateCompare;
    return a.heure_debut.localeCompare(b.heure_debut);
  });

  const obligatoires = disponibilites.filter(d => d.type_choix === 'obligatoire');
  const souhaitees = disponibilites.filter(d => d.type_choix !== 'obligatoire');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Disponibilités de {surveillant.prenom} {surveillant.nom}</span>
            <Badge variant="outline">{surveillant.type}</Badge>
          </DialogTitle>
          <p className="text-sm text-gray-600">{surveillant.email}</p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{disponibilites.length}</div>
                  <div className="text-sm text-blue-700">Total disponibilités</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{obligatoires.length}</div>
                  <div className="text-sm text-orange-700">Surveillances obligatoires</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{souhaitees.length}</div>
                  <div className="text-sm text-green-700">Disponibilités souhaitées</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des disponibilités */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Détail des disponibilités</h3>
            {disponibilitesTriees.length > 0 ? (
              <div className="space-y-3">
                {disponibilitesTriees.map((dispo) => (
                  <Card key={dispo.id} className="border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{formatDateBelgian(dispo.date_examen)}</span>
                          <Clock className="h-4 w-4 text-gray-500 ml-2" />
                          <span>{formatTimeRange(dispo.heure_debut, dispo.heure_fin)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {dispo.type_choix === 'obligatoire' && (
                            <Star className="h-4 w-4 text-orange-500" />
                          )}
                          <Badge 
                            variant={dispo.type_choix === 'obligatoire' ? 'default' : 'secondary'}
                            className={dispo.type_choix === 'obligatoire' ? 'bg-orange-500' : ''}
                          >
                            {dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité'}
                          </Badge>
                        </div>
                      </div>
                      
                      {dispo.nom_examen_selectionne && (
                        <div className="text-sm bg-blue-100 px-3 py-1 rounded mb-2">
                          <strong>Examen souhaité:</strong> {dispo.nom_examen_selectionne}
                        </div>
                      )}
                      
                      {dispo.nom_examen_obligatoire && (
                        <div className="text-sm bg-orange-100 px-3 py-1 rounded mb-2">
                          <strong>Examen obligatoire:</strong> {dispo.nom_examen_obligatoire}
                        </div>
                      )}
                      
                      {dispo.commentaire_surveillance_obligatoire && (
                        <div className="text-sm bg-gray-100 px-3 py-1 rounded">
                          <strong>Commentaire:</strong> {dispo.commentaire_surveillance_obligatoire}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune disponibilité trouvée</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
