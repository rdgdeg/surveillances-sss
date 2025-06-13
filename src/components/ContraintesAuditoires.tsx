import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Building, Trash2, Plus, RefreshCw, Edit2, Check, X, Upload, MapPin, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ContrainteAuditoire {
  id: string;
  auditoire: string;
  nombre_surveillants_requis: number;
  description?: string;
  adresse?: string;
  lien_google_maps?: string;
}

export const ContraintesAuditoires = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [nouvelAuditoire, setNouvelAuditoire] = useState<string>("");
  const [nombreSurveillants, setNombreSurveillants] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [adresse, setAdresse] = useState<string>("");
  const [lienGoogleMaps, setLienGoogleMaps] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ 
    nombre: number; 
    description: string; 
    adresse: string; 
    lien_google_maps: string; 
  }>({ nombre: 1, description: "", adresse: "", lien_google_maps: "" });
  const [bulkAuditoires, setBulkAuditoires] = useState<string>("");
  const [showBulkImport, setShowBulkImport] = useState<boolean>(false);

  // Récupérer les contraintes existantes - requête simplifiée pour déboguer
  const { data: contraintes = [], isLoading, error } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async () => {
      console.log("Fetching contraintes auditoires...");
      
      try {
        const { data, error } = await supabase
          .from('contraintes_auditoires')
          .select('*')
          .order('auditoire');
        
        if (error) {
          console.error("Error fetching contraintes:", error);
          throw error;
        }
        
        console.log("Contraintes fetched successfully:", data);
        console.log("Number of contraintes:", data?.length || 0);
        
        return data as ContrainteAuditoire[];
      } catch (err) {
        console.error("Fetch error:", err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  // Log pour déboguer
  console.log("Current contraintes state:", contraintes);
  console.log("Is loading:", isLoading);
  console.log("Has error:", error);

  // Récupérer les auditoires utilisés dans les examens
  const { data: auditoriesFromExams = [] } = useQuery({
    queryKey: ['auditoires-examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('salle')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      
      // Récupérer les auditoires uniques et les trier
      const uniqueAuditoires = [...new Set(data.map(item => item.salle))];
      return uniqueAuditoires.sort();
    },
    enabled: !!activeSession?.id
  });

  // Force refresh button pour déboguer
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
    toast({
      title: "Actualisation",
      description: "Données actualisées.",
    });
  };

  // Fonction pour parser les auditoires depuis le texte en vrac
  const parseAuditoires = (text: string): string[] => {
    // Nettoyer le texte et diviser par lignes
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const auditoires = new Set<string>();

    lines.forEach(line => {
      // Ignorer les lignes qui ressemblent à des heures
      if (line.match(/^\d{1,2}:\d{2}\s*(AM|PM)?$/i) || line === "A fixer") {
        return;
      }

      // Diviser par virgules et traiter chaque partie
      const parts = line.split(',').map(part => part.trim());
      
      parts.forEach(part => {
        if (part && part.length > 0 && !part.match(/^\d{1,2}:\d{2}/)) {
          // Nettoyer les auditoires (enlever les espaces en trop)
          const cleanAuditoire = part.trim();
          if (cleanAuditoire.length > 0) {
            auditoires.add(cleanAuditoire);
          }
        }
      });
    });

    return Array.from(auditoires).sort();
  };

  // Créer des contraintes en lot depuis le texte
  const createBulkContraintes = useMutation({
    mutationFn: async () => {
      if (!bulkAuditoires.trim()) {
        throw new Error("Veuillez saisir la liste des auditoires");
      }

      const auditoires = parseAuditoires(bulkAuditoires);
      console.log("Auditoires parsés:", auditoires);

      if (auditoires.length === 0) {
        throw new Error("Aucun auditoire valide trouvé dans le texte");
      }

      // Vérifier quels auditoires existent déjà
      const existingAuditoires = contraintes.map(c => c.auditoire);
      const newAuditoires = auditoires.filter(auditoire => !existingAuditoires.includes(auditoire));

      if (newAuditoires.length === 0) {
        throw new Error("Tous les auditoires sont déjà configurés");
      }

      // Créer les nouvelles contraintes avec 1 surveillant par défaut
      const newContraintes = newAuditoires.map(auditoire => ({
        auditoire,
        nombre_surveillants_requis: 1,
        description: "Créé automatiquement depuis import en lot"
      }));

      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(newContraintes);

      if (error) throw error;
      return { created: newAuditoires.length, total: auditoires.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setBulkAuditoires("");
      setShowBulkImport(false);
      toast({
        title: "Import réussi",
        description: `${result.created} nouvelle(s) contrainte(s) créée(s) sur ${result.total} auditoires détectés.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'importer les contraintes.",
        variant: "destructive"
      });
    }
  });

  // Créer une contrainte
  const createContrainte = useMutation({
    mutationFn: async () => {
      if (!nouvelAuditoire.trim()) {
        throw new Error("Veuillez saisir un nom d'auditoire");
      }

      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .insert({
          auditoire: nouvelAuditoire.trim(),
          nombre_surveillants_requis: nombreSurveillants,
          description: description.trim() || null,
          adresse: adresse.trim() || null,
          lien_google_maps: lienGoogleMaps.trim() || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setNouvelAuditoire("");
      setNombreSurveillants(1);
      setDescription("");
      setAdresse("");
      setLienGoogleMaps("");
      toast({
        title: "Contrainte créée",
        description: "La contrainte d'auditoire a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la contrainte.",
        variant: "destructive"
      });
    }
  });

  // Mettre à jour une contrainte
  const updateContrainte = useMutation({
    mutationFn: async ({ id, nombre_surveillants_requis, description, adresse, lien_google_maps }: { 
      id: string; 
      nombre_surveillants_requis: number; 
      description: string; 
      adresse: string; 
      lien_google_maps: string; 
    }) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .update({ 
          nombre_surveillants_requis,
          description: description.trim() || null,
          adresse: adresse.trim() || null,
          lien_google_maps: lien_google_maps.trim() || null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setEditingId(null);
      toast({
        title: "Contrainte mise à jour",
        description: "La contrainte a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la contrainte.",
        variant: "destructive"
      });
    }
  });

  // Supprimer une contrainte
  const deleteContrainte = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      toast({
        title: "Contrainte supprimée",
        description: "La contrainte a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la contrainte.",
        variant: "destructive"
      });
    }
  });

  // Synchroniser avec les auditoires des examens
  const syncWithExams = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) throw new Error("Aucune session active");
      
      // Trouver les auditoires qui n'ont pas encore de contrainte
      const existingAuditoires = contraintes.map(c => c.auditoire);
      const newAuditoires = auditoriesFromExams.filter(auditoire => 
        !existingAuditoires.includes(auditoire)
      );

      if (newAuditoires.length === 0) {
        throw new Error("Tous les auditoires ont déjà des contraintes définies");
      }

      // Créer les contraintes manquantes avec 1 surveillant par défaut
      const newContraintes = newAuditoires.map(auditoire => ({
        auditoire,
        nombre_surveillants_requis: 1,
        description: "Créé automatiquement depuis les examens"
      }));

      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(newContraintes);

      if (error) throw error;
      return newAuditoires.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      toast({
        title: "Synchronisation réussie",
        description: `${count} nouvelle(s) contrainte(s) créée(s) pour les auditoires manquants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Information",
        description: error.message || "Impossible de synchroniser.",
        variant: "default"
      });
    }
  });

  // Auditoires sans contrainte
  const existingAuditoires = contraintes.map(c => c.auditoire);
  const auditoriesSansContrainte = auditoriesFromExams.filter(auditoire => 
    !existingAuditoires.includes(auditoire)
  );

  // Prévisualiser les auditoires du texte en vrac
  const previewAuditoires = bulkAuditoires.trim() ? parseAuditoires(bulkAuditoires) : [];

  // Handler functions for editing
  const handleEdit = (contrainte: ContrainteAuditoire) => {
    setEditingId(contrainte.id);
    setEditValues({
      nombre: contrainte.nombre_surveillants_requis,
      description: contrainte.description || "",
      adresse: contrainte.adresse || "",
      lien_google_maps: contrainte.lien_google_maps || ""
    });
  };

  const handleSaveEdit = (id: string) => {
    updateContrainte.mutate({
      id,
      nombre_surveillants_requis: editValues.nombre,
      description: editValues.description,
      adresse: editValues.adresse,
      lien_google_maps: editValues.lien_google_maps
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ nombre: 1, description: "", adresse: "", lien_google_maps: "" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Chargement des contraintes...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-red-500">Erreur lors du chargement des contraintes</p>
            <p className="text-sm text-gray-500">Erreur: {error.message}</p>
            <Button onClick={forceRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Contraintes par Auditoire</span>
            <Button onClick={forceRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Définissez le nombre de surveillants requis pour chaque auditoire.
            Par défaut, 1 surveillant est assigné si aucune contrainte n'est définie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions rapides */}
          {activeSession && auditoriesSansContrainte.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auditoires sans contrainte détectés</p>
                  <p className="text-xs text-gray-600">
                    {auditoriesSansContrainte.length} auditoire(s) trouvé(s) dans les examens
                  </p>
                </div>
                <Button
                  onClick={() => syncWithExams.mutate()}
                  disabled={syncWithExams.isPending}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser
                </Button>
              </div>
            </div>
          )}

          {/* Import en lot */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Gestion des contraintes</h4>
              <Button
                variant="outline"
                onClick={() => setShowBulkImport(!showBulkImport)}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import en lot
              </Button>
            </div>

            {showBulkImport && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Liste des auditoires (un par ligne ou séparés par virgules)
                  </label>
                  <Textarea
                    placeholder="Collez votre liste d'auditoires ici...&#10;Ex:&#10;51 A - Lacroix, 51 C, 51 B&#10;51 F&#10;55 Harvey 2"
                    value={bulkAuditoires}
                    onChange={(e) => setBulkAuditoires(e.target.value)}
                    rows={8}
                    className="w-full"
                  />
                </div>

                {previewAuditoires.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Aperçu ({previewAuditoires.length} auditoires détectés)
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {previewAuditoires.map((auditoire, index) => (
                        <Badge 
                          key={index} 
                          variant={existingAuditoires.includes(auditoire) ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {auditoire}
                          {existingAuditoires.includes(auditoire) && " (existant)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    onClick={() => createBulkContraintes.mutate()}
                    disabled={!bulkAuditoires.trim() || createBulkContraintes.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer les contraintes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkAuditoires("");
                      setShowBulkImport(false);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Formulaire d'ajout individuel */}
          <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Auditoire</label>
                <Input
                  placeholder="Ex: A001, Grand Amphi..."
                  value={nouvelAuditoire}
                  onChange={(e) => setNouvelAuditoire(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nb surveillants</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={nombreSurveillants}
                  onChange={(e) => setNombreSurveillants(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optionnel)</label>
              <Input
                placeholder="Ex: Grand auditoire..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Adresse (optionnel)</label>
              <Input
                placeholder="Ex: Avenue Hippocrate 10, 1200 Woluwe-Saint-Lambert"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Lien Google Maps (optionnel)</label>
              <Input
                placeholder="Ex: https://maps.google.com/..."
                value={lienGoogleMaps}
                onChange={(e) => setLienGoogleMaps(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => createContrainte.mutate()}
                disabled={!nouvelAuditoire.trim() || createContrainte.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>

          {/* Liste des contraintes */}
          <div className="space-y-2">
            <h4 className="font-medium">Contraintes configurées ({contraintes.length})</h4>
            {contraintes.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-gray-500">
                  Aucune contrainte définie. Les auditoires semblent ne pas avoir été chargés correctement.
                </p>
                <Button onClick={forceRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser les données
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {contraintes.map((contrainte) => (
                  <div key={contrainte.id} className="flex items-start justify-between p-4 bg-white border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {contrainte.auditoire}
                        {contrainte.lien_google_maps && (
                          <a 
                            href={contrainte.lien_google_maps} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      
                      {editingId === contrainte.id ? (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={editValues.nombre}
                              onChange={(e) => setEditValues({...editValues, nombre: parseInt(e.target.value) || 1})}
                              className="w-20"
                            />
                            <span className="text-sm text-gray-600">surveillant(s)</span>
                          </div>
                          <Input
                            placeholder="Description..."
                            value={editValues.description}
                            onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                          />
                          <Input
                            placeholder="Adresse..."
                            value={editValues.adresse}
                            onChange={(e) => setEditValues({...editValues, adresse: e.target.value})}
                          />
                          <Input
                            placeholder="Lien Google Maps..."
                            value={editValues.lien_google_maps}
                            onChange={(e) => setEditValues({...editValues, lien_google_maps: e.target.value})}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>{contrainte.nombre_surveillants_requis} surveillant(s) requis</div>
                          {contrainte.description && (
                            <div className="text-gray-500">• {contrainte.description}</div>
                          )}
                          {contrainte.adresse && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {contrainte.adresse}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {editingId === contrainte.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveEdit(contrainte.id)}
                            disabled={updateContrainte.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contrainte)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteContrainte.mutate(contrainte.id)}
                            disabled={deleteContrainte.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auditoires sans contrainte */}
          {auditoriesSansContrainte.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <h5 className="font-medium text-sm mb-2">
                Auditoires sans contrainte spécifique ({auditoriesSansContrainte.length})
              </h5>
              <p className="text-xs text-gray-600 mb-2">
                Ces auditoires utilisent la règle par défaut (1 surveillant)
              </p>
              <div className="flex flex-wrap gap-1">
                {auditoriesSansContrainte.map((auditoire) => (
                  <Badge key={auditoire} variant="outline" className="text-xs">
                    {auditoire}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
