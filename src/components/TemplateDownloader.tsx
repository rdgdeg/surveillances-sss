import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { formatDateBelgian } from "@/lib/dateUtils";

interface Template {
  name: string;
  description: string;
  filename: string;
  columns: string[];
  instructions: string[];
  examples: any[];
}

const templates: Template[] = [
  {
    name: "Surveillants",
    description: "Liste des surveillants avec informations personnelles et type",
    filename: "template_surveillants.xlsx",
    columns: ["Nom", "Prénom", "Email", "Type", "Statut"],
    instructions: [
      "1. Remplissez une ligne par surveillant",
      "2. Type doit être: PAT, Assistant, ou Jobiste",
      "3. Statut doit être: actif ou inactif",
      "4. L'email doit être unique et valide (clé de recoupement)",
      "5. Tous les champs sont obligatoires sauf le statut (par défaut: actif)",
      "6. Cette liste servira de référence pour tous les autres fichiers"
    ],
    examples: [
      ["Dupont", "Marie", "marie.dupont@uclouvain.be", "PAT", "actif"],
      ["Martin", "Jean", "jean.martin@uclouvain.be", "Assistant", "actif"],
      ["Durand", "Sophie", "sophie.durand@uclouvain.be", "Jobiste", "actif"]
    ]
  },
  {
    name: "Examens",
    description: "Planning des examens avec salles et contraintes",
    filename: "template_examens.xlsx",
    columns: ["Date", "Heure début", "Heure fin", "Matière", "Salle", "Nombre surveillants", "Type requis"],
    instructions: [
      "1. Date au format YYYY-MM-DD (ex: 2025-01-15)",
      "2. Heures au format HH:MM (ex: 08:00)",
      "3. Type requis: PAT, Assistant, ou Jobiste",
      "4. Nombre surveillants: nombre entier positif",
      "5. Vérifiez qu'il n'y a pas de conflits d'horaires dans la même salle",
      "6. Ces créneaux serviront de base pour la matrice des disponibilités"
    ],
    examples: [
      ["2025-01-15", "08:00", "10:00", "Mathématiques L1", "Amphi A", 2, "PAT"],
      ["2025-01-15", "10:30", "12:30", "Physique L2", "Salle 203", 1, "Assistant"],
      ["2025-01-16", "14:00", "16:00", "Chimie L3", "Labo 101", 3, "Jobiste"]
    ]
  },
  {
    name: "Disponibilités",
    description: "Matrice des disponibilités par surveillant et créneau",
    filename: "template_disponibilites.xlsx",
    columns: ["Email", "Date", "Heure début", "Heure fin", "Disponible"],
    instructions: [
      "1. Email doit correspondre EXACTEMENT à un surveillant de la liste",
      "2. Date au format YYYY-MM-DD",
      "3. Heures au format HH:MM",
      "4. Disponible: OUI ou NON (ou 1/0)",
      "5. Chaque ligne = une disponibilité pour un créneau spécifique",
      "6. IMPORTANT: Tous les surveillants actifs doivent avoir leurs disponibilités",
      "7. Alternative: utilisez l'import Cally pour une matrice complète"
    ],
    examples: [
      ["marie.dupont@uclouvain.be", "2025-01-15", "08:00", "10:00", "OUI"],
      ["marie.dupont@uclouvain.be", "2025-01-15", "10:30", "12:30", "NON"],
      ["jean.martin@uclouvain.be", "2025-01-15", "08:00", "10:00", "OUI"]
    ]
  },
  {
    name: "Indisponibilités",
    description: "Périodes d'indisponibilité du personnel",
    filename: "template_indisponibilites.xlsx",
    columns: ["Email", "Date début", "Date fin", "Motif"],
    instructions: [
      "1. Email doit correspondre à un surveillant existant",
      "2. Dates au format YYYY-MM-DD",
      "3. Date début doit être <= Date fin",
      "4. Motif est optionnel mais recommandé",
      "5. Une ligne par période d'indisponibilité",
      "6. ATTENTION: Les indisponibilités priment sur les disponibilités"
    ],
    examples: [
      ["marie.dupont@uclouvain.be", "2025-01-10", "2025-01-12", "Congé maladie"],
      ["jean.martin@uclouvain.be", "2025-01-20", "2025-01-20", "Formation"],
      ["sophie.durand@uclouvain.be", "2025-01-25", "2025-01-27", "Congé personnel"]
    ]
  },
  {
    name: "Quotas",
    description: "Quotas personnalisés par surveillant pour la session",
    filename: "template_quotas.xlsx",
    columns: ["Email", "Quota", "Sessions imposées"],
    instructions: [
      "1. Email doit correspondre EXACTEMENT à un surveillant existant",
      "2. Quota: nombre maximum de surveillances par session",
      "3. Sessions imposées: nombre de surveillances obligatoires",
      "4. Sessions imposées doit être <= Quota",
      "5. Quotas par défaut: PAT=12, Assistant=6, Jobiste=4",
      "6. Ne listez que les surveillants avec des quotas différents du défaut"
    ],
    examples: [
      ["marie.dupont@uclouvain.be", 15, 3],
      ["jean.martin@uclouvain.be", 8, 1],
      ["sophie.durand@uclouvain.be", 2, 0]
    ]
  },
  {
    name: "Pré-assignations",
    description: "Surveillances obligatoires spécifiques par surveillant",
    filename: "template_preassignations.xlsx",
    columns: ["Email", "Date", "Heure début", "Heure fin", "Matière", "Salle", "Motif"],
    instructions: [
      "1. Email doit correspondre à un surveillant existant",
      "2. Date au format YYYY-MM-DD",
      "3. Heures au format HH:MM",
      "4. Matière et Salle doivent correspondre à un examen existant",
      "5. Motif: raison de l'assignation obligatoire",
      "6. Ces assignations sont prioritaires sur l'attribution automatique",
      "7. Vérifiez que le surveillant est disponible sur ce créneau"
    ],
    examples: [
      ["marie.dupont@uclouvain.be", "2025-01-15", "08:00", "10:00", "Mathématiques L1", "Amphi A", "Responsable matière"],
      ["jean.martin@uclouvain.be", "2025-01-16", "14:00", "16:00", "Physique L2", "Labo 201", "Spécialiste équipement"]
    ]
  }
];

