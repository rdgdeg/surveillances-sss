
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  FileSpreadsheet, 
  Calendar, 
  Settings, 
  BarChart3, 
  Shield, 
  UserCheck, 
  ClipboardList, 
  AlertTriangle, 
  Database, 
  Eye, 
  History,
  FileText,
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Vue d'ensemble"
    },
    {
      category: "Import & Validation",
      items: [
        {
          id: "import",
          label: "Import de données",
          icon: FileSpreadsheet,
          description: "Importer fichiers CSV/Excel"
        },
        {
          id: "validation",
          label: "Validation",
          icon: Shield,
          description: "Validation des données"
        },
        {
          id: "examens-workflow",
          label: "Workflow Examens",
          icon: FileText,
          description: "Gestion workflow examens"
        },
        {
          id: "templates",
          label: "Modèles",
          icon: FileSpreadsheet,
          description: "Télécharger modèles"
        }
      ]
    },
    {
      category: "Gestion Surveillants",
      items: [
        {
          id: "surveillants",
          label: "Liste Surveillants",
          icon: Users,
          description: "Édition des surveillants"
        },
        {
          id: "surveillants-manager",
          label: "Gestion Surveillants",
          icon: UserCheck,
          description: "Gestion avancée"
        },
        {
          id: "disponibilites",
          label: "Disponibilités",
          icon: Calendar,
          description: "Matrice des disponibilités"
        }
      ]
    },
    {
      category: "Planning & Attribution",
      items: [
        {
          id: "planning",
          label: "Planning",
          icon: Calendar,
          description: "Vue planning"
        },
        {
          id: "soldes",
          label: "Soldes",
          icon: BarChart3,
          description: "Soldes des surveillants"
        },
        {
          id: "assignment",
          label: "Attribution intelligente",
          icon: Shield,
          description: "Moteur d'attribution"
        }
      ]
    },
    {
      category: "Examens",
      items: [
        {
          id: "examens",
          label: "Révision Examens",
          icon: ClipboardList,
          description: "Gestion des examens"
        },
        {
          id: "examens-advanced",
          label: "Examens Avancé",
          icon: Settings,
          description: "Gestion avancée examens"
        }
      ]
    },
    {
      category: "Candidatures",
      items: [
        {
          id: "candidats",
          label: "Candidats",
          icon: Users,
          description: "Surveillance candidats"
        },
        {
          id: "candidatures",
          label: "Candidatures",
          icon: UserCheck,
          description: "Gestion candidatures"
        },
        {
          id: "pre-assignment",
          label: "Pré-assignation",
          icon: Shield,
          description: "Gestion pré-assignations"
        }
      ]
    },
    {
      category: "Contraintes & Salles",
      items: [
        {
          id: "contraintes",
          label: "Contraintes Auditoires",
          icon: AlertTriangle,
          description: "Gestion contraintes"
        },
        {
          id: "contraintes-salles",
          label: "Contraintes Salles",
          icon: Settings,
          description: "Contraintes par salle"
        }
      ]
    },
    {
      category: "Données & Historique",
      items: [
        {
          id: "consistency",
          label: "Cohérence Données",
          icon: Database,
          description: "Vérification cohérence"
        },
        {
          id: "sensitive",
          label: "Données Sensibles",
          icon: Eye,
          description: "Gestion données sensibles"
        },
        {
          id: "history",
          label: "Historique",
          icon: History,
          description: "Historique surveillance"
        },
        {
          id: "historique-complet",
          label: "Historique Complet",
          icon: History,
          description: "Historique complet"
        },
        {
          id: "changements",
          label: "Demandes Changement",
          icon: AlertTriangle,
          description: "Gestion changements"
        }
      ]
    }
  ];

  const handleHomeClick = () => {
    window.location.href = '/';
  };

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-80"
    )}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="space-y-2 flex-1 mr-3">
              <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
              <Button
                onClick={handleHomeClick}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {isCollapsed && (
          <Button
            onClick={handleHomeClick}
            variant="ghost"
            size="sm"
            className="w-full mt-2 p-2"
            title="Retour à l'accueil"
          >
            <Home className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-4">
          {menuItems.map((section, index) => (
            <div key={index}>
              {section.category ? (
                <div>
                  {!isCollapsed && (
                    <h3 className="text-sm font-medium text-gray-500 mb-2 px-2">
                      {section.category}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items?.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onViewChange(item.id)}
                          className={cn(
                            "w-full justify-start text-left",
                            isCollapsed ? "px-2" : "px-3",
                            isActive && "bg-primary text-primary-foreground"
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                          {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Single item section (like dashboard) */}
                  <div className="space-y-1">
                    {(() => {
                      const Icon = section.icon;
                      const isActive = activeView === section.id;
                      
                      return (
                        <Button
                          key={section.id}
                          variant={isActive ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onViewChange(section.id)}
                          className={cn(
                            "w-full justify-start text-left",
                            isCollapsed ? "px-2" : "px-3",
                            isActive && "bg-primary text-primary-foreground"
                          )}
                          title={isCollapsed ? section.label : undefined}
                        >
                          <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                          {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{section.label}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {section.description}
                              </div>
                            </div>
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              {index < menuItems.length - 1 && !isCollapsed && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
