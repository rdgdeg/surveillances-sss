import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, Users, Shield } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "@/hooks/use-toast";

export const TemplateDownloader = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const createExcelTemplate = (type: string, data: any[], filename: string) => {
    setDownloading(type);
    
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      
      // Ajuster la largeur des colonnes
      const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Template téléchargé",
        description: `Le fichier ${filename} a été téléchargé avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le template.",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const downloadSurveillantTemplate = () => {
    const templateData = [
      {
        nom: "Dupont",
        prenom: "Jean", 
        email: "jean.dupont@uclouvain.be",
        type: "PAT",
        faculte_interdite: "FASB",
        eft: 1.0,
        affectation_fac: "EPL",
        date_fin_contrat: "2025-12-31",
        telephone_gsm: "+32 475 123 456",
        campus: "Louvain-la-Neuve"
      },
      {
        nom: "Martin",
        prenom: "Marie",
        email: "marie.martin@uclouvain.be", 
        type: "Assistant",
        faculte_interdite: "",
        eft: 0.8,
        affectation_fac: "FASB",
        date_fin_contrat: "2026-06-30",
        telephone_gsm: "+32 475 789 012",
        campus: "Louvain-la-Neuve"
      },
      {
        nom: "Bernard",
        prenom: "Pierre",
        email: "pierre.bernard@uclouvain.be",
        type: "Doctorant", 
        faculte_interdite: "EPL",
        eft: 0.5,
        affectation_fac: "FIAL",
        date_fin_contrat: "2025-09-30",
        telephone_gsm: "+32 475 345 678",
        campus: "Woluwe"
      },
      {
        nom: "Leroy",
        prenom: "Sophie",
        email: "sophie.leroy@uclouvain.be",
        type: "Jobiste",
        faculte_interdite: "",
        eft: "",
        affectation_fac: "",
        date_fin_contrat: "",
        telephone_gsm: "+32 475 901 234",
        campus: "Louvain-la-Neuve"
      }
    ];
    
    createExcelTemplate("surveillants", templateData, "template_surveillants_complet.xlsx");
  };

  const downloadExamenTemplate = () => {
    const templateData = [
      {
        date_examen: "2024-01-15",
        heure_debut: "08:30",
        heure_fin: "11:30", 
        matiere: "LPHYS1201 - Physique générale",
        salle: "HALL01",
        nombre_surveillants: 3,
        type_requis: "PAT",
        faculte: "FASB",
        auditoire_original: "HALL01, HALL02"
      },
      {
        date_examen: "2024-01-15",
        heure_debut: "08:30", 
        heure_fin: "11:30",
        matiere: "LPHYS1201 - Physique générale",
        salle: "HALL02", 
        nombre_surveillants: 2,
        type_requis: "PAT",
        faculte: "FASB",
        auditoire_original: "HALL01, HALL02"
      },
      {
        date_examen: "2024-01-16",
        heure_debut: "13:30",
        heure_fin: "16:30",
        matiere: "LMECA2170 - Mécanique des fluides", 
        salle: "HALL03",
        nombre_surveillants: 4,
        type_requis: "Assistant",
        faculte: "EPL",
        auditoire_original: ""
      }
    ];
    
    createExcelTemplate("examens", templateData, "template_examens.xlsx");
  };

  const downloadDisponibiliteTemplate = () => {
    const templateData = [
      {
        email: "jean.dupont@uclouvain.be",
        date_examen: "2024-01-15",
        heure_debut: "08:30",
        heure_fin: "11:30",
        est_disponible: "OUI"
      },
      {
        email: "jean.dupont@uclouvain.be", 
        date_examen: "2024-01-15",
        heure_debut: "13:30",
        heure_fin: "16:30",
        est_disponible: "NON"
      },
      {
        email: "marie.martin@uclouvain.be",
        date_examen: "2024-01-15", 
        heure_debut: "08:30",
        heure_fin: "11:30",
        est_disponible: "OUI"
      }
    ];
    
    createExcelTemplate("disponibilites", templateData, "template_disponibilites.xlsx");
  };

  const downloadContraintesTemplate = () => {
    const templateData = [
      {
        salle: "HALL01",
        min_non_jobistes: 2
      },
      {
        salle: "HALL02", 
        min_non_jobistes: 1
      },
      {
        salle: "HALL03",
        min_non_jobistes: 3
      }
    ];
    
    createExcelTemplate("contraintes", templateData, "template_contraintes_salles.xlsx");
  };

  const templates = [
    {
      id: "surveillants",
      title: "Template Surveillants Complet",
      description: "Liste complète avec données sensibles (EFT, affectations, contrats, GSM, campus)",
      icon: Users,
      columns: ["nom", "prenom", "email", "type", "faculte_interdite", "eft", "affectation_fac", "date_fin_contrat", "telephone_gsm", "campus"], 
      action: downloadSurveillantTemplate,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      sensitive: true
    },
    {
      id: "examens", 
      title: "Template Examens",
      description: "Planning des examens avec facultés organisatrices et auditoires multiples",
      icon: Calendar,
      columns: ["date_examen", "heure_debut", "heure_fin", "matiere", "salle", "nombre_surveillants", "type_requis", "faculte", "auditoire_original"],
      action: () => {
        const templateData = [
          {
            date_examen: "2024-01-15",
            heure_debut: "08:30",
            heure_fin: "11:30", 
            matiere: "LPHYS1201 - Physique générale",
            salle: "HALL01",
            nombre_surveillants: 3,
            type_requis: "PAT",
            faculte: "FASB",
            auditoire_original: "HALL01, HALL02"
          },
          {
            date_examen: "2024-01-15",
            heure_debut: "08:30", 
            heure_fin: "11:30",
            matiere: "LPHYS1201 - Physique générale",
            salle: "HALL02", 
            nombre_surveillants: 2,
            type_requis: "PAT",
            faculte: "FASB",
            auditoire_original: "HALL01, HALL02"
          },
          {
            date_examen: "2024-01-16",
            heure_debut: "13:30",
            heure_fin: "16:30",
            matiere: "LMECA2170 - Mécanique des fluides", 
            salle: "HALL03",
            nombre_surveillants: 4,
            type_requis: "Assistant",
            faculte: "EPL",
            auditoire_original: ""
          }
        ];
        
        createExcelTemplate("examens", templateData, "template_examens.xlsx");
      },
      color: "bg-green-50 border-green-200 text-green-800"
    },
    {
      id: "disponibilites",
      title: "Template Disponibilités", 
      description: "Disponibilités des surveillants par créneau d'examen",
      icon: FileText,
      columns: ["email", "date_examen", "heure_debut", "heure_fin", "est_disponible"],
      action: () => {
        const templateData = [
          {
            email: "jean.dupont@uclouvain.be",
            date_examen: "2024-01-15",
            heure_debut: "08:30",
            heure_fin: "11:30",
            est_disponible: "OUI"
          },
          {
            email: "jean.dupont@uclouvain.be", 
            date_examen: "2024-01-15",
            heure_debut: "13:30",
            heure_fin: "16:30",
            est_disponible: "NON"
          },
          {
            email: "marie.martin@uclouvain.be",
            date_examen: "2024-01-15", 
            heure_debut: "08:30",
            heure_fin: "11:30",
            est_disponible: "OUI"
          }
        ];
        
        createExcelTemplate("disponibilites", templateData, "template_disponibilites.xlsx");
      },
      color: "bg-orange-50 border-orange-200 text-orange-800"
    },
    {
      id: "contraintes",
      title: "Template Contraintes Salles",
      description: "Contraintes par salle (minimum de non-jobistes requis)",
      icon: FileText, 
      columns: ["salle", "min_non_jobistes"],
      action: () => {
        const templateData = [
          {
            salle: "HALL01",
            min_non_jobistes: 2
          },
          {
            salle: "HALL02", 
            min_non_jobistes: 1
          },
          {
            salle: "HALL03",
            min_non_jobistes: 3
          }
        ];
        
        createExcelTemplate("contraintes", templateData, "template_contraintes_salles.xlsx");
      },
      color: "bg-purple-50 border-purple-200 text-purple-800"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Templates Excel</span>
        </CardTitle>
        <CardDescription>
          Téléchargez les templates Excel mis à jour avec les nouvelles colonnes sensibles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div 
              key={template.id}
              className={`p-4 border rounded-lg ${template.color} ${template.sensitive ? 'border-l-4 border-l-red-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <template.icon className="h-5 w-5" />
                  <h3 className="font-medium">{template.title}</h3>
                  {template.sensitive && (
                    <Shield className="h-4 w-4 text-red-600" title="Contient des données sensibles" />
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {template.columns.length} colonnes
                </Badge>
              </div>
              
              <p className="text-sm mb-3 opacity-80">
                {template.description}
              </p>
              
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium">Colonnes incluses :</p>
                <div className="flex flex-wrap gap-1">
                  {template.columns.map((col) => (
                    <Badge 
                      key={col} 
                      variant="secondary" 
                      className={`text-xs ${
                        ['eft', 'affectation_fac', 'date_fin_contrat', 'telephone_gsm', 'campus'].includes(col) 
                          ? 'bg-red-100 text-red-800 border-red-300' 
                          : ''
                      }`}
                    >
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={template.action}
                disabled={downloading === template.id}
                className="w-full"
                size="sm"
              >
                {downloading === template.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                    <span>Téléchargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-3 w-3" />
                    <span>Télécharger</span>
                  </div>
                )}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>🔒 Nouvelles Données Sensibles (Admin uniquement)</span>
            </h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• <strong>EFT</strong> : Équivalent Temps Plein (0.0 à 1.0) - ajuste automatiquement les quotas</li>
              <li>• <strong>Affectation FAC</strong> : Faculté d'affectation - exclut automatiquement les FSM</li>
              <li>• <strong>Date fin contrat</strong> : Vérifie la validité du contrat pour l'attribution</li>
              <li>• <strong>Téléphone GSM</strong> : Collecté via formulaires de disponibilité</li>
              <li>• <strong>Campus</strong> : Campus d'affectation (LLN, Woluwe, Mons...)</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📝 Logique Métier Intelligente</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Exclusion FSM</strong> : Les surveillants affectés FSM sont automatiquement exclus</li>
              <li>• <strong>Quotas EFT</strong> : EFT 0.5 = quota réduit de moitié, EFT 1.0 = quota complet</li>
              <li>• <strong>Contrats</strong> : Vérification automatique des dates de fin de contrat</li>
              <li>• <strong>Alertes</strong> : Notifications pour les contrats expirant dans 30 jours</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
