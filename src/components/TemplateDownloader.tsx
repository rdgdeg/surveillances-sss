
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

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
      "4. L'email doit être unique et valide",
      "5. Tous les champs sont obligatoires sauf le statut (par défaut: actif)"
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
      "5. Vérifiez qu'il n'y a pas de conflits d'horaires dans la même salle"
    ],
    examples: [
      ["2025-01-15", "08:00", "10:00", "Mathématiques L1", "Amphi A", 2, "PAT"],
      ["2025-01-15", "10:30", "12:30", "Physique L2", "Salle 203", 1, "Assistant"],
      ["2025-01-16", "14:00", "16:00", "Chimie L3", "Labo 101", 3, "Jobiste"]
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
      "5. Une ligne par période d'indisponibilité"
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
      "1. Email doit correspondre à un surveillant existant",
      "2. Quota: nombre maximum de surveillances par session",
      "3. Sessions imposées: nombre de surveillances obligatoires",
      "4. Sessions imposées doit être <= Quota",
      "5. Quotas par défaut: PAT=12, Assistant=6, Jobiste=4"
    ],
    examples: [
      ["marie.dupont@uclouvain.be", 12, 2],
      ["jean.martin@uclouvain.be", 6, 0],
      ["sophie.durand@uclouvain.be", 4, 1]
    ]
  }
];

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
        description: `Le template ${template.name} a été téléchargé avec succès. Consultez l'onglet 'Instructions' pour plus d'informations.`,
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
          <span>Templates Excel Professionnels</span>
        </CardTitle>
        <CardDescription>
          Téléchargez les templates Excel avec instructions, exemples et validation intégrés
        </CardDescription>
      </CardHeader>
      <CardContent>
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

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">💡 Conseils d'utilisation</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Commencez par lire l'onglet "Instructions" de chaque fichier</li>
            <li>• Utilisez l'onglet "Exemples" comme référence</li>
            <li>• Respectez exactement les formats indiqués dans l'onglet "Validation"</li>
            <li>• Sauvegardez vos fichiers au format Excel (.xlsx) avant l'import</li>
            <li>• En cas de problème, contactez le support technique</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
