/**
 * Tokens visuais escopados à área "Indique e Ganhe" (decisão stakeholder
 * 2026-05-16). O token global `--color-primary` (#6528d3) não tem contraste
 * pra texto, então este roxo legível vive só aqui — não altera `globals.css`
 * nem o token global (afetaria o Scudo inteiro).
 */
export const MGM_PURPLE = 'lab(62.8239% 34.9159 -60.0512)';

/** Mesmo roxo com alpha — usado em chips/realces sutis (nunca como glow). */
export const MGM_PURPLE_SOFT = 'lab(62.8239% 34.9159 -60.0512 / 0.12)';
export const MGM_PURPLE_LINE = 'lab(62.8239% 34.9159 -60.0512 / 0.45)';

/**
 * Superfície elevada padrão: sombra difusa tingida pro fundo + hairline
 * interno no topo (simula refração de borda física). Aplicar via
 * `style={{ boxShadow: PANEL_SHADOW }}` num container com border/rounded.
 */
export const PANEL_SHADOW =
    'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 24px 50px -28px rgba(0,0,0,0.8)';
