import type { NavigationItem } from "@/modules/dashboard/types";

export const appSidebarMainNavigation: NavigationItem[] = [
  { label: "Painel", href: "/dashboard" },
  { label: "Hoje", href: "/" },
  { label: "Chamados", href: "/tickets", count: "128" },
  { label: "Inboxes", href: "/inboxes", count: "06" },
  { label: "Agendamentos", href: "/agendamentos", count: "24" },
];

export const appSidebarAdminNavigation: NavigationItem[] = [
  { label: "Usuarios", href: "/usuarios" },
  { label: "Tenants", href: "/tenants" },
  { label: "Configuracoes", href: "/configuracoes" },
  { label: "Auditoria", href: "/auditoria" },
  { label: "Relatorios", href: "/relatorios" },
];
