
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Calendar, Clock, User, FileText } from "lucide-react";
import { formatDateWithDayBelgian, formatTimeRange } from "@/lib/dateUtils";

interface HistoriqueEntry {
  id: string;
  examen: {
    id: string;
    code_examen: string;
    matiere: string;
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
    salle: string;
  };
  surveillant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    type: string;
  };
  session: {
    id: string;
    name: string;
    year: number;
    period: number;
  };
  is_pre_assigne: boolean;
  is_obligatoire: boolean;
  created_at: string;
}

export const HistoriqueSurveillance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSession, setFilterSession] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // Récupérer l'historique complet des attributions
  const { data: historique, isLoading } = useQuery({
    queryKey: ['historique-surveillance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attributions')
        .select(`
          id,
          is_pre_assigne,
          is_obligatoire,
          created_at,
          examen:examens (
            id,
            code_examen,
            matiere,
            date_examen,
            heure_debut,
            heure_fin,
            salle
          ),
          surveillant:surveillants (
            id,
            nom,
            prenom,
            email,
            type
          ),
          session:sessions (
            id,
            name,
            year,
            period
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HistoriqueEntry[];
    }
  });

  // Récupérer les sessions pour le filtre
  const { data: sessions } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, year, period')
        .order('year', { ascending: false })
        .order('period', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const filteredHistorique = historique?.filter(entry => {
    const matchesSearch = searchTerm === "" || 
      entry.examen.code_examen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${entry.surveillant.nom} ${entry.surveillant.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.surveillant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSession = filterSession === "ALL" || entry.session.id === filterSession;
    
    const matchesType = filterType === "ALL" || 
      (filterType === "PRE_ASSIGNE" && entry.is_pre_assigne) ||
      (filterType === "OBLIGATOIRE" && entry.is_obligatoire) ||
      (filterType === "NORMAL" && !entry.is_pre_assigne && !entry.is_obligatoire);
    
    return matchesSearch && matchesSession && matchesType;
  }) || [];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'professeur': return 'bg-blue-100 text-blue-800';
      case 'jobiste': return 'bg-purple-100 text-purple-800';
      case 'assistant': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttributionType = (entry: HistoriqueEntry) => {
    if (entry.is_obligatoire) return { label: "Obligatoire", color: "bg-red-100 text-red-800" };
    if (entry.is_pre_assigne) return { label: "Pré-assigné", color: "bg-blue-100 text-blue-800" };
    return { label: "Standard", color: "bg-green-100 text-green-800" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement de l'historique...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Historique des Surveillances</span>
          </CardTitle>
          <CardDescription>
            Historique complet de toutes les attributions de surveillance effectuées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 min-w-64">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher (code, matière, surveillant, email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les sessions</SelectItem>
                {sessions?.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type d'attribution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                <SelectItem value="NORMAL">Standard</SelectItem>
                <SelectItem value="PRE_ASSIGNE">Pré-assigné</SelectItem>
                <SelectItem value="OBLIGATOIRE">Obligatoire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Attributions</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{filteredHistorique.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Surveillants Uniques</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {new Set(filteredHistorique.map(h => h.surveillant.id)).size}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Sessions</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(filteredHistorique.map(h => h.session.id)).size}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Examen</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Surveillant</TableHead>
                  <TableHead>Type Surveillant</TableHead>
                  <TableHead>Type Attribution</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Date Attribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorique.map((entry) => {
                  const attributionType = getAttributionType(entry);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {entry.examen.code_examen}
                      </TableCell>
                      <TableCell>{entry.examen.matiere}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateWithDayBelgian(entry.examen.date_examen)}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeRange(entry.examen.heure_debut, entry.examen.heure_fin)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.examen.salle}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {entry.surveillant.nom} {entry.surveillant.prenom}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.surveillant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(entry.surveillant.type)}>
                          {entry.surveillant.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={attributionType.color}>
                          {attributionType.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{entry.session.name}</div>
                          <div className="text-gray-500">
                            {entry.session.year} - P{entry.session.period}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredHistorique.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun historique trouvé avec ces filtres</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
