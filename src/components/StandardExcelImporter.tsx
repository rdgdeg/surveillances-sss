import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Clock, Search, Edit2, Save, X, Trash2, Loader2, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import { AuditoireComplianceChecker } from "@/components/AuditoireComplianceChecker";

interface StandardExamenData {
  jour: string;
  duree: number;
  heure_debut: string;
  heure_fin: string;
  heure_arrivee_surveillance: string;
  activite: string;
  code: string;
  auditoires: string;
  auditoires_originaux: string;
  groupes_etudiants: string;
  enseignants: string;
  code_cours_extrait: string;
  code_complet_original: string;
  type_detecte: string;
  statut_validation: string;
  nombre_surveillants_calcule: number;
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

interface ContrainteAuditoire {
  auditoire: string;
  nombre_surveillants_requis: number;
}

export const StandardExcelImporter = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingResult | null>(null);
  const [parsedData, setParsedData] = useState<StandardExamenData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<StandardExamenData>>({});
  const [contraintesAuditoires, setContraintesAuditoires] = useState<ContrainteAuditoire[]>([]);

  // Charger les contraintes d'auditoires
  const loadContraintesAuditoires = async () => {
    try {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (error) throw error;
      setContraintesAuditoires(data || []);
    } catch (error) {
      console.error('Erreur chargement contraintes:', error);
    }
  };

  const getNombreSurveillants = (auditoire: string): number => {
    const contrainte = contraintesAuditoires.find(c => c.auditoire === auditoire);
    return contrainte ? contrainte.nombre_surveillants_requis : 1; // Fallback à 1
  };

  const extraireCodeCours = (activite: string): string => {
    const match = activite.match(/([A-Z]+\d+)/);
    return match ? match[1] : activite.split('=')[0].split('+')[0].trim();
  };

