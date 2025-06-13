
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface StandardExamenData {
  jour: string;
  duree: number;
  heure_debut: string;
  heure_fin: string;
  activite: string;
  code: string;
  auditoires: string;
  groupes_etudiants: string;
  enseignants: string;
  code_cours_extrait: string;
  code_complet_original: string;
}

interface ProcessingResult {
  total_lignes: number;
  examens_affiches: number;
  doublons_evites: number;
}

export const StandardExcelImporter = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingResult | null>(null);
  const [parsedData, setParsedData] = useState<StandardExamenData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const extraireCodeCours = (activite: string): string => {
    // Extraire le premier code cours avant le +
    // Ex: "WDENT1337+WDENT1338 = E à confirmer" → "WDENT1337"
    const match = activite.match(/([A-Z]+\d+)/);
    return match ? match[1] : activite.split('=')[0].split('+')[0].trim();
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

          for (const row of rows) {
            const activite = String(row[4] || '').trim();
            const auditoires = String(row[6] || '').trim();
            
            if (!activite || !auditoires) continue;

            const codeCours = extraireCodeCours(activite);
            const auditoiresList = separerAuditoires(auditoires);

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
                duree: parseFloat(String(row[1] || '0')),
                heure_debut: formatTime(row[2]),
                heure_fin: formatTime(row[3]),
                activite: activite,
                code: String(row[5] || '').trim(),
                auditoires: auditoire,
                groupes_etudiants: String(row[7] || '').trim(),
                enseignants: String(row[8] || '').trim(),
                code_cours_extrait: codeCours,
                code_complet_original: activite
              });
            }
          }

          setProcessingStats({
            total_lignes: rows.length,
            examens_affiches: examensData.length,
            doublons_evites: doublonsEvites
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
      const hours = Math.floor(value * 24);
      const minutes = Math.floor((value * 24 * 60) % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/[^\d:]/g, '');
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        return cleaned;
      }
    }
    
    return '08:00';
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
          statut_validation: 'VALIDE'
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
            type_detecte: 'MANUEL',
            statut_validation: 'VALIDE',
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
    if (selectedItems.length === parsedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(parsedData.map((_, index) => index.toString()));
    }
  };

  const handleSelectItem = (index: string) => {
    setSelectedItems(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Excel Standard des Examens</span>
        </CardTitle>
        <CardDescription>
          Importez le fichier Excel standardisé avec vérification des doublons et sélection manuelle
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
              Analyse du fichier et vérification des doublons...
            </p>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-4">
            {processingStats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{processingStats.total_lignes}</div>
                  <div className="text-sm text-blue-800">Lignes Excel</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{processingStats.examens_affiches}</div>
                  <div className="text-sm text-green-800">Examens à traiter</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{processingStats.doublons_evites}</div>
                  <div className="text-sm text-orange-800">Doublons évités</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <Button onClick={handleSelectAll} variant="outline">
                {selectedItems.length === parsedData.length ? 'Tout désélectionner' : 'Tout sélectionner'}
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
                        checked={selectedItems.length === parsedData.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left">Code Cours</th>
                    <th className="p-3 text-left">Date/Heure</th>
                    <th className="p-3 text-left">Auditoire</th>
                    <th className="p-3 text-left">Groupes</th>
                    <th className="p-3 text-left">Enseignants</th>
                    <th className="p-3 text-left">Remarques</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((examen, index) => (
                    <tr key={index} className={selectedItems.includes(index.toString()) ? "bg-blue-50" : ""}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(index.toString())}
                          onChange={() => handleSelectItem(index.toString())}
                        />
                      </td>
                      <td className="p-3 font-mono">{examen.code_cours_extrait}</td>
                      <td className="p-3">
                        <div>{examen.jour}</div>
                        <div className="text-gray-500 text-xs">
                          {examen.heure_debut} - {examen.heure_fin}
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
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => {
                setParsedData([]);
                setSelectedItems([]);
                setProcessingStats(null);
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
            <div><strong>Colonne B :</strong> Durée (h) (durée en heures)</div>
            <div><strong>Colonne C :</strong> Début (heure de début)</div>
            <div><strong>Colonne D :</strong> Fin (heure de fin)</div>
            <div><strong>Colonne E :</strong> Activité (contient le code d'examen)</div>
            <div><strong>Colonne F :</strong> Code (code supplémentaire)</div>
            <div><strong>Colonne G :</strong> Auditoires (salles séparées par virgules)</div>
            <div><strong>Colonne H :</strong> Groupes d'étudiants (noms des groupes)</div>
            <div><strong>Colonne I :</strong> Enseignants (noms des enseignants)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
