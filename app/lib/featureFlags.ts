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
