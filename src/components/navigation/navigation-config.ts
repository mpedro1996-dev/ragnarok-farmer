import type { ComponentType, SVGProps } from "react";

import {
  CastleIcon,
  HelmetIcon,
  LedgerIcon,
  LootIcon,
  PortalIcon,
  SwordIcon,
} from "./rpg-nav-icons";

export type NavigationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavigationItem = {
  description: string;
  href: string;
  icon: NavigationIcon;
  label: string;
};

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Início",
    description: "Painel central da guilda",
    icon: CastleIcon,
  },
  {
    href: "/farm",
    label: "Farm",
    description: "Rotina diária de instâncias",
    icon: SwordIcon,
  },
  {
    href: "/reports",
    label: "Relatórios",
    description: "Consolidado de loot e zenny",
    icon: LedgerIcon,
  },
  {
    href: "/admin/items",
    label: "Itens",
    description: "Catálogo de loot e drops",
    icon: LootIcon,
  },
  {
    href: "/admin/instances",
    label: "Instâncias",
    description: "Portais e dungeons PvE",
    icon: PortalIcon,
  },
  {
    href: "/admin/characters",
    label: "Personagens",
    description: "Aventureiros cadastrados",
    icon: HelmetIcon,
  },
];
