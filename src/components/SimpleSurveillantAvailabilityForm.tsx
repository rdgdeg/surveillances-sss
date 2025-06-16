
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { RefreshCw, CheckCircle } from "lucide-react";
import { AvailabilityInstructionsScreen } from "./AvailabilityInstructionsScreen";
import { OptimizedAvailabilityForm } from "./OptimizedAvailabilityForm";

export const SimpleSurveillantAvailabilityForm = () => {
  const { data: activeSession } = useActiveSession();
  const [email, setEmail] = useState("");
  const [surveillantId, setSurveillantId] = useState<string | null>(null);
  const [surveillantData, setSurveillantData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'email' | 'instructions' | 'availability' | 'success'>('email');
  
  // Pour surveillant inconnu
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [surveillancesADeduire, setSurveillancesADeduire] = useState(0);

  // Rechercher le surveillant par email
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('surveillants')
      .select('id, nom, prenom, type, surveillances_a_deduire, telephone')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      // Surveillant non trouvé - on passe quand même aux instructions
      setSurveillantId(null);
      setSurveillantData(null);
      setSurveillancesADeduire(0);
      setCurrentStep('instructions');
      toast({
        title: "Profil non trouvé",
        description: "Vous pouvez quand même postuler en tant que candidat.",
      });
      return;
    }

    setSurveillantId(data.id);
    setSurveillantData(data);
    setSurveillancesADeduire(data.surveillances_a_deduire || 0);
    setNom(data.nom);
    setPrenom(data.prenom);
    setTelephone(data.telephone || '');
    setCurrentStep('instructions');
    toast({
      title: "Surveillant trouvé",
      description: `Bonjour ${data.prenom} ${data.nom}`,
    });
  };

  // Mutation pour créer un surveillant inconnu
  const createSurveillantMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .insert({
          email: email.trim().toLowerCase(),
          nom,
          prenom,
          telephone,
          statut: 'candidat',
          type: 'Candidat'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSurveillantId(data.id);
      setSurveillantData({
        id: data.id,
        nom,
        prenom,
        type: 'Candidat'
      });
      setCurrentStep('availability');
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation pour mettre à jour un surveillant existant
  const updateSurveillantMutation = useMutation({
    mutationFn: async () => {
      if (!surveillantId) throw new Error('ID surveillant manquant');

      const { error } = await supabase
        .from('surveillants')
        .update({ 
          surveillances_a_deduire: surveillancesADeduire,
          telephone: telephone 
        })
        .eq('id', surveillantId);

      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentStep('availability');
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleContinueFromInstructions = async () => {
    if (surveillantId) {
      // Surveillant existant - mettre à jour les infos
      await updateSurveillantMutation.mutateAsync();
    } else {
      // Nouveau surveillant - créer le profil
      await createSurveillantMutation.mutateAsync();
    }
  };

  const handleAvailabilitySuccess = () => {
    setCurrentStep('success');
  };

  const resetForm = () => {
    setEmail("");
    setSurveillantId(null);
    setSurveillantData(null);
    setNom('');
    setPrenom('');
    setTelephone('');
    setSurveillancesADeduire(0);
    setCurrentStep('email');
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Veuillez contacter l'administration.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'email') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Déclaration de disponibilités</h2>
              <p className="text-gray-600 mb-6">Session : {activeSession.name}</p>
            </div>
            
            <div>
              <Label htmlFor="email">Votre adresse email</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@uclouvain.be"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                />
                <Button onClick={handleEmailSubmit} disabled={!email.trim()}>
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'instructions') {
    return (
      <AvailabilityInstructionsScreen
        email={email}
        surveillantData={surveillantData}
        telephone={telephone}
        setTelephone={setTelephone}
        surveillancesADeduire={surveillancesADeduire}
        setSurveillancesADeduire={setSurveillancesADeduire}
        onContinue={handleContinueFromInstructions}
        nom={nom}
        setNom={setNom}
        prenom={prenom}
        setPrenom={setPrenom}
      />
    );
  }

  if (currentStep === 'availability' && surveillantId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Étape 2/2 •</span>
            <span className="font-medium">{surveillantData?.prenom} {surveillantData?.nom}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetForm}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recommencer
          </Button>
        </div>

        <OptimizedAvailabilityForm
          surveillantId={surveillantId}
          email={email}
          onSuccess={handleAvailabilitySuccess}
        />
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <Card className="border-green-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Disponibilités enregistrées !</h2>
              <p className="text-gray-600 mb-4">
                Merci {surveillantData?.prenom}. Vos disponibilités ont été transmises au service des surveillances.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Vous recevrez une confirmation par email une fois les attributions finalisées.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('availability')}
              >
                Modifier mes disponibilités
              </Button>
              <Button onClick={resetForm}>
                Nouvelle déclaration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
