
import { useState } from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  CalendarDays, 
  Upload, 
  FileSpreadsheet, 
  Eye, 
  UserCheck, 
  Building, 
  History,
  Settings,
  Menu
} from "lucide-react";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  {
    id: "sessions",
    title: "Sessions",
    icon: CalendarDays,
    description: "Gérer les sessions d'examen"
  },
  {
    id: "templates",
    title: "Templates",
    icon: FileSpreadsheet,
    description: "Télécharger les modèles Excel"
  },
  {
    id: "import",
    title: "Import",
    icon: Upload,
    description: "Importer les données Excel"
  },
  {
    id: "pre-assignments",
    title: "Pré-assignations",
    icon: UserCheck,
    description: "Gérer les assignations obligatoires"
  },
  {
    id: "constraints",
    title: "Contraintes",
    icon: Building,
    description: "Contraintes par salle"
  },
  {
    id: "history",
    title: "Historique",
    icon: History,
    description: "Historique des surveillances"
  },
  {
    id: "planning",
    title: "Planning",
    icon: Eye,
    description: "Visualiser le planning"
  }
];

export function AdminSidebar({ activeView, onViewChange }: AdminSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Administration</h2>
          <p className="text-sm text-muted-foreground">Gestion des surveillances</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.description}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
