
import React, { useState } from "react";
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { OptimizedAvailabilityForm } from "@/components/OptimizedAvailabilityForm";
import { HomeButton } from "@/components/HomeButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

const Surveillant = () => {
  const [email, setEmail] = useState("");
  const [surveillant, setSurveillant] = useState<Surveillant | undefined>();
  const { data: activeSession } = useActiveSession();

  // Rechercher le surveillant par email
  const { data: foundSurveillant, isLoading: searchLoading } = useQuery({
    queryKey: ['searchSurveillant', email],
    queryFn: async () => {
      if (!email.includes('@')) return null;
      
      const { data, error } = await supabase
        .from('surveillants')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!email && email.includes('@')
  });

  // Mettre à jour le surveillant quand on le trouve
  React.useEffect(() => {
    if (foundSurveillant) {
      setSurveillant(foundSurveillant);
    } else if (email && email.includes('@') && !foundSurveillant && !searchLoading) {
      setSurveillant(undefined);
    }
  }, [foundSurveillant, email, searchLoading]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <div className="p-4">
        <HomeButton />
      </div>
      <main className="flex-1 w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {!surveillant ? (
            <Card className="w-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Identification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email UCLouvain
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre.email@uclouvain.be"
                    />
                  </div>
                  
                  {email && email.includes('@') && !surveillant && !searchLoading && (
                    <div className="text-red-600 text-sm">
                      Aucun surveillant trouvé avec cet email.
                    </div>
                  )}
                  
                  {surveillant && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900">
                        {surveillant.prenom} {surveillant.nom}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Type: {surveillant.type} | Email: {surveillant.email}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            activeSession && (
              <OptimizedAvailabilityForm
                surveillantId={surveillant.id}
                sessionId={activeSession.id}
                email={surveillant.email}
                onSuccess={() => {
                  // Optionnel : actions après sauvegarde
                }}
              />
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Surveillant;
