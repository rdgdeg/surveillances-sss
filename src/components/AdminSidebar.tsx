import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Home, Calendar, Users, Settings, UserPlus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const sidebarItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      id: "examens",
      label: "Examens",
      icon: Calendar,
    },
    {
      id: "surveillants",
      label: "Surveillants",
      icon: Users,
    },
    {
      id: "candidatures",
      label: "Candidatures",
      icon: UserPlus,
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: Settings,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center space-x-2 px-4 py-2">
            <div className="w-8 h-8 bg-uclouvain-blue rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">UC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">UCLouvain</h1>
              <p className="text-xs text-gray-600">Gestion Surveillance</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(item.id)}
                      isActive={activeSection === item.id}
                      className="w-full justify-start"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
};
