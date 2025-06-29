
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  ClipboardList,
  UserCheck,
  MessageSquare,
  Target,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AdminSidebar = () => {
  const location = useLocation();
  const [examensOpen, setExamensOpen] = useState(true);
  const [surveillantsOpen, setSurveilllantsOpen] = useState(false);
  const [disponibilitesOpen, setDisponibilitesOpen] = useState(false);
  const [supervisionOpen, setSupervisionOpen] = useState(false);

  const isActive = (path: string) => {
    const currentPath = location.pathname + location.search;
    return currentPath.includes(path);
  };

  const menuItems = [
    {
      title: "Vue d'ensemble",
      icon: ClipboardList,
      href: "/admin",
      isActive: location.pathname === "/admin" && !location.search
    },
    {
      title: "Examens",
      icon: BookOpen,
      isCollapsible: true,
      isOpen: examensOpen,
      setIsOpen: setExamensOpen,
      children: [
        { title: "Import & validation", href: "/admin?tab=examens-import", icon: FileText },
        { title: "Révision complète", href: "/admin?tab=examens-review", icon: AlertTriangle },
        { title: "Gestion avancée", href: "/admin?tab=examens-advanced", icon: Settings }
      ]
    },
    {
      title: "Surveillants",
      icon: Users,
      isCollapsible: true,
      isOpen: surveillantsOpen,
      setIsOpen: setSurveilllantsOpen,
      children: [
        { title: "Gestion des surveillants", href: "/admin?tab=surveillants", icon: Users },
        { title: "Candidatures", href: "/admin/candidatures", icon: UserCheck }
      ]
    },
    {
      title: "Disponibilités",
      icon: Calendar,
      isCollapsible: true,
      isOpen: disponibilitesOpen,
      setIsOpen: setDisponibilitesOpen,
      children: [
        { title: "Vue d'ensemble", href: "/admin/disponibilites", icon: Calendar },
        { title: "Par jour", href: "/admin/disponibilites-par-jour", icon: Calendar },
        { title: "Par personne", href: "/admin/disponibilites-par-personne", icon: Users },
        { title: "Matrice complète", href: "/admin/disponibilites-matrice", icon: Target }
      ]
    },
    {
      title: "Supervision & Suivi",
      icon: Target,
      isCollapsible: true,
      isOpen: supervisionOpen,
      setIsOpen: setSupervisionOpen,
      children: [
        { title: "Attribution surveillances", href: "/admin?tab=attributions", icon: Target },
        { title: "Suivi confirmations enseignants", href: "/admin?tab=suivi-confirm-enseignants", icon: UserCheck },
        { title: "Commentaires disponibilités", href: "/admin/commentaires-disponibilites", icon: MessageSquare },
        { title: "Demandes spécifiques", href: "/admin/demandes-specifiques", icon: AlertTriangle }
      ]
    }
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Administration</h2>
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.isCollapsible ? (
                <Collapsible open={item.isOpen} onOpenChange={item.setIsOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {item.isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={cn(
                          "flex items-center space-x-3 p-2 text-sm rounded-lg transition-colors",
                          isActive(child.href)
                            ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        <span>{child.title}</span>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors",
                    item.isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default AdminSidebar;