const getExpectedFormat = (templateType: string) => {
  switch (templateType) {
    case 'surveillants':
      return ['Nom', 'Prénom', 'Email', 'Type', 'Statut'];
    case 'examens':
      return ['Date (jj/mm/aaaa)', 'Heure début', 'Heure fin', 'Matière', 'Salle', 'Nombre surveillants', 'Type requis'];
    case 'disponibilites':
      return ['Email', 'Date (jj/mm/aaaa)', 'Heure début', 'Heure fin', 'Disponible'];
    case 'quotas':
      return ['Email', 'Quota', 'Sessions imposées'];
    case 'indisponibilites':
      return ['Email', 'Date début (jj/mm/aaaa)', 'Date fin (jj/mm/aaaa)', 'Motif'];
    default:
      return [];
  }
};

const generateExcelTemplate = (template: Template) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create instructions sheet
    const instructionsData = [
      ["Instructions pour " + template.name],
      [""],
      ["Description:", template.description],
      [""],
      ["Instructions détaillées:"],
      ...template.instructions.map(instruction => [instruction]),
      [""],
      ["Informations importantes:"],
      ["- Respectez exactement les formats indiqués"],
      ["- Ne modifiez pas les en-têtes de colonnes"],
      ["- Sauvegardez le fichier au format Excel (.xlsx)"],
      ["- En cas d'erreur, consultez l'onglet 'Exemples'"],
      [""],
      ["Support technique: admin@uclouvain.be"]
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    
    // Style the instructions sheet
    if (!instructionsSheet['!cols']) instructionsSheet['!cols'] = [];
    instructionsSheet['!cols'][0] = { width: 50 };
    
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // Create main data sheet
    const mainData = [
      template.columns,
      ...Array(10).fill(null).map(() => new Array(template.columns.length).fill(""))
    ];

    const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
    
    // Style the main sheet
    if (!mainSheet['!cols']) mainSheet['!cols'] = [];
    template.columns.forEach((_, index) => {
      mainSheet['!cols'][index] = { width: 20 };
    });

    // Add header styling
    const headerRange = XLSX.utils.decode_range(mainSheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!mainSheet[cellAddress]) continue;
      if (!mainSheet[cellAddress].s) mainSheet[cellAddress].s = {};
      mainSheet[cellAddress].s.font = { bold: true };
      mainSheet[cellAddress].s.fill = { fgColor: { rgb: "CCCCCC" } };
    }

    XLSX.utils.book_append_sheet(workbook, mainSheet, "Données");

    // Create examples sheet
    const examplesData = [
      template.columns,
      ...template.examples
    ];

    const examplesSheet = XLSX.utils.aoa_to_sheet(examplesData);
    
    // Style the examples sheet
    if (!examplesSheet['!cols']) examplesSheet['!cols'] = [];
    template.columns.forEach((_, index) => {
      examplesSheet['!cols'][index] = { width: 20 };
    });

    XLSX.utils.book_append_sheet(workbook, examplesSheet, "Exemples");

    // Create validation sheet with allowed values
    const validationData = [
      ["Valeurs autorisées"],
      [""],
      ["Types de surveillants:", "PAT, Assistant, Jobiste"],
      ["Statuts:", "actif, inactif"],
      ["Format date:", "YYYY-MM-DD (ex: 2025-01-15)"],
      ["Format heure:", "HH:MM (ex: 08:00)"],
      [""],
      ["Quotas par défaut:"],
      ["PAT:", "12 surveillances"],
      ["Assistant:", "6 surveillances"],
      ["Jobiste:", "4 surveillances"]
    ];

    const validationSheet = XLSX.utils.aoa_to_sheet(validationData);
    if (!validationSheet['!cols']) validationSheet['!cols'] = [];
    validationSheet['!cols'][0] = { width: 25 };
    validationSheet['!cols'][1] = { width: 30 };

    XLSX.utils.book_append_sheet(workbook, validationSheet, "Validation");

    // Generate and download the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', template.filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    throw new Error('Impossible de générer le fichier Excel');
  }
};

