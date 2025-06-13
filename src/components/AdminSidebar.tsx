import {
  Calendar,
  CalendarDays,
  FileSpreadsheet,
  FileUp,
  Grid3X3,
  History,
  Shield,
  Target,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const menuItems = [
    {
      title: "Configuration",
      items: [
        {
          id: "sessions",
          title: "Sessions",
          icon: Calendar,
          description: "Gestion des sessions d'examens"
        },
        {
          id: "templates",
          title: "Templates",
          icon: FileSpreadsheet,
          description: "Modèles Excel à télécharger"
        }
      ]
    },
    {
      title: "Import des Données",
      items: [
        {
          id: "import",
          title: "Import Excel",
          icon: Upload,
          description: "Import des fichiers Excel"
        },
        {
          id: "cally-import",
          title: "Import Cally",
          icon: FileUp,
          description: "Import matrice Cally"
        },
        {
          id: "consistency",
          title: "Contrôle Cohérence",
          icon: Target,
          description: "Vérification des données"
        }
      ]
    },
    {
      title: "Attribution",
      items: [
        {
          id: "assignment",
          title: "Attribution Intelligente",
          icon: Zap,
          description: "Attribution automatique"
        },
        {
          id: "availability",
          title: "Disponibilités",
          icon: Grid3X3,
          description: "Matrice des disponibilités"
        },
        {
          id: "pre-assignments",
          title: "Pré-assignations",
          icon: UserCheck,
          description: "Assignations obligatoires"
        },
        {
          id: "constraints",
          title: "Contraintes",
          icon: Shield,
          description: "Contraintes par salle"
        }
      ]
    },
    {
      title: "Consultation",
      items: [
        {
          id: "planning",
          title: "Planning",
          icon: CalendarDays,
          description: "Planning des surveillances"
        },
        {
          id: "history",
          title: "Historique",
          icon: History,
          description: "Historique des surveillances"
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r w-64 shrink-0">
      <div className="px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">Administration</h2>
        <p className="text-sm text-muted-foreground">Gestion des surveillances</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {menuItems.map((section, index) => (
          <div key={index} className="mb-4">
            {section.title && (
              <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 w-full text-sm rounded-md hover:bg-gray-100 transition-colors ${
                      activeView === item.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
