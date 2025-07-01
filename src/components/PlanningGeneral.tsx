
import { useState } from 'react';
import { usePlanningGeneral } from '@/hooks/usePlanningGeneral';
import { useSessions } from '@/hooks/useSessions';
import { UCLouvainHeader } from '@/components/UCLouvainHeader';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Calendar, Clock, MapPin, BookOpen, FileText, Filter, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PlanningGeneral = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedFaculte, setSelectedFaculte] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  
  const { data: sessions = [] } = useSessions();
  const { data: planningItems = [], isLoading } = usePlanningGeneral(selectedSessionId, searchTerm);

  // Filtrer seulement les sessions qui existent réellement (avec des examens)
  const availableSessions = sessions.filter(session => session.id);

  // Extraire les facultés uniques des données
  const facultesUniques = Array.from(new Set(
    planningItems
      .map(item => item.faculte)
      .filter(faculte => faculte && faculte.trim() !== '')
  )).sort();

  // Filtrer par faculté
  const filteredItems = selectedFaculte === 'all' 
    ? planningItems
    : planningItems.filter(item => item.faculte === selectedFaculte);

  // Fonction de tri
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortBy) {
      // Tri par défaut : date puis heure de début
      const dateA = new Date(`${a.date_examen}T${a.heure_debut}`);
      const dateB = new Date(`${b.date_examen}T${b.heure_debut}`);
      return dateA.getTime() - dateB.getTime();
    }

    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'date':
        // Tri chronologique : date puis heure de début
        const dateA = new Date(`${a.date_examen}T${a.heure_debut}`);
        const dateB = new Date(`${b.date_examen}T${b.heure_debut}`);
        return sortOrder === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      
      case 'matiere':
        aValue = a.matiere.toLowerCase();
        bValue = b.matiere.toLowerCase();
        break;
      
      case 'auditoire':
        aValue = a.auditoire.toLowerCase();
        bValue = b.auditoire.toLowerCase();
        break;
      
      case 'faculte':
        aValue = (a.faculte || '').toLowerCase();
        bValue = (b.faculte || '').toLowerCase();
        break;
      
      case 'statut':
        aValue = a.statut_validation;
        bValue = b.statut_validation;
        break;
      
      case 'surveillants':
        aValue = a.surveillants.length;
        bValue = b.surveillants.length;
        break;

      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Grouper les examens par semaine
  const examensParSemaine = sortedItems.reduce((acc, item) => {
    const dateExamen = parseISO(item.date_examen);
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
    
    acc[cléSemaine].examens.push(item);
    return acc;
  }, {} as Record<string, { label: string; dateDebut: Date; examens: typeof sortedItems }>);

  // Trier les semaines par date
  const semainesTriees = Object.entries(examensParSemaine)
    .sort(([, a], [, b]) => a.dateDebut.getTime() - b.dateDebut.getTime());

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

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

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'VALIDE':
        return <Badge variant="default" className="bg-green-600">Validé</Badge>;
      case 'NECESSITE_VALIDATION':
        return <Badge variant="destructive">À valider</Badge>;
      case 'REJETE':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">Non traité</Badge>;
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
        {sortBy === column && (
          <span className="text-xs">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <UCLouvainHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Planning Général des Examens</h1>
          <p className="text-gray-600">
            Liste complète des examens importés avec détail par auditoire, organisée par semaine
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Sélection et recherche</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session d'examens
              </label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une session" />
                </SelectTrigger>
                <SelectContent>
                  {availableSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} - {session.year} (Période {session.period})
                      {session.is_active && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par matière, code examen, date, auditoire, faculté..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={!selectedSessionId}
                />
              </div>
              
              <div>
                <Select value={selectedFaculte} onValueChange={setSelectedFaculte} disabled={!selectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par faculté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les facultés</SelectItem>
                    {facultesUniques.map((faculte) => (
                      <SelectItem key={faculte} value={faculte}>
                        <div className="flex items-center space-x-2">
                          <Filter className="h-3 w-3" />
                          <span>{faculte}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Exemples : "Chimie", "2025-01-15", "Auditoire 51", "FASB"
            </p>
          </CardContent>
        </Card>

        {!selectedSessionId ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Veuillez sélectionner une session d'examens pour afficher le planning
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
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
                <span>Planning Complet des Examens par Semaine</span>
                <div className="flex items-center space-x-4">
                  {selectedFaculte !== 'all' && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Filter className="h-3 w-3" />
                      <span>{selectedFaculte}</span>
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{sortedItems.length} examens</span>
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
              {sortedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm || selectedFaculte !== 'all'
                      ? "Aucun résultat trouvé pour votre recherche"
                      : "Aucun examen importé pour cette session"
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
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <SortableHeader column="date">
                                  <Calendar className="h-4 w-4" />
                                  <span>Date</span>
                                </SortableHeader>
                                <TableHead className="min-w-[100px]">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>Horaire</span>
                                  </div>
                                </TableHead>
                                <SortableHeader column="matiere">
                                  <span>Matière</span>
                                </SortableHeader>
                                <SortableHeader column="auditoire">
                                  <MapPin className="h-4 w-4" />
                                  <span>Auditoire</span>
                                </SortableHeader>
                                <SortableHeader column="faculte">
                                  <BookOpen className="h-4 w-4" />
                                  <span>Faculté</span>
                                </SortableHeader>
                                <SortableHeader column="surveillants">
                                  <Users className="h-4 w-4" />
                                  <span>Surveillants</span>
                                </SortableHeader>
                                <TableHead className="min-w-[120px]">
                                  <div className="flex items-center space-x-1">
                                    <FileText className="h-4 w-4" />
                                    <span>Consignes</span>
                                  </div>
                                </TableHead>
                                <SortableHeader column="statut">
                                  <span>Statut</span>
                                </SortableHeader>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {weekData.examens.map((item) => (
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
                                    {item.faculte ? (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                        {item.faculte}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-500 italic text-sm">Non renseigné</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {/* Afficher les surveillants seulement sur la ligne principale */}
                                      {item.is_main_exam_row ? (
                                        <>
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
                                            <div className="flex items-center space-x-2 text-blue-600">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              <span className="text-sm italic">À venir</span>
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-500 mt-1">
                                            Total besoin: {item.besoin_reel_total}
                                            {item.pre_assignes_total > 0 && (
                                              <span className="block">Pré-assignés: {item.pre_assignes_total}</span>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-xs text-gray-400 italic">
                                          Même examen (voir ligne principale)
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2 text-blue-600">
                                      <FileText className="h-3 w-3" />
                                      <span className="text-sm italic">À venir</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getStatutBadge(item.statut_validation)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
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
