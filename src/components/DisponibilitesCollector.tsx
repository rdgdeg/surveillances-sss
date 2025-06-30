
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, Send, AlertCircle } from "lucide-react";
import { useManualCreneaux } from "@/hooks/useManualCreneaux";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface DisponibiliteFormData {
  surveillantEmail: string;
  creneauxSelectionnes: string[];
  typeChoix: 'souhaitee' | 'obligatoire';
  commentaire?: string;
}

export const DisponibilitesCollector = () => {
  const { data: activeSession } = useActiveSession();
  const { data: creneaux = [], isLoading } = useManualCreneaux();
  const [formData, setFormData] = useState<DisponibiliteFormData>({
    surveillantEmail: "",
    creneauxSelectionnes: [],
    typeChoix: 'souhaitee'
  });

  const handleCreneauToggle = (creneauId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      creneauxSelectionnes: checked 
        ? [...prev.creneauxSelectionnes, creneauId]
        : prev.creneauxSelectionnes.filter(id => id !== creneauId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.surveillantEmail) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un email de surveillant",
        variant: "destructive"
      });
      return;
    }

    if (formData.creneauxSelectionnes.length === 0) {
      toast({
        title: "Erreur", 
        description: "Veuillez sélectionner au moins un créneau",
        variant: "destructive"
      });
      return;
    }

    // Ici, vous implementeriez la logique pour sauvegarder les disponibilités
    // en utilisant les créneaux manuels sélectionnés
    
    toast({
      title: "Disponibilités enregistrées",
      description: `${formData.creneauxSelectionnes.length} créneaux sélectionnés pour ${formData.surveillantEmail}`,
    });
    
    // Reset form
    setFormData({
      surveillantEmail: "",
      creneauxSelectionnes: [],
      typeChoix: 'souhaitee'
    });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">Chargement des créneaux...</div>
        </CardContent>
      </Card>
    );
  }

  if (creneaux.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun créneau disponible</h3>
            <p className="text-gray-500">
              Configurez d'abord les créneaux et associez-les aux examens.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grouper les créneaux par date
  const creneauxParDate = creneaux.reduce((acc, creneau) => {
    if (!acc[creneau.date]) {
      acc[creneau.date] = [];
    }
    acc[creneau.date].push(creneau);
    return acc;
  }, {} as Record<string, typeof creneaux>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Collecte de disponibilités</span>
        </CardTitle>
        <CardDescription>
          Saisissez les disponibilités basées sur les créneaux manuels configurés
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations surveillant */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informations du surveillant</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email du surveillant *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.surveillantEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, surveillantEmail: e.target.value }))}
                  placeholder="email@uclouvain.be"
                  required
                />
              </div>
              <div>
                <Label htmlFor="typeChoix">Type de disponibilité</Label>
                <Select 
                  value={formData.typeChoix} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, typeChoix: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="souhaitee">Disponibilité souhaitée</SelectItem>
                    <SelectItem value="obligatoire">Surveillance obligatoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Sélection des créneaux */}
          <div className="space-y-4">
            <h3 className="font-semibold">Créneaux disponibles</h3>
            <div className="space-y-6">
              {Object.keys(creneauxParDate)
                .sort()
                .map(date => (
                  <div key={date} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4 flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateWithDayBelgian(date)}</span>
                      <Badge variant="outline">
                        {creneauxParDate[date].length} créneaux
                      </Badge>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {creneauxParDate[date].map(creneau => (
                        <div 
                          key={creneau.id} 
                          className="border rounded p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={creneau.id}
                              checked={formData.creneauxSelectionnes.includes(creneau.id)}
                              onCheckedChange={(checked) => handleCreneauToggle(creneau.id, !!checked)}
                            />
                            <div className="flex-1 space-y-2">
                              <label 
                                htmlFor={creneau.id}
                                className="cursor-pointer block"
                              >
                                <div className="font-medium">
                                  {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                                  {creneau.nom_creneau && (
                                    <span className="ml-2 text-sm text-gray-600">
                                      ({creneau.nom_creneau})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {creneau.examens.length} examen{creneau.examens.length > 1 ? 's' : ''}
                                </div>
                              </label>
                              <div className="space-y-1">
                                {creneau.examens.map(examen => (
                                  <div key={examen.id} className="text-xs bg-blue-50 p-2 rounded">
                                    <div className="font-medium">{examen.matiere}</div>
                                    <div className="text-gray-600">
                                      {examen.salle} • {examen.heure_debut}-{examen.heure_fin}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="commentaire"
              value={formData.commentaire || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          {/* Résumé */}
          {formData.creneauxSelectionnes.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium mb-2">Résumé de la sélection</h4>
              <div className="text-sm text-gray-600">
                <p>{formData.creneauxSelectionnes.length} créneaux sélectionnés</p>
                <p>Type: {formData.typeChoix === 'souhaitee' ? 'Disponibilité souhaitée' : 'Surveillance obligatoire'}</p>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setFormData({
                surveillantEmail: "",
                creneauxSelectionnes: [],
                typeChoix: 'souhaitee'
              })}
            >
              Réinitialiser
            </Button>
            <Button type="submit" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Enregistrer les disponibilités</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
