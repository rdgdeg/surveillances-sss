
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
  Eye,
  UserPlus,
  Code2,
  Shield,
  BarChart3
} from "lucide-react";
import { HomeButton } from "@/components/HomeButton";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  // On simplifie, plus d’expansion ni de sous-menus complexes
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
        { id: "examens", label: "Import & Validation", icon: FileText },
        { id: "planning", label: "Planning & Attribution", icon: Calendar }
      ]
    },
    {
      id: "outils-avances",
      label: "Outils avancés",
      icon: Settings,
      type: "section",
      children: [
        { id: "enseignant-view", label: "Vue Enseignant", icon: Eye },
        { id: "tokens-enseignants", label: "Liens Enseignants", icon: UserPlus },
        { id: "import-codes", label: "Import Codes Auto", icon: Code2 },
        { id: "contraintes", label: "Contraintes Auditoires", icon: Shield }
      ]
    },
    {
      id: "surveillants",
      label: "Gestion Surveillants",
      icon: Users,
      type: "section",
      children: [
        { id: "surveillants", label: "Surveillants", icon: Users }
      ]
    }
  ];

  const renderMenuItem = (section: any) => {
    if (section.type === "section") {
      return (
        <div key={section.id} className="space-y-1 mt-2">
          <div className="pl-2 mb-1 text-xs font-semibold text-gray-500 uppercase">{section.label}</div>
          <div className="ml-2 space-y-1">
            {section.children.map((child: any) => (
              <Button
                key={child.id}
                variant={activeView === child.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left text-sm"
                onClick={() => onViewChange(child.id)}
              >
                <child.icon className="mr-2 h-4 w-4" />
                {child.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    // Single dashboard
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