  const classifierCode = (activite: string): { type_detecte: string; statut_validation: string } => {
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
      const cleaned = dureeValue.trim();

      // Format comme "04h30" -> convertir en heures décimales
      const matchH = cleaned.match(/(\d+)h(\d+)/i);
      if (matchH) {
        const heures = parseInt(matchH[1]);
        const minutes = parseInt(matchH[2]);
        return heures + (minutes / 60);
      }

      // Format comme "4h" -> convertir en heures
      const matchH2 = cleaned.match(/(\d+)h$/i);
      if (matchH2) {
        return parseInt(matchH2[1]);
      }

      // Format comme "4:30" -> convertir en heures décimales
      const match = cleaned.match(/(\d+):(\d+)/);
      if (match) {
        const heures = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return heures + (minutes / 60);
      }

      // Format "HHMM" -> convertir en heures décimales
      if (/^\d{4}$/.test(cleaned)) {
        const heures = parseInt(cleaned.slice(0, 2));
        const minutes = parseInt(cleaned.slice(2, 4));
        return heures + (minutes / 60);
      }

      // Format décimal comme "4.5"
      const decimal = parseFloat(cleaned);
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

  const formatTime = (value: any): string => {
    if (!value) return '08:00';
    
    if (typeof value === 'number') {
      // Gestion des nombres Excel (fraction de jour)
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (typeof value === 'string') {
      const cleaned = value.trim();
      
      // Format avec "h" comme "08h30" -> "08:30"
      const matchH = cleaned.match(/(\d{1,2})h(\d{2})/i);
      if (matchH) {
        const heures = matchH[1].padStart(2, '0');
        const minutes = matchH[2];
        return `${heures}:${minutes}`;
      }
      
      // Format avec "h" seul comme "08h" -> "08:00"
      const matchH2 = cleaned.match(/(\d{1,2})h$/i);
      if (matchH2) {
        const heures = matchH2[1].padStart(2, '0');
        return `${heures}:00`;
      }
      
      // Format déjà correct "HH:MM"
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m}`;
      }
      
      // Format "HHMM" -> "HH:MM"
      if (/^\d{4}$/.test(cleaned)) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
      }
      
      // Format "H:MM" -> "HH:MM"
      if (/^\d{1}:\d{2}$/.test(cleaned)) {
        return `0${cleaned}`;
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

  const separerAuditoires = (auditoires: string): string[] => {
    return auditoires.split(',').map(a => a.trim()).filter(a => a.length > 0);
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
          const auditoiresDetectes = new Set<string>(); // Collecter les auditoires

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
              auditoiresDetectes.add(auditoire.trim()); // Collecter l'auditoire
              
              const estDoublon = await verifierDoublon(codeCours, auditoire);
              
              if (estDoublon) {
                doublonsEvites++;
                console.log(`Doublon évité: ${codeCours} - ${auditoire}`);
                continue;
              }

              const nombreSurveillants = getNombreSurveillants(auditoire);

              examensData.push({
                jour: String(row[0] || '').trim(),
                duree: duree,
                heure_debut: heureDebut,
                heure_fin: heureFin,
                heure_arrivee_surveillance: heureArrivee,
                activite: activite,
                code: String(row[5] || '').trim(),
                auditoires: auditoire,
                auditoires_originaux: auditoires,
                groupes_etudiants: String(row[7] || '').trim(),
                enseignants: String(row[8] || '').trim(),
                code_cours_extrait: codeCours,
                code_complet_original: activite,
                type_detecte,
                statut_validation,
                nombre_surveillants_calcule: nombreSurveillants
              });
            }
          }

          // Vérifier la conformité des auditoires détectés
          console.log('🔍 Auditoires détectés dans l\'import:', Array.from(auditoiresDetectes));
          
          // Vérifier si des auditoires manquent des contraintes
          const auditoiresSansContraintes = Array.from(auditoiresDetectes).filter(auditoire => 
            !contraintesAuditoires.some(c => c.auditoire === auditoire)
          );

          if (auditoiresSansContraintes.length > 0) {
            console.warn('⚠️ Auditoires sans contraintes détectés:', auditoiresSansContraintes);
            // Note: L'alerte sera visible via le composant AuditoireComplianceChecker
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

  const formatDateFromJour = (jour: string): string => {
    console.log('🔍 Formatage de la date:', jour);
    try {
      // Si déjà au format ISO (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
        console.log('✅ Date déjà au format ISO:', jour);
        return jour;
      }
      
      // Si au format DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(jour)) {
        const [day, month, year] = jour.split('/');
        const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('✅ Date convertie DD/MM/YYYY vers ISO:', jour, '->', formatted);
        return formatted;
      }
      
      // Essayer de parser comme date normale
      const date = new Date(jour);
      if (!isNaN(date.getTime())) {
        const formatted = date.toISOString().split('T')[0];
        console.log('✅ Date parsée vers ISO:', jour, '->', formatted);
        return formatted;
      }
      
      throw new Error(`Format de date non reconnu: ${jour}`);
    } catch (error) {
      console.error('❌ Erreur formatage date:', error);
      const fallback = new Date().toISOString().split('T')[0];
      console.log('⚠️ Utilisation date par défaut:', fallback);
      return fallback;
    }
  };

  const validateTimeFormat = (time: string): string => {
    console.log('🔍 Validation format heure:', time);
    
    // Vérifier le format HH:MM
    if (!/^\d{2}:\d{2}$/.test(time)) {
      console.error('❌ Format heure invalide:', time);
      throw new Error(`Format d'heure invalide: ${time}. Attendu: HH:MM`);
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 0 || hours > 23) {
      throw new Error(`Heures invalides: ${hours}. Doit être entre 0 et 23.`);
    }
    
    if (minutes < 0 || minutes > 59) {
      throw new Error(`Minutes invalides: ${minutes}. Doit être entre 0 et 59.`);
    }
    
    console.log('✅ Format heure validé:', time);
    return time;
  };

  const validateExamenData = (examen: StandardExamenData): void => {
    console.log('🔍 Validation données examen:', examen.code_cours_extrait);
    
    if (!examen.code_cours_extrait?.trim()) {
      throw new Error('Code cours manquant');
    }
    
    if (!examen.auditoires?.trim()) {
      throw new Error('Auditoire manquant');
    }
    
    if (!examen.activite?.trim()) {
      throw new Error('Activité manquante');
    }
    
    // Valider la date
    formatDateFromJour(examen.jour);
    
    // Valider les heures
    validateTimeFormat(examen.heure_debut);
    validateTimeFormat(examen.heure_fin);
    
    // Valider la durée
    if (examen.duree <= 0) {
      throw new Error(`Durée invalide: ${examen.duree}`);
    }
    
    console.log('✅ Données examen validées');
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
      // Charger les contraintes avant de parser
      await loadContraintesAuditoires();
      
      const examensData = await parseStandardExcel(file);
      setParsedData(examensData);
      setSelectedItems([]);
      
      if (examensData.length === 0) {
        toast({
          title: "Aucune donnée",
          description: "Aucun examen à traiter (possiblement tous des doublons).",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Import réussi",
          description: `${examensData.length} examens chargés et prêts pour validation.`,
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
    if (!activeSession?.id || selectedItems.length === 0) {
      toast({
        title: "Erreur de validation",
        description: "Session manquante ou aucun examen sélectionné.",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 Début validation de', selectedItems.length, 'examens');
    setIsValidating(true);

    const selectedExamens = parsedData.filter((_, index) => 
      selectedItems.includes(index.toString())
    );

    let examensGeneres = 0;
    let erreurs: string[] = [];

    try {
      for (const [index, examen] of selectedExamens.entries()) {
        console.log(`📝 Traitement examen ${index + 1}/${selectedExamens.length}:`, examen.code_cours_extrait);
        
        try {
          // Validation des données avant insertion
          validateExamenData(examen);
          
          const examenData = {
            session_id: activeSession.id,
            code_examen: examen.code_cours_extrait,
            matiere: examen.activite.split('=')[0].trim(),
            date_examen: formatDateFromJour(examen.jour),
            heure_debut: validateTimeFormat(examen.heure_debut),
            heure_fin: validateTimeFormat(examen.heure_fin),
            salle: examen.auditoires.trim(),
            nombre_surveillants: examen.nombre_surveillants_calcule,
            type_requis: 'Assistant',
            statut_validation: examen.statut_validation || 'NON_TRAITE'
          };

          console.log('📤 Insertion examen en base:', examenData);

          const { data: nouvelExamen, error: examenError } = await supabase
            .from('examens')
            .insert(examenData)
            .select()
            .single();

          if (examenError) {
            console.error('❌ Erreur insertion examen:', examenError);
            throw examenError;
          }

          console.log('✅ Examen créé avec ID:', nouvelExamen.id);

          // Créer l'entrée de validation avec remarques
          const validationData = {
            examen_id: nouvelExamen.id,
            code_original: examen.code_complet_original,
            type_detecte: examen.type_detecte,
            statut_validation: examen.statut_validation,
            commentaire: `Import Excel - Groupes: ${examen.groupes_etudiants || 'N/A'} - Enseignants: ${examen.enseignants || 'N/A'} - Surveillants calculés: ${examen.nombre_surveillants_calcule}`
          };

          console.log('📤 Insertion validation:', validationData);

          const { error: validationError } = await supabase
            .from('examens_validation')
            .insert(validationData);

          if (validationError) {
            console.error('❌ Erreur insertion validation:', validationError);
            throw validationError;
          }

          console.log('✅ Validation créée pour examen:', nouvelExamen.id);
          examensGeneres++;

        } catch (error: any) {
          console.error(`❌ Erreur pour ${examen.code_cours_extrait}:`, error);
          erreurs.push(`${examen.code_cours_extrait}: ${error.message || 'Erreur inconnue'}`);
        }
      }

      // Afficher le résultat
      if (examensGeneres > 0) {
        toast({
          title: "Validation réussie",
          description: `${examensGeneres} examens ont été créés avec succès.`,
        });

        queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
        queryClient.invalidateQueries({ queryKey: ['examens-review'] });
        
        // Nettoyer après validation réussie
        setParsedData([]);
        setSelectedItems([]);
        setProcessingStats(null);
      }

      // Afficher les erreurs s'il y en a
      if (erreurs.length > 0) {
        console.error('❌ Erreurs de validation:', erreurs);
        toast({
          title: `Erreurs de validation (${erreurs.length})`,
          description: erreurs.slice(0, 3).join('; ') + (erreurs.length > 3 ? '...' : ''),
          variant: "destructive"
        });
      }

      if (examensGeneres === 0 && erreurs.length > 0) {
        toast({
          title: "Échec de la validation",
          description: "Aucun examen n'a pu être créé. Vérifiez les données.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Erreur générale de validation:', error);
      toast({
        title: "Erreur de validation",
        description: error.message || "Une erreur inattendue s'est produite.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
      console.log('🏁 Fin du processus de validation');
    }
  };

  const deleteSelected = () => {
    if (selectedItems.length === 0) return;

    const selectedIndices = selectedItems.map(index => parseInt(index)).sort((a, b) => b - a);
    const newParsedData = [...parsedData];
    
    selectedIndices.forEach(index => {
      newParsedData.splice(index, 1);
    });

    setParsedData(newParsedData);
    setSelectedItems([]);
    
    // Recalculer les statistiques
    const statsParType = { E: 0, O: 0, AUTRES: 0 };
    newParsedData.forEach(examen => {
      if (examen.type_detecte === 'E') statsParType.E++;
      else if (examen.type_detecte === 'O') statsParType.O++;
      else statsParType.AUTRES++;
    });

    setProcessingStats(prev => prev ? {
      ...prev,
      examens_affiches: newParsedData.length,
      par_type: statsParType
    } : null);

    toast({
      title: "Examens supprimés",
      description: `${selectedIndices.length} examens ont été supprimés de la liste.`,
    });
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
    let filtered = parsedData;
    
    // Filtre par type
    if (filterType !== "ALL") {
      filtered = filtered.filter(item => item.type_detecte === filterType);
    }
    
    // Filtre par recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.code_cours_extrait.toLowerCase().includes(term) ||
        item.activite.toLowerCase().includes(term) ||
        item.auditoires.toLowerCase().includes(term) ||
        item.groupes_etudiants.toLowerCase().includes(term) ||
        item.enseignants.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const startEditing = (index: number) => {
    setEditingRow(index.toString());
    setEditedData(parsedData[index]);
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const saveEditing = () => {
    if (editingRow && editedData) {
      const index = parseInt(editingRow);
      const updatedData = [...parsedData];
      updatedData[index] = { ...updatedData[index], ...editedData };
      
      // Recalculer les champs dérivés
      const updated = updatedData[index];
      updated.code_cours_extrait = extraireCodeCours(updated.activite);
      const classification = classifierCode(updated.activite);
      updated.type_detecte = classification.type_detecte;
      updated.statut_validation = classification.statut_validation;
      updated.heure_arrivee_surveillance = calculerHeureArrivee(updated.heure_debut);
      updated.nombre_surveillants_calcule = getNombreSurveillants(updated.auditoires);
      
      setParsedData(updatedData);
      setEditingRow(null);
      setEditedData({});
      
      toast({
        title: "Modification sauvegardée",
        description: "Les données ont été mises à jour localement.",
      });
    }
  };

  const handleFieldChange = (field: keyof StandardExamenData, value: string | number) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderEditableCell = (examen: StandardExamenData, field: keyof StandardExamenData, index: number) => {
    const isEditing = editingRow === index.toString();
    const value = isEditing ? (editedData[field] ?? examen[field]) : examen[field];

    if (!isEditing) {
      return <span>{value}</span>;
    }

    if (field === 'duree') {
      return (
        <Input
          type="number"
          step="0.5"
          value={value as number}
          onChange={(e) => handleFieldChange(field, parseFloat(e.target.value) || 0)}
          className="w-20"
        />
      );
    }

    return (
      <Input
        value={value as string}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        className="w-full"
      />
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

  const filteredData = getFilteredData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Excel Standard des Examens</span>
        </CardTitle>
        <CardDescription>
          Importez le fichier Excel standardisé avec calcul automatique des surveillants par auditoire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerteur de conformité intégré */}
        {parsedData.length > 0 && (
          <div className="mb-4">
            <AuditoireComplianceChecker />
          </div>
        )}

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
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 text-sm">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Calcul automatique des surveillants</span>
                </div>
                <p className="text-blue-700 text-xs mt-1">
                  Le nombre de surveillants sera calculé automatiquement selon les contraintes d'auditoires (défaut: 1)
                </p>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-sm text-gray-600">
              Analyse du fichier et calcul des besoins en surveillance...
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
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
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
                onClick={deleteSelected} 
                disabled={selectedItems.length === 0}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer la sélection ({selectedItems.length})
              </Button>
              
              <Button 
                onClick={validateSelected} 
                disabled={selectedItems.length === 0 || isValidating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    Valider la sélection ({selectedItems.length})
                  </>
                )}
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Affichage de {filteredData.length} examens sur {parsedData.length}
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
                    <th className="p-3 text-left">Actions</th>
                    <th className="p-3 text-left">Code Cours</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Durée</th>
                    <th className="p-3 text-left">Début</th>
                    <th className="p-3 text-left">Fin</th>
                    <th className="p-3 text-left">Arrivée</th>
                    <th className="p-3 text-left">Activité</th>
                    <th className="p-3 text-left">Auditoire</th>
                    <th className="p-3 text-left">Nb Surveil.</th>
                    <th className="p-3 text-left">Groupes</th>
                    <th className="p-3 text-left">Enseignants</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((examen, filteredIndex) => {
                    const actualIndex = parsedData.indexOf(examen);
                    const isEditing = editingRow === actualIndex.toString();
                    return (
                      <tr key={actualIndex} className={selectedItems.includes(actualIndex.toString()) ? "bg-blue-50" : ""}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(actualIndex.toString())}
                            onChange={() => handleSelectItem(actualIndex.toString())}
                          />
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={saveEditing}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEditing(actualIndex)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                        <td className="p-3 font-mono">{examen.code_cours_extrait}</td>
                        <td className="p-3">
                          <Badge className={getTypeColor(examen.type_detecte)}>
                            {getTypeLabel(examen.type_detecte)}
                          </Badge>
                        </td>
                        <td className="p-3">{renderEditableCell(examen, 'jour', actualIndex)}</td>
                        <td className="p-3">
                          {isEditing ? renderEditableCell(examen, 'duree', actualIndex) : formatDureeDisplay(examen.duree)}
                        </td>
                        <td className="p-3">{renderEditableCell(examen, 'heure_debut', actualIndex)}</td>
                        <td className="p-3">{renderEditableCell(examen, 'heure_fin', actualIndex)}</td>
                        <td className="p-3 text-blue-600">{examen.heure_arrivee_surveillance}</td>
                        <td className="p-3 max-w-48 truncate">{renderEditableCell(examen, 'activite', actualIndex)}</td>
                        <td className="p-3">{renderEditableCell(examen, 'auditoires', actualIndex)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="bg-purple-50 text-purple-800">
                            {examen.nombre_surveillants_calcule}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">{renderEditableCell(examen, 'groupes_etudiants', actualIndex)}</td>
                        <td className="p-3 text-xs">{renderEditableCell(examen, 'enseignants', actualIndex)}</td>
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
                setSearchTerm("");
                setEditingRow(null);
                setEditedData({});
              }}
              variant="outline"
            >
              Importer un autre fichier
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Calcul automatique des surveillants :</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• <strong>Basé sur les contraintes d'auditoires :</strong> Le système consulte automatiquement vos contraintes configurées</div>
            <div>• <strong>Valeur par défaut :</strong> 1 surveillant si l'auditoire n'a pas de contrainte spécifique</div>
            <div>• <strong>Modifiable :</strong> Vous pouvez ajuster ces valeurs après validation</div>
            <div>• <strong>Visible dans la colonne :</strong> "Nb Surveil." pour vérification avant validation</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
