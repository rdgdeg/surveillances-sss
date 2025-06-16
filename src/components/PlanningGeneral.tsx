
import { useState } from 'react';
import { usePlanningGeneral } from '@/hooks/usePlanningGeneral';
import { UCLouvainHeader } from '@/components/UCLouvainHeader';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PlanningGeneral = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: planningItems = [], isLoading } = usePlanningGeneral(searchTerm);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return timeString.slice(0, 5); // HH:MM
    } catch {
      return timeString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UCLouvainHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Planning Général des Surveillances</h1>
          <p className="text-gray-600">
            Horaire complet des examens avec attributions des surveillants par auditoire
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Recherche</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par surveillant, examen, date, auditoire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Exemples : "Dubois", "Chimie", "2025-01-15", "Auditoire 51"
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uclouvain-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement du planning...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Planning des Examens</span>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{planningItems.length} lignes</span>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planningItems.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm 
                      ? "Aucun résultat trouvé pour votre recherche"
                      : "Aucun examen planifié pour le moment"
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Date</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Horaire</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[200px]">Matière</TableHead>
                        <TableHead className="min-w-[120px]">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>Auditoire</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[250px]">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>Surveillants</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[100px]">Faculté</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planningItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {formatDate(item.date_examen)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>{formatTime(item.heure_debut)}</span>
                              <span className="text-gray-500">→ {formatTime(item.heure_fin)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.matiere}</div>
                              {item.code_examen && (
                                <div className="text-sm text-gray-500">{item.code_examen}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.auditoire}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.surveillants.length > 0 ? (
                                item.surveillants.map((surveillant) => (
                                  <div key={surveillant.id} className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm">
                                      {surveillant.prenom} {surveillant.nom}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center space-x-2 text-orange-600">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className="text-sm italic">Non attribué</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {item.surveillants.length}/{item.nombre_surveillants_requis} requis
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {item.faculte || 'Non définie'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};
