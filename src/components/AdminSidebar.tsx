
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  MessageSquare,
  Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  
  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      description: "Vue d'ensemble et statistiques de la session active"
    },
    {
      id: "import",
      label: "Import de données",
      icon: Upload,
      description: "Importer des fichiers CSV ou Excel avec les données"
    },
    {
      id: "templates", 
      label: "Templates",
      icon: Download,
      description: "Télécharger les modèles de fichiers d'import"
    },
    {
      id: "surveillants",
      label: "Surveillants",
      icon: Users,
      description: "Gérer la liste des surveillants et leurs informations"
    },
    {
      id: "disponibilites",
      label: "Disponibilités",
      icon: Calendar,
      description: "Consulter et modifier la matrice des disponibilités"
    },
    {
      id: "planning",
      label: "Planning",
      icon: ClipboardList,
      description: "Visualiser le planning des attributions de surveillance"
    },
    {
      id: "soldes",
      label: "Soldes",
      icon: BarChart3,
      description: "Suivre les quotas et soldes de chaque surveillant"
    },
    {
      id: "assignment",
      label: "Attribution",
      icon: Zap,
      description: "Lancer le moteur d'attribution automatique intelligent"
    },
    {
      id: "examens",
      label: "Examens",
      icon: FileText,
      description: "Réviser et valider les informations des examens"
    },
    {
      id: "candidats",
      label: "Candidats",
      icon: UserCheck,
      description: "Gérer les candidats surveillants potentiels"
    },
    {
      id: "candidatures",
      label: "Candidatures",
      icon: UserPlus,
      description: "Traiter les formulaires de candidature reçus"
    },
    {
      id: "pre-assignment",
      label: "Pré-attribution",
      icon: Settings,
      description: "Configuration avancée des pré-attributions"
    },
    {
      id: "contraintes",
      label: "Contraintes",
      icon: CheckSquare,
      description: "Gérer les contraintes spécifiques aux auditoires"
    },
    {
      id: "consistency",
      label: "Cohérence",
      icon: CheckSquare,
      description: "Vérifier la cohérence et intégrité des données"
    },
    {
      id: "sensitive",
      label: "Données sensibles",
      icon: Shield,
      description: "Gestion sécurisée des informations confidentielles"
    },
    {
      id: "history",
      label: "Historique",
      icon: History,
      description: "Consulter l'historique et suivi des modifications"
    },
    {
      id: "changements",
      label: "Changements",
      icon: MessageSquare,
      description: "Traiter les demandes de changement reçues"
    }
  ];

  return (
    <TooltipProvider>
      <div className="w-64 bg-uclouvain-blue shadow-lg border-r border-uclouvain-blue/20">
        <div className="p-6 border-b border-uclouvain-cyan/30">
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png" 
              alt="UCLouvain" 
              className="h-8 w-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Administration</h1>
          <p className="text-sm text-uclouvain-cyan mb-4">Gestion des surveillances</p>
          
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="w-full bg-transparent border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue"
          >
            <Home className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
        
        <nav className="p-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left h-auto p-3 text-white hover:bg-uclouvain-cyan/20 hover:text-uclouvain-cyan transition-colors",
                      activeView === item.id && "bg-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-cyan hover:text-uclouvain-blue"
                    )}
                    onClick={() => onViewChange(item.id)}
                  >
                    <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70 truncate">{item.description.split(' ').slice(0, 4).join(' ')}...</div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm">{item.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
};
