
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, MapPin, Users, Calculator } from "lucide-react";
import { useState } from "react";
import { Footer } from "@/components/Footer";

interface SurveillanceData {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  surveillant_nom: string;
  surveillant_prenom: string;
  surveillant_email: string;
  surveillant_type: string;
  is_pre_assigne: boolean;
  is_obligatoire: boolean;
  session_name: string;
}

const Surveillant = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<SurveillanceData[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('surveillance_assignments_view')
        .select(`
          *,
          sessions!inner(name)
        `)
        .eq('email', searchEmail.trim())
        .not('examen_id', 'is', null);

      if (error) throw error;

      const formattedData: SurveillanceData[] = (data || []).map(item => ({
        id: item.examen_id || '',
        date_examen: item.date_examen || '',
        heure_debut: item.heure_debut || '',
        heure_fin: item.heure_fin || '',
        matiere: item.matiere || '',
        salle: item.salle || '',
        surveillant_nom: item.nom || '',
        surveillant_prenom: item.prenom || '',
        surveillant_email: item.email || '',
        surveillant_type: item.surveillant_type || '',
        is_pre_assigne: false, // Ces données ne sont pas disponibles dans la vue
        is_obligatoire: false, // Ces données ne sont pas disponibles dans la vue
        session_name: item.sessions?.name || ''
      }));

      setSearchResult(formattedData);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setSearchResult([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const groupedBySession = searchResult?.reduce((acc, surveillance) => {
    const sessionName = surveillance.session_name || 'Session inconnue';
    if (!acc[sessionName]) {
      acc[sessionName] = [];
    }
    acc[sessionName].push(surveillance);
    return acc;
  }, {} as Record<string, SurveillanceData[]>) || {};

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Espace Surveillant</h1>
            <p className="text-muted-foreground">
              Consultez vos surveillances attribuées en saisissant votre adresse e-mail
            </p>
          </div>

          {/* Recherche par email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Recherche de Surveillances</span>
              </CardTitle>
              <CardDescription>
                Saisissez votre adresse e-mail pour consulter vos surveillances attribuées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre.email@uclouvain.be"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching || !searchEmail.trim()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Recherche..." : "Rechercher"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résultats de recherche */}
          {searchResult !== null && (
            <div className="space-y-6">
              {searchResult.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Aucune surveillance trouvée pour cette adresse e-mail.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(groupedBySession).map(([sessionName, surveillances]) => (
                  <Card key={sessionName}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>{sessionName}</span>
                        </span>
                        <Badge variant="secondary">
                          {surveillances.length} surveillance(s)
                        </Badge>
                      </CardTitle>
                      {surveillances.length > 0 && (
                        <CardDescription>
                          Surveillant : {surveillances[0].surveillant_prenom} {surveillances[0].surveillant_nom}
                          {surveillances[0].surveillant_type && (
                            <Badge variant="outline" className="ml-2">
                              {surveillances[0].surveillant_type}
                            </Badge>
                          )}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Horaire</TableHead>
                              <TableHead>Matière</TableHead>
                              <TableHead>Salle</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {surveillances
                              .sort((a, b) => {
                                const dateA = new Date(`${a.date_examen} ${a.heure_debut}`);
                                const dateB = new Date(`${b.date_examen} ${b.heure_debut}`);
                                return dateA.getTime() - dateB.getTime();
                              })
                              .map((surveillance, index) => (
                                <TableRow key={`${surveillance.id}-${index}`}>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {new Date(surveillance.date_examen).toLocaleDateString('fr-FR', {
                                          weekday: 'long',
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span>{surveillance.heure_debut} - {surveillance.heure_fin}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">{surveillance.matiere}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{surveillance.salle}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      {surveillance.is_pre_assigne && (
                                        <Badge variant="secondary">Pré-assigné</Badge>
                                      )}
                                      {surveillance.is_obligatoire && (
                                        <Badge variant="destructive">Obligatoire</Badge>
                                      )}
                                      {!surveillance.is_pre_assigne && !surveillance.is_obligatoire && (
                                        <Badge variant="outline">Standard</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Surveillant;
