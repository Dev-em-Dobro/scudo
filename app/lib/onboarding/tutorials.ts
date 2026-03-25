export type OnboardingStepType = 'info' | 'video';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: OnboardingStepType;
  anchorId?: string;
  videoUrl?: string;
}

export interface OnboardingTutorial {
  key: string;
  version: number;
  title: string;
  description: string;
  steps: OnboardingStep[];
}

export const PLATFORM_INTRO_TUTORIAL: OnboardingTutorial = {
  key: 'platform-intro',
  version: 1,
  title: 'Boas-vindas a Scudo',
  description: 'Um tutorial curto para você entender o fluxo da plataforma e ganhar velocidade no dia a dia.',
  steps: [
    {
      id: 'overview',
      title: 'Comece pelo seu painel',
      description: 'No Meu Painel você visualiza seu progresso e os próximos passos recomendados.',
      type: 'info',
      anchorId: 'painel-resumo',
    },
    {
      id: 'resume-upload',
      title: 'Suba seu currículo',
      description: 'Envie seu currículo para liberar recomendações mais relevantes e acelerar a preparação.',
      type: 'info',
      anchorId: 'painel-curriculo',
    },
    {
      id: 'fit-jobs',
      title: 'Acompanhe vagas com fit',
      description: 'A seção de vagas aptas mostra onde sua stack já atende os requisitos mínimos.',
      type: 'info',
      anchorId: 'painel-vagas-aptas',
    },
    {
      id: 'jobs-page',
      title: 'Explore vagas com profundidade',
      description: 'Na página Vagas para Você você encontra mais oportunidades e detalhes para candidatura.',
      type: 'info',
      anchorId: 'nav-vagas',
    },
    {
      id: 'future-video',
      title: 'Tutorial em vídeo (em breve)',
      description: 'Este passo já está pronto para suportar um vídeo explicativo quando ele for gravado.',
      type: 'video',
    },
  ],
};
