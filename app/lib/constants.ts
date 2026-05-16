import { NavItem } from '../types';
import { isMgmEnabled } from '@/app/lib/featureFlags';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Meu Painel',
    icon: 'grid_view',
    href: '/',
  },
  {
    label: 'Jornada do aluno',
    icon: 'route',
    href: '/jornada',
  },
  {
    label: 'Vagas Aptas para Você',
    icon: 'work_outline',
    href: '/jobs',
  },
  {
    label: 'Radar de Mercado',
    icon: 'bar_chart',
    href: '/analytics',
  },
  {
    label: 'Meu Perfil',
    icon: 'person_outline',
    href: '/perfil',
  },
  {
    label: 'Feedbacks de melhorias',
    icon: 'feedback',
    href: '/feedback',
  },
  {
    label: 'Indique e Ganhe',
    icon: 'redeem',
    href: '/indique-e-ganhe',
  },
];

export const LOGO_TEXT = {
  main: 'SCU',
  accent: 'DO',
};

/**
 * Itens de nav visíveis. Esconde "Indique e Ganhe" enquanto a feature flag
 * MGM estiver OFF (default) — assim o item não aparece em prod até o launch.
 */
export function getVisibleNavItems(): NavItem[] {
  const mgmOn = isMgmEnabled();
  return NAV_ITEMS.filter(
    (item) => item.href !== '/indique-e-ganhe' || mgmOn,
  );
}
