
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
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['examens']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: Home,
      type: "single"
    },
    {
      id: "examens",
      label: "Gestion des Examens",
      icon: FileText,
      type: "section",
      children: [
        { id: "examens", label: "Import & Révision", icon: FileText },
        { id: "validation", label: "Workflow de Validation", icon: CheckCircle },
        { id: "enseignant-view", label: "Vue Enseignant", icon: Eye },
        { id: "tokens-enseignants", label: "Liens Enseignants", icon: UserPlus }
      ]
    },
    {
      id: "planning",
      label: "Planning & Attribution",
      icon: Calendar,
      type: "single"
    },
    {
      id: "pre-assignations",
      label: "Pré-assignations",
      icon: UserPlus,
      type: "single"
    },
    {
      id: "surveillants",
      label: "Gestion Surveillants",
      icon: Users,
      type: "single"
    },
    {
      id: "contraintes",
      label: "Contraintes Auditoires",
      icon: Settings,
      type: "single"
    },
    {
      id: "candidatures",
      label: "Candidatures",
      icon: UserPlus,
      type: "single"
    },
    {
      id: "disponibilites",
      label: "Collecte Disponibilités",
      icon: Clock,
      type: "single"
    },
    {
      id: "historique",
      label: "Historique",
      icon: History,
      type: "single"
    },
    {
      id: "donnees-sensibles",
      label: "Données Sensibles",
      icon: Eye,
      type: "single"
    }
  ];

  const renderMenuItem = (item: any) => {
    if (item.type === "section") {
      const isExpanded = expandedSections.includes(item.id);
      return (
        <div key={item.id} className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-left"
            onClick={() => toggleSection(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
            {isExpanded ? (
              <ChevronDown className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </Button>
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children.map((child: any) => (
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

    return (
      <Button
        key={item.id}
        variant={activeView === item.id ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => onViewChange(item.id)}
      >
        <item.icon className="mr-2 h-4 w-4" />
        {item.label}
      </Button>
    );
  };

  return (
    <div className="w-64 bg-white border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Administration</h2>
        <Link to="/">
          <Button variant="outline" size="sm" className="mt-2 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {menuItems.map(renderMenuItem)}
        </nav>
      </ScrollArea>
    </div>
  );
};
