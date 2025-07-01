
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Clock, MapPin, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExamenSurveillance {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  code_examen?: string;
  salle: string;
  type: string;
  surveillants: Array<{
    id: string;
    nom: string;
    prenom: string;
    email: string;
  }>;
}

interface PlanningViewProps {
  examens: ExamenSurveillance[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const PlanningView = ({ examens, searchTerm, onSearchChange }: PlanningViewProps) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Filtrer les examens (retirer ceux du 22 juin qui sont des erreurs)
  const examensFiltered = examens.filter(examen => {
    const dateExamen = new Date(examen.date);
    // Exclure les examens du 22 juin (mois 5 car les mois commencent à 0)
    return !(dateExamen.getMonth() === 5 && dateExamen.getDate() === 22);
  });

  // Grouper les examens par semaine
  const examensParSemaine = examensFiltered.reduce((acc, examen) => {
    const dateExamen = parseISO(examen.date);
    const debutSemaine = startOfWeek(dateExamen, { locale: fr, weekStartsOn: 1 });
    const finSemaine = endOfWeek(dateExamen, { locale: fr, weekStartsOn: 1 });
    
    const cléSemaine = format(debutSemaine, 'yyyy-MM-dd', { locale: fr });
    const labelSemaine = `${format(debutSemaine, 'dd MMM', { locale: fr })} - ${format(finSemaine, 'dd MMM yyyy', { locale: fr })}`;
    
    if (!acc[cléSemaine]) {
      acc[cléSemaine] = {
        label: labelSemaine,
        dateDebut: debutSemaine,
        examens: []
      };
    }
    
    acc[cléSemaine].examens.push(examen);
    return acc;
  }, {} as Record<string, { label: string; dateDebut: Date; examens: ExamenSurveillance[] }>);

  // Trier les semaines par date
  const semainesTriees = Object.entries(examensParSemaine)
    .sort(([, a], [, b]) => a.dateDebut.getTime() - b.dateDebut.getTime());

  const toggleWeekExpansion = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  const expandAllWeeks = () => {
    setExpandedWeeks(new Set(Object.keys(examensParSemaine)));
  };

  const collapseAllWeeks = () => {
    setExpandedWeeks(new Set());
  };

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
    <div className="space-y-6">
      <Card>
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
              placeholder="Filtrer par nom, email, matière ou salle..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Planning de surveillance - Vue globale</span>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{examensFiltered.length} examens</span>
              </Badge>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllWeeks}
                  disabled={Object.keys(examensParSemaine).length === 0}
                >
                  Tout développer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllWeeks}
                  disabled={Object.keys(examensParSemaine).length === 0}
                >
                  Tout réduire
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Retrouvez tous les examens, salles, horaires et leurs surveillants attribués.
            Utilisez la recherche pour filtrer sur un surveillant (nom, prénom ou email), une matière ou une salle.
          </p>

          {examensFiltered.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm 
                  ? "Aucun résultat trouvé pour votre recherche"
                  : "Aucun examen avec surveillance attribuée"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {semainesTriees.map(([weekKey, weekData]) => (
                <div key={weekKey} className="border rounded-lg overflow-hidden">
                  <div
                    className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleWeekExpansion(weekKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedWeeks.has(weekKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          Semaine du {weekData.label}
                        </h3>
                        <Badge variant="secondary">
                          {weekData.examens.length} examen{weekData.examens.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {expandedWeeks.has(weekKey) && (
                    <div className="divide-y divide-gray-200">
                      {weekData.examens.map((examen) => (
                        <div key={examen.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {formatDate(examen.date)}
                                </Badge>
                                <div className="flex items-center space-x-1 text-sm text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTime(examen.heure_debut)} – {formatTime(examen.heure_fin)}</span>
                                </div>
                                <Badge className="bg-blue-100 text-blue-800">
                                  {examen.salle}
                                </Badge>
                              </div>
                              
                              <h4 className="font-medium text-gray-900 mb-1">
                                {examen.matiere}
                                {examen.code_examen && (
                                  <span className="text-sm text-gray-500 ml-2">({examen.code_examen})</span>
                                )}
                              </h4>
                              
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {examen.type}
                                </span>
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <div className="text-sm font-medium mb-1 flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>Surveillants:</span>
                              </div>
                              {examen.surveillants.length > 0 ? (
                                <div className="space-y-1">
                                  {examen.surveillants.map((surveillant) => (
                                    <div key={surveillant.id} className="text-sm text-gray-600">
                                      {surveillant.prenom} {surveillant.nom}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  Aucun surveillant attribué
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
