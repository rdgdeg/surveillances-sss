
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";

const Surveillant = () => {
  const [email, setEmail] = useState("");
  const [surveillantData, setSurveillantData] = useState<any>(null);
  const { data: activeSession } = useActiveSession();

  const { data: attributions = [], refetch } = useQuery({
    queryKey: ['surveillant-attributions', surveillantData?.id, activeSession?.id],
    queryFn: async () => {
      if (!surveillantData || !activeSession) return [];
      
      const { data, error } = await supabase
        .from('attributions')
        .select(`
          *,
          examens (
            date_examen,
            heure_debut, 
            heure_fin,
            matiere,
            salle,
            nombre_surveillants
          )
        `)
        .eq('surveillant_id', surveillantData.id)
        .eq('session_id', activeSession.id)
        .order('examens(date_examen)')
        .order('examens(heure_debut)');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!(surveillantData && activeSession)
  });

  const handleLogin = async () => {
    if (!email.trim() || !activeSession) return;

    try {
      const { data, error } = await supabase
        .from('surveillants')
        .select(`
          *,
          surveillant_sessions!inner (
            quota,
            sessions_imposees
          )
        `)
        .eq('email', email.toLowerCase().trim())
        .eq('surveillant_sessions.session_id', activeSession.id)
        .eq('surveillant_sessions.is_active', true)
        .single();

      if (error) {
        toast({
          title: "Surveillant non trouvé",
          description: "Aucun surveillant trouvé avec cet email pour la session active.",
          variant: "destructive"
        });
        return;
      }

      setSurveillantData(data);
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${data.prenom} ${data.nom} !`
      });
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setSurveillantData(null);
    setEmail("");
  };

  const getAttributionStatus = (attribution: any) => {
    if (attribution.is_locked) return { text: "Verrouillé", color: "bg-red-100 text-red-800" };
    if (attribution.is_pre_assigne) return { text: "Pré-assigné", color: "bg-blue-100 text-blue-800" };
    if (attribution.is_obligatoire) return { text: "Obligatoire", color: "bg-orange-100 text-orange-800" };
    return { text: "Assigné", color: "bg-green-100 text-green-800" };
  };

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune session active. Contactez l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!surveillantData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Connexion Surveillant</span>
            </CardTitle>
            <CardDescription>
              Connectez-vous avec votre email pour voir vos surveillances - Session {activeSession.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!email.trim()}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quotaData = surveillantData.surveillant_sessions[0];
  const attributionsCount = attributions.length;
  const progressPercentage = quotaData ? (attributionsCount / quotaData.quota) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête avec infos surveillant */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{surveillantData.prenom} {surveillantData.nom}</span>
                </CardTitle>
                <CardDescription className="flex items-center space-x-4 mt-2">
                  <span className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{surveillantData.email}</span>
                  </span>
                  <Badge variant="outline">{surveillantData.type}</Badge>
                  <Badge variant="outline">{surveillantData.statut}</Badge>
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Déconnexion
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{attributionsCount}</div>
                <div className="text-sm text-gray-600">Surveillances assignées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{quotaData?.quota || 0}</div>
                <div className="text-sm text-gray-600">Quota total</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${progressPercentage > 100 ? 'text-red-600' : 'text-orange-600'}`}>
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-sm text-gray-600">Progression</div>
              </div>
            </div>
            
            {progressPercentage > 100 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-800">
                  Attention : Vous dépassez votre quota de {quotaData?.quota} surveillances.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des surveillances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Mes Surveillances - Session {activeSession.name}</span>
            </CardTitle>
            <CardDescription>
              Voici la liste de vos surveillances assignées pour cette session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attributions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune surveillance assignée pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attributions.map((attribution) => (
                  <div key={attribution.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">{attribution.examens.date_examen}</Badge>
                          <Badge variant="outline">
                            {attribution.examens.heure_debut} - {attribution.examens.heure_fin}
                          </Badge>
                          <Badge className={getAttributionStatus(attribution).color}>
                            {getAttributionStatus(attribution).text}
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{attribution.examens.matiere}</h3>
                          <p className="text-gray-600">Salle : {attribution.examens.salle}</p>
                          <p className="text-sm text-gray-500">
                            {attribution.examens.nombre_surveillants} surveillant(s) requis pour cet examen
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Surveillant;
