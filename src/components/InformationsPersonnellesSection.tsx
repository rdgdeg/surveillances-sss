
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, CheckCircle, AlertCircle, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InformationsPersonnellesSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  activeSession: any;
}

export function InformationsPersonnellesSection({
  formData,
  setFormData,
  activeSession
}: InformationsPersonnellesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [surveillantTrouve, setSurveillantTrouve] = useState<any>(null);
  const [demandeModification, setDemandeModification] = useState(false);
  const [detailsModification, setDetailsModification] = useState("");

  // Recherche du surveillant par email
  const { data: surveillantData, refetch: refetchSurveillant } = useQuery({
    queryKey: ['surveillant-by-email', formData.email],
    queryFn: async () => {
      if (!formData.email) return null;
      const { data, error } = await supabase
        .from('surveillants')
        .select('*')
        .eq('email', formData.email.trim())
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!formData.email
  });

  // Mutation pour sauvegarder une demande de modification
  const demandeModificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('demandes_modification_info')
        .insert({
          surveillant_id: surveillantTrouve.id,
          anciennes_donnees: {
            nom: surveillantTrouve.nom,
            prenom: surveillantTrouve.prenom,
            faculte: surveillantTrouve.faculte_interdite,
            type: surveillantTrouve.type
          },
          nouvelles_donnees: {
            nom: formData.nom,
            prenom: formData.prenom,
            faculte: formData.faculte,
            statut: formData.statut
          },
          commentaire: detailsModification,
          statut: 'EN_ATTENTE'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande envoyée",
        description: "Votre demande de modification a été transmise à l'administration."
      });
      setDemandeModification(false);
      setDetailsModification("");
    }
  });

  useEffect(() => {
    if (surveillantData) {
      setSurveillantTrouve(surveillantData);
      // Auto-remplissage si les champs sont vides
      if (!formData.nom && !formData.prenom) {
        setFormData(prev => ({
          ...prev,
          nom: surveillantData.nom || '',
          prenom: surveillantData.prenom || '',
          faculte: surveillantData.faculte_interdite || '',
          etp: surveillantData.type === 'PAT' ? 1 : 0.2,
          quota_surveillance: getQuotaByType(surveillantData.type)
        }));
      }
    }
  }, [surveillantData, formData.nom, formData.prenom, setFormData]);

  const getQuotaByType = (type: string) => {
    switch (type) {
      case 'PAT':
      case 'PAT FASB':
        return 12;
      case 'Assistant':
      case 'Doctorant':
        return 6;
      case 'Jobiste':
        return 4;
      default:
        return 6;
    }
  };

  const handleStatutChange = (statut: string) => {
    setFormData(prev => ({
      ...prev,
      statut,
      quota_surveillance: getQuotaByType(statut)
    }));
  };

  const handleDemandeModification = () => {
    if (!detailsModification.trim()) {
      toast({
        title: "Détails requis",
        description: "Veuillez expliquer les modifications souhaitées.",
        variant: "destructive"
      });
      return;
    }
    demandeModificationMutation.mutate({});
  };

  return (
    <Card className="border-uclouvain-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-uclouvain-blue">
          <UserPlus className="h-5 w-5" />
          <span>Vos informations</span>
          {surveillantTrouve && (
            <Badge variant="outline" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Reconnu
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {surveillantTrouve 
            ? "Vos informations ont été trouvées dans notre base. Vérifiez-les et demandez des modifications si nécessaire."
            : "Entrez votre adresse email pour récupérer vos informations."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select value={formData.statut} onValueChange={handleStatutChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Assistant">Assistant</SelectItem>
                <SelectItem value="Doctorant">Doctorant</SelectItem>
                <SelectItem value="PAT">PAT</SelectItem>
                <SelectItem value="PAT FASB">PAT FASB</SelectItem>
                <SelectItem value="Jobiste">Jobiste</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              readOnly={!isEditing && !!surveillantTrouve}
              className={!isEditing && !!surveillantTrouve ? "bg-gray-100" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom</Label>
            <Input
              id="prenom"
              value={formData.prenom}
              onChange={e => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
              readOnly={!isEditing && !!surveillantTrouve}
              className={!isEditing && !!surveillantTrouve ? "bg-gray-100" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={e => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
              required
            />
          </div>

          {formData.statut === 'Autre' && (
            <div className="space-y-2">
              <Label htmlFor="statut_autre">Précisez votre statut</Label>
              <Input
                id="statut_autre"
                value={formData.statut_autre || ''}
                onChange={e => setFormData(prev => ({ ...prev, statut_autre: e.target.value }))}
              />
            </div>
          )}
        </div>

        {surveillantTrouve && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-800">Informations trouvées</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-uclouvain-blue border-uclouvain-blue"
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditing ? "Annuler" : "Modifier"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Type:</span> {surveillantTrouve.type}
              </div>
              <div>
                <span className="text-gray-600">Quota:</span> {formData.quota_surveillance} surveillances
              </div>
              {surveillantTrouve.faculte_interdite && (
                <div className="col-span-2">
                  <span className="text-gray-600">Faculté interdite:</span> {surveillantTrouve.faculte_interdite}
                </div>
              )}
            </div>
            
            {isEditing && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="demande-modification"
                    checked={demandeModification}
                    onCheckedChange={(checked) => setDemandeModification(!!checked)}
                  />
                  <Label htmlFor="demande-modification" className="text-sm">
                    Je souhaite demander une modification de mes informations
                  </Label>
                </div>
                
                {demandeModification && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Expliquez les modifications souhaitées</Label>
                    <Textarea
                      value={detailsModification}
                      onChange={(e) => setDetailsModification(e.target.value)}
                      placeholder="Décrivez les informations à corriger..."
                      className="text-sm"
                    />
                    <Button
                      onClick={handleDemandeModification}
                      disabled={demandeModificationMutation.isPending}
                      size="sm"
                      className="bg-uclouvain-blue hover:bg-uclouvain-blue/90"
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Envoyer la demande
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
