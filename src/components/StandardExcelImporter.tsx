import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

interface StandardExamenData {
  jour: string;
  duree: number;
  heure_debut: string;
  heure_fin: string;
  heure_arrivee_surveillance: string;
  activite: string;
  code: string;
  auditoires: string;
  groupes_etudiants: string;
  enseignants: string;
  code_cours_extrait: string;
  code_complet_original: string;
  type_detecte: string;
  statut_validation: string;
}

interface ProcessingResult {
  total_lignes: number;
  examens_affiches: number;
  doublons_evites: number;
  par_type: {
    E: number;
    O: number;
    AUTRES: number;
  };
}

export const StandardExcelImporter = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingResult | null>(null);
  const [parsedData, setParsedData] = useState<StandardExamenData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");

  const extraireCodeCours = (activite: string): string => {
    // Extraire le premier code cours avant le +
    // Ex: "WDENT1337+WDENT1338 = E à confirmer" → "WDENT1337"
    const match = activite.match(/([A-Z]+\d+)/);
    return match ? match[1] : activite.split('=')[0].split('+')[0].trim();
  };

  const classifierCode = (activite: string): { type_detecte: string; statut_validation: string } => {
    const activiteLower = activite.toLowerCase();
    
    if (activite.match(/.*=\s*E$/i)) {
      return { type_detecte: 'E', statut_validation: 'VALIDE' };
    }
    
    if (activite.match(/.*=\s*O$/i)) {
      return { type_detecte: 'O', statut_validation: 'REJETE' };
    }
    
    if (activite.match(/.*=\s*E\+.*$/i)) {
      return { type_detecte: 'E+O', statut_validation: 'NECESSITE_VALIDATION' };
    }
    
    return { type_detecte: 'AUTRES', statut_validation: 'NECESSITE_VALIDATION' };
  };

  const convertirDuree = (dureeValue: any): number => {
    if (typeof dureeValue === 'number') {
      return dureeValue;
    }
    
    if (typeof dureeValue === 'string') {
      // Format comme "04h30" ou "4:30"
      const match = dureeValue.match(/(\d+)[h:](\d+)/);
      if (match) {
        const heures = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return heures + (minutes / 60);
      }
      
      // Format décimal comme "4.5"
      const decimal = parseFloat(dureeValue);
      if (!isNaN(decimal)) {
        return decimal;
      }
    }
    
    return 0;
  };

  const verifierDoublon = async (codeCours: string, auditoire: string): Promise<boolean> => {
    if (!activeSession?.id) return false;

    const { data, error } = await supabase
      .from('examens')
      .select('id')
      .eq('session_id', activeSession.id)
      .eq('code_examen', codeCours)
      .eq('salle', auditoire.trim())
      .limit(1);

    if (error) {
      console.error('Erreur vérification doublon:', error);
      return false;
    }

    return data && data.length > 0;
  };

  const parseStandardExcel = async (file: File): Promise<StandardExamenData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            reject(new Error("Le fichier doit contenir au moins un en-tête et une ligne de données"));
            return;
          }

          const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null));
          const examensData: StandardExamenData[] = [];
          let doublonsEvites = 0;
          const statsParType = { E: 0, O: 0, AUTRES: 0 };

          for (const row of rows) {
            const activite = String(row[4] || '').trim();
            const auditoires = String(row[6] || '').trim();
            
            if (!activite || !auditoires) continue;

            const codeCours = extraireCodeCours(activite);
            const auditoiresList = separerAuditoires(auditoires);
            const { type_detecte, statut_validation } = classifierCode(activite);
            const duree = convertirDuree(row[1]);
            const heureDebut = formatTime(row[2]);
            const heureFin = formatTime(row[3]);
            const heureArrivee = calculerHeureArrivee(heureDebut);

            // Compter par type
            if (type_detecte === 'E') statsParType.E++;
            else if (type_detecte === 'O') statsParType.O++;
            else statsParType.AUTRES++;

            // Vérifier les doublons pour chaque auditoire
            for (const auditoire of auditoiresList) {
              const estDoublon = await verifierDoublon(codeCours, auditoire);
              
              if (estDoublon) {
                doublonsEvites++;
                console.log(`Doublon évité: ${codeCours} - ${auditoire}`);
                continue;
              }

              examensData.push({
                jour: String(row[0] || '').trim(),
                duree: duree,
                heure_debut: heureDebut,
                heure_fin: heureFin,
                heure_arrivee_surveillance: heureArrivee,
                activite: activite,
                code: String(row[5] || '').trim(),
                auditoires: auditoire,
                groupes_etudiants: String(row[7] || '').trim(),
                enseignants: String(row[8] || '').trim(),
                code_cours_extrait: codeCours,
                code_complet_original: activite,
                type_detecte,
                statut_validation
              });
            }
          }

          setProcessingStats({
            total_lignes: rows.length,
            examens_affiches: examensData.length,
            doublons_evites: doublonsEvites,
            par_type: statsParType
          });

          console.log('Données Excel parsées:', examensData);
          resolve(examensData);
        } catch (error) {
          reject(new Error("Impossible de lire le fichier Excel. Vérifiez le format."));
        }
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  };

  const separerAuditoires = (auditoires: string): string[] => {
    return auditoires.split(',').map(a => a.trim()).filter(a => a.length > 0);
  };

  const formatTime = (value: any): string => {
    if (!value) return '08:00';
    
    if (typeof value === 'number') {
      // Gestion des nombres Excel (fraction de jour)
      const hours = Math.floor(value * 24);
      const minutes = Math.floor((value * 24 * 60) % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/[^\d:]/g, '');
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      
      // Format "0830" -> "08:30"
      if (/^\d{4}$/.test(cleaned)) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
      }
    }
    
    return '08:00';
  };

  const calculerHeureArrivee = (heureDebut: string): string => {
    try {
      const [heures, minutes] = heureDebut.split(':').map(Number);
      const totalMinutes = heures * 60 + minutes - 45; // 45 minutes avant
      
      const nouvellesHeures = Math.floor(totalMinutes / 60);
      const nouvellesMinutes = totalMinutes % 60;
      
      return `${nouvellesHeures.toString().padStart(2, '0')}:${nouvellesMinutes.toString().padStart(2, '0')}`;
    } catch {
      return '07:15'; // Défaut si erreur
    }
  };

  const formatDateFromJour = (jour: string): string => {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
        return jour;
      }
      
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(jour)) {
        const [day, month, year] = jour.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      const date = new Date(jour);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formatDureeDisplay = (duree: number): string => {
    const heures = Math.floor(duree);
    const minutes = Math.round((duree - heures) * 60);
    
    if (minutes === 0) {
      return `${heures}h`;
    }
    return `${heures}h${minutes.toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'E': return 'bg-green-100 text-green-800';
      case 'O': return 'bg-red-100 text-red-800';
      case 'E+O': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'E': return 'Écrit';
      case 'O': return 'Oral';
      case 'E+O': return 'Mixte';
      default: return 'Autre';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!activeSession?.id) {
      toast({
        title: "Session manquante",
        description: "Veuillez sélectionner une session active avant d'importer.",
        variant: "destructive"
      });
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un fichier Excel (.xlsx ou .xls).",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStats(null);
    setParsedData([]);

    try {
      const examensData = await parseStandardExcel(file);
      setParsedData(examensData);
      setSelectedItems([]);
      
      if (examensData.length === 0) {
        toast({
          title: "Aucune donnée",
          description: "Aucun examen à traiter (possiblement tous des doublons).",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "Erreur de lecture",
        description: error.message || "Impossible de lire le fichier.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateSelected = async () => {
    if (!activeSession?.id || selectedItems.length === 0) return;

    const selectedExamens = parsedData.filter((_, index) => 
      selectedItems.includes(index.toString())
    );

    let examensGeneres = 0;

    for (const examen of selectedExamens) {
      try {
        const examenData = {
          session_id: activeSession.id,
          code_examen: examen.code_cours_extrait,
          matiere: examen.activite.split('=')[0].trim(),
          date_examen: formatDateFromJour(examen.jour),
          heure_debut: examen.heure_debut,
          heure_fin: examen.heure_fin,
          salle: examen.auditoires,
          nombre_surveillants: 1, // Valeur par défaut
          type_requis: 'Assistant',
          statut_validation: examen.statut_validation
        };

        const { data: nouvelExamen, error: examenError } = await supabase
          .from('examens')
          .insert(examenData)
          .select()
          .single();

        if (examenError) throw examenError;

        // Créer l'entrée de validation avec remarques
        const { error: validationError } = await supabase
          .from('examens_validation')
          .insert({
            examen_id: nouvelExamen.id,
            code_original: examen.code_complet_original,
            type_detecte: examen.type_detecte,
            statut_validation: examen.statut_validation,
            commentaire: `Import manuel - Groupes: ${examen.groupes_etudiants} - Enseignants: ${examen.enseignants}`
          });

        if (validationError) throw validationError;

        examensGeneres++;
      } catch (error: any) {
        console.error(`Erreur pour ${examen.code_cours_extrait}:`, error);
      }
    }

    if (examensGeneres > 0) {
      toast({
        title: "Validation réussie",
        description: `${examensGeneres} examens ont été créés avec succès.`,
      });

      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      
      // Nettoyer après validation
      setParsedData([]);
      setSelectedItems([]);
      setProcessingStats(null);
    }
  };

  const handleSelectAll = () => {
    const filteredData = getFilteredData();
    const filteredIndices = parsedData
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => filterType === "ALL" || item.type_detecte === filterType)
      .map(({ index }) => index.toString());

    if (selectedItems.length === filteredIndices.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredIndices);
    }
  };

  const handleSelectItem = (index: string) => {
    setSelectedItems(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getFilteredData = () => {
    if (filterType === "ALL") return parsedData;
    return parsedData.filter(item => item.type_detecte === filterType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const filteredData = getFilteredData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Excel Standard des Examens</span>
        </CardTitle>
        <CardDescription>
          Importez le fichier Excel standardisé avec classification automatique et sélection par type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProcessing && parsedData.length === 0 && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Glissez votre fichier Excel ici</p>
              <p className="text-sm text-gray-500">Format : Jour | Durée | Début | Fin | Activité | Code | Auditoires | Groupes | Enseignants</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Parcourir les fichiers</span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-sm text-gray-600">
              Analyse du fichier et classification automatique...
            </p>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-4">
            {processingStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{processingStats.total_lignes}</div>
                  <div className="text-sm text-blue-800">Lignes Excel</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{processingStats.par_type.E}</div>
                  <div className="text-sm text-green-800">Écrits (=E)</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{processingStats.par_type.O}</div>
                  <div className="text-sm text-red-800">Oraux (=O)</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{processingStats.par_type.AUTRES}</div>
                  <div className="text-sm text-orange-800">Autres</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{processingStats.doublons_evites}</div>
                  <div className="text-sm text-yellow-800">Doublons évités</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 items-center flex-wrap">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types ({parsedData.length})</SelectItem>
                  <SelectItem value="E">Écrits ({processingStats?.par_type.E || 0})</SelectItem>
                  <SelectItem value="O">Oraux ({processingStats?.par_type.O || 0})</SelectItem>
                  <SelectItem value="AUTRES">Autres ({processingStats?.par_type.AUTRES || 0})</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleSelectAll} variant="outline">
                {selectedItems.length === filteredData.length && filteredData.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
              
              <Button 
                onClick={validateSelected} 
                disabled={selectedItems.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Valider la sélection ({selectedItems.length})
              </Button>
            </div>

            <div className="overflow-x-auto max-h-96 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left">Code Cours</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Durée</th>
                    <th className="p-3 text-left">Examen</th>
                    <th className="p-3 text-left">Surveillance</th>
                    <th className="p-3 text-left">Auditoire</th>
                    <th className="p-3 text-left">Groupes</th>
                    <th className="p-3 text-left">Enseignants</th>
                    <th className="p-3 text-left">Remarques</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((examen, originalIndex) => {
                    const actualIndex = parsedData.indexOf(examen);
                    return (
                      <tr key={actualIndex} className={selectedItems.includes(actualIndex.toString()) ? "bg-blue-50" : ""}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(actualIndex.toString())}
                            onChange={() => handleSelectItem(actualIndex.toString())}
                          />
                        </td>
                        <td className="p-3 font-mono">{examen.code_cours_extrait}</td>
                        <td className="p-3">
                          <Badge className={getTypeColor(examen.type_detecte)}>
                            {getTypeLabel(examen.type_detecte)}
                          </Badge>
                        </td>
                        <td className="p-3">{examen.jour}</td>
                        <td className="p-3 font-medium">{formatDureeDisplay(examen.duree)}</td>
                        <td className="p-3">
                          <div className="text-xs space-y-1">
                            <div className="font-medium">
                              {examen.heure_debut} - {examen.heure_fin}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-xs text-blue-600">
                            <div>Arrivée: {examen.heure_arrivee_surveillance}</div>
                            <div>Fin: {examen.heure_fin}</div>
                          </div>
                        </td>
                        <td className="p-3">{examen.auditoires}</td>
                        <td className="p-3 text-xs">{examen.groupes_etudiants}</td>
                        <td className="p-3 text-xs">{examen.enseignants}</td>
                        <td className="p-3 text-xs text-gray-600">
                          {examen.code_complet_original !== examen.code_cours_extrait && (
                            <div className="bg-yellow-100 p-1 rounded text-xs">
                              Original: {examen.code_complet_original}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => {
                setParsedData([]);
                setSelectedItems([]);
                setProcessingStats(null);
                setFilterType("ALL");
              }}
              variant="outline"
            >
              Importer un autre fichier
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Format Excel attendu :</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Colonne A :</strong> Jour (date de l'examen)</div>
            <div><strong>Colonne B :</strong> Durée (h) (format: 04h30 ou 4.5)</div>
            <div><strong>Colonne C :</strong> Début (heure de début examen)</div>
            <div><strong>Colonne D :</strong> Fin (heure de fin examen)</div>
            <div><strong>Colonne E :</strong> Activité (contient le code d'examen)</div>
            <div><strong>Colonne F :</strong> Code (code supplémentaire)</div>
            <div><strong>Colonne G :</strong> Auditoires (salles séparées par virgules)</div>
            <div><strong>Colonne H :</strong> Groupes d'étudiants (noms des groupes)</div>
            <div><strong>Colonne I :</strong> Enseignants (noms des enseignants)</div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Horaires de surveillance :</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• <strong>Heure d'arrivée :</strong> 45 minutes avant le début de l'examen</div>
              <div>• <strong>Heure de fin :</strong> Identique à la fin de l'examen</div>
              <div>• Ces horaires s'adaptent automatiquement si vous modifiez les heures d'examen</div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Classification automatique :</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">Écrit</Badge>
                <span>Codes se terminant par "=E" (validés automatiquement)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800">Oral</Badge>
                <span>Codes se terminant par "=O" (rejetés automatiquement)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-100 text-orange-800">Mixte</Badge>
                <span>Codes contenant "=E+" (nécessitent validation)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">Autre</Badge>
                <span>Autres formats (nécessitent validation)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
