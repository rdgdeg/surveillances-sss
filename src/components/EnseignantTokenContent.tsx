
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EnseignantExamenForm } from "./EnseignantExamenForm";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface EnseignantTokenContentProps {
  token?: string;
}

export const EnseignantTokenContent = ({ token }: EnseignantTokenContentProps) => {
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Vérifier la validité du token
  const { data: tokenValidation, isLoading: tokenLoading } = useQuery({
    queryKey: ['token-validation', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .rpc('is_valid_token', { token_to_check: token });
      
      if (error) throw error;
      return data;
    },
    enabled: !!token
  });

  // Récupérer les examens associés à ce token
  const { data: examensEnseignant, isLoading: examensLoading } = useQuery({
    queryKey: ['examens-token', token],
    queryFn: async () => {
      if (!token) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('lien_enseignant_token', token)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!token && tokenValidation === true
  });

  useEffect(() => {
    setTokenValid(tokenValidation);
  }, [tokenValidation]);

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Token manquant</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Aucun token n'a été fourni dans l'URL. Veuillez utiliser le lien complet qui vous a été envoyé.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (tokenLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Vérification du token...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Validation de votre accès en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (tokenValid === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Token invalide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Ce lien n'est pas valide ou a expiré. Veuillez contacter l'administration pour obtenir un nouveau lien.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (examensLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Chargement de vos examens...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Récupération de vos examens en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (!examensEnseignant || examensEnseignant.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Aucun examen trouvé</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Aucun examen n'a été trouvé pour ce lien. Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Accès validé</span>
          </CardTitle>
          <CardDescription>
            Vous pouvez maintenant confirmer vos besoins en surveillance pour vos examens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <strong>{examensEnseignant.length}</strong> examen{examensEnseignant.length > 1 ? 's' : ''} trouvé{examensEnseignant.length > 1 ? 's' : ''} pour cette session.
          </div>
        </CardContent>
      </Card>

      <EnseignantExamenForm />
    </div>
  );
};
