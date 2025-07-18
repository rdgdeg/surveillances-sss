import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSessions, useActiveSession } from "@/hooks/useSessions";
import { RefreshCw, CheckCircle, AlertTriangle, Info, Users, MessageSquare } from "lucide-react";
import { AvailabilityInstructionsScreen } from "./AvailabilityInstructionsScreen";
import { OptimizedAvailabilityForm } from "./OptimizedAvailabilityForm";
import { SessionSelectionScreen } from "./SessionSelectionScreen";
import { ModificationRequestForm } from "./ModificationRequestForm";
import { ExistingAvailabilitiesEditor } from "./ExistingAvailabilitiesEditor";

export const SimpleSurveillantAvailabilityForm = () => {
  const { data: sessions = [] } = useSessions();
  const { data: activeSession } = useActiveSession();
  const [email, setEmail] = useState("");
  const [surveillantId, setSurveillantId] = useState<string | null>(null);
  const [surveillantData, setSurveillantData] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'email' | 'existing-availabilities' | 'modification-request' | 'edit-availabilities' | 'email-confirmation' | 'availability' | 'success'>('email');
  
  // Pour surveillant inconnu
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [surveillancesADeduire, setSurveillancesADeduire] = useState(0);

  // Vérifier les disponibilités existantes
  const { data: existingDisponibilites } = useQuery({
    queryKey: ['check-existing-disponibilites', email, selectedSessionId],
    queryFn: async () => {
      if (!email.trim() || !selectedSessionId) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', selectedSessionId)
        .eq('surveillant_id', surveillantId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!email && !!selectedSessionId && !!surveillantId
  });

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

    console.log('Searching for surveillant with email:', email.trim().toLowerCase());

    const { data, error } = await supabase
      .from('surveillants')
      .select('id, nom, prenom, type, surveillances_a_deduire, telephone, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    console.log('Surveillant search result:', { data, error, searchEmail: email.trim().toLowerCase() });

    if (error) {
      console.error('Error searching for surveillant:', error);
      setCurrentStep('email-confirmation');
      return;
    }

    if (!data) {
      console.log('No surveillant found with email:', email.trim().toLowerCase());
      setCurrentStep('email-confirmation');
      return;
    }

    console.log('Found surveillant:', data);
    setSurveillantId(data.id);
    setSurveillantData(data);
    setSurveillancesADeduire(data.surveillances_a_deduire || 0);
    setNom(data.nom);
    setPrenom(data.prenom);
    setTelephone(data.telephone || '');
    
    // Sélectionner automatiquement la session active
    if (activeSession) {
      setSelectedSessionId(activeSession.id);
      setCurrentStep('existing-availabilities');
    }
    toast({
      title: "Surveillant trouvé",
      description: `Bonjour ${data.prenom} ${data.nom}`,
    });
  };

  const handleEmailConfirmation = () => {
    setSurveillantId(null);
    setSurveillantData(null);
    setSurveillancesADeduire(0);
    setCurrentStep('availability');
    toast({
      title: "Email confirmé",
      description: "Vous pouvez maintenant procéder à votre candidature.",
    });
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    
    if (surveillantId) {
      setCurrentStep('existing-availabilities');
    } else {
      setCurrentStep('availability');
    }
  };

  useEffect(() => {
    if (currentStep === 'existing-availabilities' && existingDisponibilites !== undefined) {
      if (existingDisponibilites.length > 0) {
        return;
      } else {
        setCurrentStep('availability');
      }
    }
  }, [currentStep, existingDisponibilites]);

  // Mutation pour créer un surveillant inconnu
  const createSurveillantMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId) {
        throw new Error('Aucune session sélectionnée');
      }

      const { data, error } = await supabase
        .from('surveillants')
        .insert({
          email: email.trim().toLowerCase(),
          nom,
          prenom,
          telephone,
          statut: 'candidat',
          type: 'Candidat',
          surveillances_a_deduire: 0
        })
        .select('id')
        .single();

      if (error) throw error;

      const { data: existingRelation } = await supabase
        .from('surveillant_sessions')
        .select('id')
        .eq('surveillant_id', data.id)
        .eq('session_id', selectedSessionId)
        .single();

      if (!existingRelation) {
        const { error: sessionError } = await supabase
          .from('surveillant_sessions')
          .insert({
            surveillant_id: data.id,
            session_id: selectedSessionId,
            quota: 0,
            is_active: true
          });

        if (sessionError) throw sessionError;
      }

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
      if (!surveillantId || !selectedSessionId) throw new Error('Données manquantes');

      const { error } = await supabase
        .from('surveillants')
        .update({ 
          surveillances_a_deduire: surveillancesADeduire,
          telephone: telephone 
        })
        .eq('id', surveillantId);

      if (error) throw error;

      const { data: existingRelation } = await supabase
        .from('surveillant_sessions')
        .select('id')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', selectedSessionId)
        .single();

      if (!existingRelation) {
        const { error: sessionError } = await supabase
          .from('surveillant_sessions')
          .insert({
            surveillant_id: surveillantId,
            session_id: selectedSessionId,
            quota: 0,
            is_active: true
          });

        if (sessionError) throw sessionError;
      }
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
      await updateSurveillantMutation.mutateAsync();
    } else {
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
    setSelectedSessionId(null);
    setNom('');
    setPrenom('');
    setTelephone('');
    setSurveillancesADeduire(0);
    setCurrentStep('email');
  };

  // Sélectionner automatiquement la session active
  useEffect(() => {
    if (activeSession && !selectedSessionId) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession, selectedSessionId]);

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
      <div className="space-y-6">
        {/* Instructions d'accueil */}
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-blue-800 mb-2">Déclaration de disponibilités</h1>
                <p className="text-lg text-gray-600 mb-4">Surveillance d'examens UCLouvain</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Pourquoi déclarer vos disponibilités ?
                </h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                    <span><strong>Surveillance obligatoire :</strong> Vous devez déclarer vos disponibilités pour les surveillances d'examens</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 mt-0.5 text-blue-600" />
                    <span><strong>Organisation :</strong> Vos disponibilités nous aident à organiser les surveillances efficacement</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="email">Votre adresse email UCLouvain</Label>
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
                <p className="text-xs text-gray-600 mt-1">
                  Utilisez votre adresse officielle UCLouvain pour accéder à vos informations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'existing-availabilities' && existingDisponibilites && existingDisponibilites.length > 0) {
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    
    return (
      <Card className="max-w-2xl mx-auto border-orange-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-orange-800 mb-2">
                Disponibilités déjà enregistrées
              </h2>
              <p className="text-orange-700 mb-4">
                Vous avez déjà introduit vos disponibilités pour la session <strong>{selectedSession?.name}</strong>.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>{existingDisponibilites.length}</strong> créneaux ont été déclarés et sont en cours de traitement.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800 mb-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Souhaitez-vous modifier vos disponibilités ?</span>
              </div>
              <p className="text-sm text-blue-700">
                Vous pouvez modifier directement vos disponibilités existantes ou en ajouter de nouvelles.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={() => setCurrentStep('edit-availabilities')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Modifier mes disponibilités
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('modification-request')}
                className="flex-1 border-orange-600 text-orange-600"
              >
                Demander aide admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'edit-availabilities' && surveillantId && selectedSessionId) {
    return (
      <ExistingAvailabilitiesEditor
        surveillantId={surveillantId}
        sessionId={selectedSessionId}
        email={email}
        onComplete={() => setCurrentStep('success')}
      />
    );
  }

  if (currentStep === 'modification-request') {
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    
    return (
      <ModificationRequestForm
        email={email}
        selectedSession={selectedSession!}
        onSuccess={() => setCurrentStep('success')}
      />
    );
  }


  if (currentStep === 'email-confirmation') {
    return (
      <Card className="border-orange-200">
        <CardContent className="pt-6">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-orange-800">Email non reconnu</h2>
              <p className="text-orange-700 mb-4">
                Votre email <strong>{email}</strong> ne semble pas être reconnu dans notre système.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Vérifications importantes :</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Avez-vous bien utilisé votre adresse email UCLouvain officielle ?</li>
                <li>• Votre adresse doit être de la forme : prenom.nom@uclouvain.be</li>
                <li>• Si vous êtes étudiant, utilisez votre adresse @student.uclouvain.be</li>
                <li>• Vérifiez qu'il n'y a pas de fautes de frappe</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Si votre email est correct et que vous souhaitez tout de même postuler comme candidat externe, 
                vous pouvez continuer. Sinon, vous pouvez corriger votre adresse email.
              </p>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('email')}
                  className="flex-1"
                >
                  Corriger l'email
                </Button>
                <Button
                  onClick={handleEmailConfirmation}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Confirmer et continuer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  if (currentStep === 'availability' && surveillantId && selectedSessionId) {
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Étape 2/2 •</span>
            <span className="font-medium">{surveillantData?.prenom} {surveillantData?.nom}</span>
            {selectedSession && (
              <span className="text-sm text-gray-500">• Session : {selectedSession.name}</span>
            )}
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
          sessionId={selectedSessionId}
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
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                {currentStep === 'success' && existingDisponibilites && existingDisponibilites.length > 0 
                  ? 'Modifications enregistrées !' 
                  : 'Disponibilités enregistrées !'}
              </h2>
              <p className="text-gray-600 mb-4">
                {currentStep === 'success' && existingDisponibilites && existingDisponibilites.length > 0
                  ? `Merci ${surveillantData?.prenom}. Vos modifications ont été enregistrées avec succès.`
                  : `Merci ${surveillantData?.prenom}. Vos disponibilités ont été transmises au service des surveillances.`}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Vous recevrez une confirmation par email une fois les attributions finalisées.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
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
