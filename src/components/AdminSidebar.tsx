import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  FileText, 
  CheckCircle, 
  Calendar, 
  Users, 
  Settings, 
  UserPlus, 
  Clock,
  History,
  Eye,
  ChevronDown,
  ChevronRight,
  Shield,
  BarChart3,
  MapPin,
  ClipboardCheck,
  UserMinus,
  Grid3X3,
  Code2
} from "lucide-react";
import { HomeButton } from "@/components/HomeButton";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['examens', 'surveillants']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuSections = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      type: "single",
      items: [
        { id: "dashboard", label: "Tableau de bord", icon: Home }
      ]
    },
    {
      id: "examens",
      label: "Gestion des Examens",
      icon: FileText,
      type: "section",
      children: [
        { id: "examens", label: "Import & Révision", icon: FileText },
        { id: "import-codes", label: "Import Codes Auto", icon: Code2 },
        { id: "validation", label: "Workflow de Validation", icon: CheckCircle },
        { id: "enseignant-view", label: "Vue Enseignant", icon: Eye },
        { id: "tokens-enseignants", label: "Liens Enseignants", icon: UserPlus },
        { id: "planning", label: "Planning & Attribution", icon: Calendar }
      ]
    },
    {
      id: "surveillants",
      label: "Gestion Surveillants",
      icon: Users,
      type: "section",
      children: [
        { id: "surveillants", label: "Surveillants", icon: Users },
        { id: "candidatures", label: "Disponibilités envoyées", icon: UserPlus },
        { id: "disponibilites", label: "Collecte Disponibilités", icon: Clock },
        { id: "matrice-disponibilites", label: "Matrice Disponibilités", icon: Grid3X3 },
        { id: "suivi-disponibilites", label: "Suivi Disponibilités", icon: ClipboardCheck }
      ]
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: Settings,
      type: "section",
      children: [
        { id: "contraintes", label: "Contraintes Auditoires", icon: MapPin },
        { id: "pre-assignations", label: "Pré-assignations", icon: Shield }
      ]
    },
    {
      id: "suivi",
      label: "Suivi & Historique",
      icon: History,
      type: "section",
      children: [
        { id: "historique", label: "Historique", icon: History },
        { id: "donnees-sensibles", label: "Données Sensibles", icon: Eye }
      ]
    }
  ];

  const renderMenuItem = (section: any) => {
    if (section.type === "section") {
      const isExpanded = expandedSections.includes(section.id);
      return (
        <div key={section.id} className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-left font-medium"
            onClick={() => toggleSection(section.id)}
          >
            <section.icon className="mr-2 h-4 w-4" />
            {section.label}
            {isExpanded ? (
              <ChevronDown className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </Button>
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {section.children.map((child: any) => (
                <Button
                  key={child.id}
                  variant={activeView === child.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left text-sm"
                  onClick={() => onViewChange(child.id)}
                >
                  <child.icon className="mr-2 h-3 w-3" />
                  {child.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Single items in dashboard section
    return (
      <div key={section.id} className="space-y-1">
        {section.items.map((item: any) => (
          <Button
            key={item.id}
            variant={activeView === item.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Administration</h2>
        <HomeButton />
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-4">
          {menuSections.map(renderMenuItem)}
        </nav>
      </ScrollArea>
    </div>
  );
};
