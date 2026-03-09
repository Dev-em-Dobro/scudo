import { NavItem } from '../types';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Jornada do aluno',
    icon: 'route',
    href: '/jornada',
  },
  {
    label: 'Meu Painel',
    icon: 'grid_view',
    href: '/',
  },
  {
    label: 'Vagas para Você',
    icon: 'work_outline',
    href: '/jobs',
  },
  {
    label: 'Teste suas Skills',
    icon: 'psychology',
    href: '/assessments',
  },
  {
    label: 'Seus Números',
    icon: 'bar_chart',
    href: '/analytics',
  },
  {
    label: 'Meu Perfil',
    icon: 'person_outline',
    href: '/perfil',
  },
];

export const LOGO_TEXT = {
  main: 'CAREER',
  accent: 'QUEST',
};
