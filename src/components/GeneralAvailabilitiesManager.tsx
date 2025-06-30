
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian, formatTimeRange } from "@/lib/dateUtils";
import { ExistingAvailabilitiesEditor } from "./ExistingAvailabilitiesEditor";

interface SurveillantWithDisponibilites {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  disponibilites_count: number;
}

export const GeneralAvailabilitiesManager = () => {
  const { data: activeSession } = useActiveSession();
  const [selectedSurveillant, setSelectedSurveillant] = useState<SurveillantWithDisponibilites | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with_availabilities" | "without_availabilities">("all");

  // Récupérer les surveillants avec leurs disponibilités
  const { data: surveillants = [], isLoading } = useQuery({
    queryKey: ['surveillants-with-disponibilites', activeSession?.id, filterType],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      let query = supabase
        .from('surveillants')
        .select(`
          id,
          nom,
          prenom,
          email,
          disponibilites:disponibilites!inner(count)
        `)
        .eq('disponibilites.session_id', activeSession.id);

      if (filterType === "with_availabilities") {
        query = query.gt('disponibilites.count', 0);
      } else if (filterType === "without_availabilities") {
        query = query.eq('disponibilites.count', 0);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transformer les données pour obtenir le count
      return data.map(s => ({
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        email: s.email,
        disponibilites_count: s.disponibilites?.length || 0
      })) as SurveillantWithDisponibilites[];
    },
    enabled: !!activeSession?.id
  });

  // Filtrer par email si recherche
  const filteredSurveillants = surveillants.filter(s => 
    !searchEmail || s.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

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

  if (selectedSurveillant) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Gestion des disponibilités - {selectedSurveillant.prenom} {selectedSurveillant.nom}
          </h2>
          <Button 
            variant="outline"
            onClick={() => setSelectedSurveillant(null)}
          >
            Retour à la liste
          </Button>
        </div>
        <ExistingAvailabilitiesEditor
          surveillantId={selectedSurveillant.id}
          sessionId={activeSession.id}
          email={selectedSurveillant.email}
          onComplete={() => setSelectedSurveillant(null)}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Gestion générale des disponibilités</span>
        </CardTitle>
        <CardDescription>
          Gérer les disponibilités existantes des surveillants pour la session {activeSession.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search-email">Rechercher par email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search-email"
                  type="email"
                  placeholder="email@uclouvain.be"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-type">Filtrer par</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les surveillants</SelectItem>
                  <SelectItem value="with_availabilities">Avec disponibilités</SelectItem>
                  <SelectItem value="without_availabilities">Sans disponibilités</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{surveillants.length}</div>
                  <div className="text-sm text-blue-700">Surveillants total</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {surveillants.filter(s => s.disponibilites_count > 0).length}
                  </div>
                  <div className="text-sm text-green-700">Avec disponibilités</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {surveillants.filter(s => s.disponibilites_count === 0).length}
                  </div>
                  <div className="text-sm text-orange-700">Sans disponibilités</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des surveillants */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              Surveillants ({filteredSurveillants.length})
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Chargement des surveillants...</div>
              </div>
            ) : filteredSurveillants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun surveillant trouvé avec les critères actuels.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSurveillants.map(surveillant => (
                  <Card key={surveillant.id} className="border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="font-medium">
                              {surveillant.prenom} {surveillant.nom}
                            </div>
                            <div className="text-sm text-gray-600">
                              {surveillant.email}
                            </div>
                          </div>
                          <Badge 
                            variant={surveillant.disponibilites_count > 0 ? "default" : "secondary"}
                          >
                            {surveillant.disponibilites_count} disponibilité{surveillant.disponibilites_count > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSurveillant(surveillant)}
                        >
                          Gérer les disponibilités
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