export const TemplateDownloader = () => {
  const handleDownload = (template: Template) => {
    try {
      generateExcelTemplate(template);
      toast({
        title: "Template Excel téléchargé",
        description: `Le template ${template.name} a été téléchargé avec succès. L'email est la clé de recoupement entre tous les fichiers.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur de téléchargement",
        description: error.message || "Une erreur s'est produite lors du téléchargement.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Templates Excel Compatibles</span>
        </CardTitle>
        <CardDescription>
          Templates avec recoupement par email et contrôles de cohérence intégrés
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">🔗 Système de recoupement par email</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• L'email est la clé unique pour recouper toutes les informations</li>
            <li>• Ordre recommandé: 1. Surveillants → 2. Examens → 3. Disponibilités → 4. Quotas → 5. Pré-assignations</li>
            <li>• Contrôles automatiques de cohérence lors de l'import</li>
            <li>• Détection des surveillants manquants dans les disponibilités</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.name} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-lg">{template.name}</h4>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-2">Colonnes incluses :</p>
                <div className="flex flex-wrap gap-1">
                  {template.columns.map((column) => (
                    <span key={column} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {column}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Le fichier contient :</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Onglet Instructions détaillées</li>
                  <li>• Onglet Données à remplir</li>
                  <li>• Onglet Exemples concrets</li>
                  <li>• Onglet Validation des formats</li>
                </ul>
              </div>

              <Button
                size="sm"
                onClick={() => handleDownload(template)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger {template.filename}</span>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-900 mb-2">✅ Contrôles de cohérence automatiques</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Vérification que tous les emails existent dans la liste des surveillants</li>
            <li>• Détection des surveillants actifs sans disponibilités</li>
            <li>• Validation des quotas par rapport au type de surveillant</li>
            <li>• Contrôle des conflits de planning et des doubles assignations</li>
            <li>• Alerte sur les pré-assignations sans disponibilité correspondante</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
