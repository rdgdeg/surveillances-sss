
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Upload,
  Download,
  Users,
  Calendar,
  CalendarDays,
  Coins,
  Zap,
  ClipboardList,
  UserCheck,
  Vote,
  UserPlus,
  Building,
  CheckSquare,
  Eye,
  History,
  ChevronDown,
  ChevronRight,
  Settings,
  AlertTriangle,
  FileText
} from "lucide-react";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  const [isExamensSectionOpen, setIsExamensSectionOpen] = useState(true);
  const [isSurveillantsSectionOpen, setIsSurveillantsSectionOpen] = useState(true);
  const [isDataSectionOpen, setIsDataSectionOpen] = useState(true);

  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      section: "main"
    },
    {
      id: "import",
      label: "Import de données",
      icon: Upload,
      section: "data"
    },
    {
      id: "templates",
      label: "Télécharger modèles",
      icon: Download,
      section: "data"
    },
    {
      id: "consistency",
      label: "Vérification cohérence",
      icon: CheckSquare,
      section: "data"
    },
    {
      id: "surveillants",
      label: "Gestion surveillants",
      icon: Users,
      section: "surveillants"
    },
    {
      id: "disponibilites",
      label: "Matrice disponibilités",
      icon: Calendar,
      section: "surveillants"
    },
    {
      id: "candidats",
      label: "Candidats surveillance",
      icon: UserCheck,
      section: "surveillants"
    },
    {
      id: "candidatures",
      label: "Gestion candidatures",
      icon: Vote,
      section: "surveillants"
    },
    {
      id: "soldes",
      label: "Soldes surveillants",
      icon: Coins,
      section: "surveillants"
    },
    {
      id: "examens-advanced",
      label: "Gestion avancée examens",
      icon: Settings,
      section: "examens",
      badge: "Nouveau"
    },
    {
      id: "examens",
      label: "Révision besoins",
      icon: ClipboardList,
      section: "examens"
    },
    {
      id: "planning",
      label: "Planning examens",
      icon: CalendarDays,
      section: "examens"
    },
    {
      id: "pre-assignment",
      label: "Pré-attributions",
      icon: UserPlus,
      section: "examens"
    },
    {
      id: "contraintes",
      label: "Contraintes auditoires",
      icon: Building,
      section: "examens"
    },
    {
      id: "assignment",
      label: "Attribution intelligente",
      icon: Zap,
      section: "examens"
    },
    {
      id: "sensitive",
      label: "Données sensibles",
      icon: Eye,
      section: "main"
    },
    {
      id: "history",
      label: "Historique surveillance",
      icon: History,
      section: "main"
    },
    {
      id: "changements",
      label: "Demandes changement",
      icon: AlertTriangle,
      section: "main"
    }
  ];

  const renderMenuItem = (item: any) => (
    <Button
      key={item.id}
      variant={activeView === item.id ? "default" : "ghost"}
      className={`w-full justify-start text-left ${
        activeView === item.id ? "bg-blue-600 text-white" : "text-gray-700"
      }`}
      onClick={() => onViewChange(item.id)}
    >
      <item.icon className="mr-2 h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="secondary" className="ml-2 text-xs">
          {item.badge}
        </Badge>
      )}
    </Button>
  );

  const mainItems = menuItems.filter(item => item.section === "main");
  const dataItems = menuItems.filter(item => item.section === "data");
  const surveillantsItems = menuItems.filter(item => item.section === "surveillants");
  const examensItems = menuItems.filter(item => item.section === "examens");

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-4 overflow-y-auto">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
        <div className="space-y-1">
          {mainItems.map(renderMenuItem)}
        </div>
      </div>

      <Separator />

      <Collapsible open={isDataSectionOpen} onOpenChange={setIsDataSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left p-2">
            {isDataSectionOpen ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            <FileText className="mr-2 h-4 w-4" />
            <span className="font-medium">Gestion des données</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 ml-4">
          {dataItems.map(renderMenuItem)}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isSurveillantsSectionOpen} onOpenChange={setIsSurveillantsSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left p-2">
            {isSurveillantsSectionOpen ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            <Users className="mr-2 h-4 w-4" />
            <span className="font-medium">Surveillants</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 ml-4">
          {surveillantsItems.map(renderMenuItem)}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isExamensSectionOpen} onOpenChange={setIsExamensSectionOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left p-2">
            {isExamensSectionOpen ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            <ClipboardList className="mr-2 h-4 w-4" />
            <span className="font-medium">Examens</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {examensItems.length}
            </Badge>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 ml-4">
          {examensItems.map(renderMenuItem)}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
