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
