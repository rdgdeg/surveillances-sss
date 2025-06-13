
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Upload, 
  Download, 
  Users, 
  Calendar, 
  ClipboardList, 
  BarChart3, 
  Zap, 
  FileText,
  UserCheck,
  UserPlus,
  Settings,
  CheckSquare,
  Shield,
  History,
  MessageSquare
} from "lucide-react";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      description: "Vue d'ensemble"
    },
    {
      id: "import",
      label: "Import de données",
      icon: Upload,
      description: "Importer CSV/Excel"
    },
    {
      id: "templates", 
      label: "Templates",
      icon: Download,
      description: "Télécharger modèles"
    },
    {
      id: "surveillants",
      label: "Surveillants",
      icon: Users,
      description: "Gérer la liste"
    },
    {
      id: "disponibilites",
      label: "Disponibilités",
      icon: Calendar,
      description: "Matrice horaire"
    },
    {
      id: "planning",
      label: "Planning",
      icon: ClipboardList,
      description: "Visualiser attributions"
    },
    {
      id: "soldes",
      label: "Soldes",
      icon: BarChart3,
      description: "Quotas surveillants"
    },
    {
      id: "assignment",
      label: "Attribution",
      icon: Zap,
      description: "Moteur intelligent"
    },
    {
      id: "examens",
      label: "Examens",
      icon: FileText,
      description: "Réviser examens"
    },
    {
      id: "candidats",
      label: "Candidats",
      icon: UserCheck,
      description: "Gérer candidats"
    },
    {
      id: "candidatures",
      label: "Candidatures",
      icon: UserPlus,
      description: "Formulaires reçus"
    },
    {
      id: "pre-assignment",
      label: "Pré-attribution",
      icon: Settings,
      description: "Gestion avancée"
    },
    {
      id: "contraintes",
      label: "Contraintes",
      icon: CheckSquare,
      description: "Auditoires"
    },
    {
      id: "consistency",
      label: "Cohérence",
      icon: CheckSquare,
      description: "Vérifier données"
    },
    {
      id: "sensitive",
      label: "Données sensibles",
      icon: Shield,
      description: "Gestion sécurisée"
    },
    {
      id: "history",
      label: "Historique",
      icon: History,
      description: "Suivi modifications"
    },
    {
      id: "changements",
      label: "Changements",
      icon: MessageSquare,
      description: "Demandes reçues"
    }
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
        <p className="text-sm text-gray-600">Gestion des surveillances</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeView === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-left h-auto p-3",
                activeView === item.id && "bg-primary text-primary-foreground"
              )}
              onClick={() => onViewChange(item.id)}
            >
              <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs opacity-70 truncate">{item.description}</div>
              </div>
            </Button>
          );
        })}
      </nav>
    </div>
  );
};
