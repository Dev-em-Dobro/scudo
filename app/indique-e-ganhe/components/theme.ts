/**
 * Tokens visuais do Scudo, alinhados ao Design System
 * `docs/design-system/ds-site-devemdobro.md`.
 *
 * - `DS_PURPLE` (#6528d3): cor primária de marca — para backgrounds,
 *   borders, hover states. **Não** usar como texto sobre fundos escuros
 *   (falha contraste WCAG AA).
 * - `MGM_PURPLE` (#a78bfa, cyber lighter): roxo legível para TEXTO sobre
 *   fundo escuro. Substitui DS_PURPLE quando for `color:`/`text-`.
 */

export const DS_PURPLE = '#6528d3';
export const DS_PURPLE_HOVER = '#5020b0';

export const MGM_PURPLE = '#a78bfa';
export const MGM_PURPLE_SOFT = 'rgba(167, 139, 250, 0.12)';
export const MGM_PURPLE_LINE = 'rgba(167, 139, 250, 0.45)';

/** Deprecated — DS pede cards sólidos sem sombra. Mantido pra compat. */
export const PANEL_SHADOW = 'none';
