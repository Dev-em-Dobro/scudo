export type OnboardingStepType = 'info' | 'video';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: OnboardingStepType;
  route?: string;
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
  version: 6,
  title: 'Boas-vindas a Scudo',
  description: 'Um tutorial curto para você entender o fluxo da plataforma e ganhar velocidade no dia a dia.',
  steps: [
    {
      id: 'overview',
      title: 'Comece pelo seu painel',
      description: 'No Meu Painel você visualiza seu progresso e os próximos passos recomendados.',
      type: 'info',
      route: '/',
      anchorId: 'painel-resumo',
    },
    {
      id: 'resume-template',
      title: 'Use o modelo de currículo',
      description: 'Baixe o modelo de currículo para organizar seu conteúdo e facilitar o preenchimento inicial.',
      type: 'info',
      route: '/',
      anchorId: 'painel-modelo-curriculo',
    },
    {
      id: 'resume-upload',
      title: 'Suba seu currículo',
      description: 'Envie seu currículo para liberar recomendações mais relevantes e acelerar a preparação.',
      type: 'info',
      route: '/',
      anchorId: 'painel-curriculo',
    },
    {
      id: 'readiness',
      title: 'Acompanhe seu status de aptidão',
      description: 'No card de aptidão você vê seu nível atual e quais habilidades priorizar para aumentar compatibilidade.',
      type: 'info',
      route: '/',
      anchorId: 'painel-aptidao',
    },
    {
      id: 'fit-jobs',
      title: 'Acompanhe vagas com compatibilidade',
      description: 'A seção de vagas aptas mostra onde sua stack já atende os requisitos mínimos.',
      type: 'info',
      route: '/',
      anchorId: 'painel-vagas-aptas',
    },
    {
      id: 'jobs-page',
      title: 'Explore vagas com profundidade',
      description: 'Na página Vagas para Você você encontra mais oportunidades e detalhes para candidatura.',
      type: 'info',
      route: '/',
      anchorId: 'nav-vagas',
    },
    {
      id: 'jobs-board',
      title: 'Filtre e compare vagas com atenção',
      description: 'Nesta tela você avalia detalhes das vagas e decide com mais segurança onde se candidatar.',
      type: 'info',
      route: '/jobs',
      anchorId: 'jobs-board',
    },
    {
      id: 'jobs-filters',
      title: 'Use filtros para ganhar foco',
      description: 'Aplique busca, senioridade, modelo de trabalho e ordenação para encontrar vagas aderentes ao seu momento.',
      type: 'info',
      route: '/jobs',
      anchorId: 'jobs-filters',
    },
    {
      id: 'jobs-results',
      title: 'Analise os cards com critério',
      description: 'Compare requisitos, nível e contexto de cada vaga antes de decidir sua candidatura.',
      type: 'info',
      route: '/jobs',
      anchorId: 'jobs-results',
    },
    {
      id: 'jobs-pagination',
      title: 'Navegue por mais oportunidades',
      description: 'Use a paginação para revisar mais vagas sem perder o contexto dos filtros aplicados.',
      type: 'info',
      route: '/jobs',
      anchorId: 'jobs-pagination',
    },
    {
      id: 'analytics-page',
      title: 'Use o Radar para priorizar habilidades',
      description: 'No Radar de Mercado você vê seus gaps e os tópicos mais importantes para evoluir.',
      type: 'info',
      route: '/jobs',
      anchorId: 'nav-analytics',
    },
    {
      id: 'analytics-overview',
      title: 'Use dados para decidir sua estratégia',
      description: 'O radar mostra distribuição de vagas e compatibilidade, ajudando você a priorizar estudos com impacto no mercado.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-overview',
    },
    {
      id: 'analytics-stats',
      title: 'Leia os indicadores centrais do radar',
      description: 'Esses cards resumem volume de vagas, compatibilidade média e sinais de aderência para seu perfil.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-stats',
    },
    {
      id: 'analytics-skill-overview',
      title: 'Entenda seus gaps prioritários',
      description: 'No painel de habilidades você enxerga com clareza os pontos a evoluir antes das próximas candidaturas.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-skill-overview',
    },
    {
      id: 'analytics-skill-stats',
      title: 'Comece pelos indicadores principais',
      description: 'Use cobertura, habilidades demandadas e gaps prioritários para orientar seu plano de evolução.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-skill-coverage',
    },
    {
      id: 'analytics-skill-ranking',
      title: 'Priorize as habilidades mais demandadas',
      description: 'O ranking mostra as competências com maior incidência nas vagas para orientar seu estudo.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-skill-ranking',
    },
    {
      id: 'analytics-study-plan',
      title: 'Transforme gaps em plano de estudo',
      description: 'A lista sugerida ajuda você a organizar o próximo ciclo de aprendizado com foco no mercado.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-study-plan',
    },
    {
      id: 'analytics-fit-model',
      title: 'Cruze compatibilidade com modelo de trabalho',
      description: 'Use essa visão para equilibrar estratégia técnica e preferência de formato de trabalho.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-fit-model',
    },
    {
      id: 'analytics-seniority',
      title: 'Observe a senioridade mais frequente',
      description: 'Esse bloco ajuda a calibrar expectativas e foco de candidatura por nível exigido.',
      type: 'info',
      route: '/analytics',
      anchorId: 'analytics-seniority',
    },
    {
      id: 'jornada-page',
      title: 'Priorize a Jornada do aluno',
      description: 'A Jornada é o caminho mais importante: siga os desafios para ficar pronto e se candidatar com consistência.',
      type: 'info',
      route: '/analytics',
      anchorId: 'nav-jornada',
    },
    {
      id: 'jornada-board',
      title: 'Entenda a lógica de progressão',
      description: 'A Jornada organiza sua evolução em ranks para garantir preparo antes das candidaturas.',
      type: 'info',
      route: '/jornada',
      anchorId: 'jornada-overview',
    },
    {
      id: 'jornada-board-details',
      title: 'Execute a jornada até candidatura',
      description: 'Conclua as etapas da Jornada para chegar preparado nas vagas e elevar suas chances de aprovação.',
      type: 'info',
      route: '/jornada',
      anchorId: 'jornada-board',
    },
  ],
};
