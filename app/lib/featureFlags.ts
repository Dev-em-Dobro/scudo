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
