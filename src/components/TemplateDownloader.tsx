
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Template {
  name: string;
  description: string;
  filename: string;
  columns: string[];
}

const templates: Template[] = [
  {
    name: "Surveillants",
    description: "Liste des surveillants avec informations personnelles et type",
    filename: "template_surveillants.xlsx",
    columns: ["Nom", "Prénom", "Email", "Type", "Statut"]
  },
  {
    name: "Examens",
    description: "Planning des examens avec salles et contraintes",
    filename: "template_examens.xlsx",
    columns: ["Date", "Heure début", "Heure fin", "Matière", "Salle", "Nombre surveillants", "Type requis"]
  },
  {
    name: "Indisponibilités",
    description: "Périodes d'indisponibilité du personnel",
    filename: "template_indisponibilites.xlsx",
    columns: ["Email", "Date début", "Date fin", "Motif"]
  },
  {
    name: "Quotas",
    description: "Quotas personnalisés par surveillant pour la session",
    filename: "template_quotas.xlsx",
    columns: ["Email", "Quota", "Sessions imposées"]
  }
];

const generateExcelTemplate = (template: Template) => {
  // Create CSV content for the template
  const csvContent = [
    template.columns.join(';'),
    // Add example row based on template type
    ...getExampleRows(template.name, template.columns)
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', template.filename.replace('.xlsx', '.csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const getExampleRows = (templateName: string, columns: string[]): string[] => {
  switch (templateName) {
    case "Surveillants":
      return [
        "Dupont;Marie;marie.dupont@uclouvain.be;PAT;actif",
        "Martin;Jean;jean.martin@uclouvain.be;Assistant;actif"
      ];
    case "Examens":
      return [
        "2025-01-15;08:00;10:00;Mathématiques L1;Amphi A;2;PAT",
        "2025-01-15;10:30;12:30;Physique L2;Salle 203;1;Assistant"
      ];
    case "Indisponibilités":
      return [
        "marie.dupont@uclouvain.be;2025-01-10;2025-01-12;Congé maladie",
        "jean.martin@uclouvain.be;2025-01-20;2025-01-20;Formation"
      ];
    case "Quotas":
      return [
        "marie.dupont@uclouvain.be;12;2",
        "jean.martin@uclouvain.be;6;0"
      ];
    default:
      return [];
  }
};

export const TemplateDownloader = () => {
  const handleDownload = (template: Template) => {
    generateExcelTemplate(template);
    toast({
      title: "Template téléchargé",
      description: `Le template ${template.name} a été téléchargé avec succès.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Templates Excel</span>
        </CardTitle>
        <CardDescription>
          Téléchargez les templates Excel pré-formatés pour l'import de données
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.name} className="border rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Colonnes incluses :</p>
                <div className="flex flex-wrap gap-1">
                  {template.columns.map((column) => (
                    <span key={column} className="bg-gray-100 text-xs px-2 py-1 rounded">
                      {column}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(template)}
                className="w-full flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger {template.filename.replace('.xlsx', '.csv')}</span>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
