function parseBooleanFlag(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isInitialOnboardingEnabled() {
  return parseBooleanFlag(process.env.ENABLE_INITIAL_ONBOARDING);
}

export function isGuidedOnboardingEnabled() {
  return parseBooleanFlag(process.env.ENABLE_GUIDED_ONBOARDING);
}

export function isStudentVerifiedAuthOnlyEnabled() {
  return (
    parseBooleanFlag(process.env.ENABLE_STUDENT_VERIFIED_AUTH_ONLY) ||
    parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_STUDENT_VERIFIED_AUTH_ONLY)
  );
}

/**
 * Member-Get-Member (Indique e Ganhe). Default OFF — fonte ÚNICA de verdade:
 * `NEXT_PUBLIC_ENABLE_MGM`. É a única var lida nos dois contextos (servidor em
 * runtime + cliente "assada" no bundle), então um único interruptor controla
 * tudo de forma consistente: página /indique-e-ganhe, item de nav, banner do
 * painel, rota /i/[code], webhooks (Hubla/Asaas) e cron de validação.
 *
 * Para desligar: setar `NEXT_PUBLIC_ENABLE_MGM=false` (ou remover) e redeployar
 * — o valor é inlined no client em build-time, então o redeploy sincroniza a
 * nav. (A var legada `ENABLE_MGM` não é mais consultada.)
 */
export function isMgmEnabled() {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_MGM);
}

/**
 * Upload manual de currículo (PDF/DOCX) no Meu Painel.
 * Default OFF — com o currículo ATS gerado automaticamente, mantemos o fluxo
 * disponível só quando `ENABLE_RESUME_UPLOAD=true` (ex.: piloto ou suporte).
 */
export function isResumeUploadEnabled() {
  return parseBooleanFlag(process.env.ENABLE_RESUME_UPLOAD);
}

export function isResumeAiExtractionEnabled() {
  return parseBooleanFlag(process.env.RESUME_AI_EXTRACTION_ENABLED);
}

export function isResumeAiProviderFallbackEnabled() {
  return parseBooleanFlag(process.env.RESUME_AI_PROVIDER_FALLBACK_ENABLED);
}

export function isResumeAiStrictPiiSanitizationEnabled() {
  const value = process.env.RESUME_AI_STRICT_PII_SANITIZATION;
  if (value === undefined) {
    return true;
  }

  return parseBooleanFlag(value);
}

export function getResumeAiConfidenceThreshold() {
  const parsed = Number(process.env.RESUME_AI_CONFIDENCE_THRESHOLD ?? '0.7');
  if (!Number.isFinite(parsed)) {
    return 0.7;
  }

  return Math.min(0.95, Math.max(0.2, parsed));
}

type ResumeAiProvider = 'openai' | 'gemini';

function parseResumeAiProvider(value: string | undefined): ResumeAiProvider | null {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'openai' || normalized === 'gemini') {
    return normalized;
  }

  return null;
}

export function getResumeAiProviderOrder(): ResumeAiProvider[] {
  const preferred = parseResumeAiProvider(process.env.RESUME_AI_PROVIDER_PRIMARY) ?? 'openai';
  const secondary: ResumeAiProvider = preferred === 'openai' ? 'gemini' : 'openai';

  if (isResumeAiProviderFallbackEnabled()) {
    return [preferred, secondary];
  }

  return [preferred];
}
