import type { JornadaStage, JornadaTask } from '@/app/types';

const RANK_LETTERS = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

export const MOCK_STAGES: JornadaStage[] = [
  { id: 's1', order: 1, title: 'Rank I', rankLetter: 'I', faixa: 'Iniciante', levelRange: '1–10' },
  { id: 's2', order: 2, title: 'Rank H', rankLetter: 'H', faixa: 'Iniciante', levelRange: '1–10' },
  { id: 's3', order: 3, title: 'Rank G', rankLetter: 'G', faixa: 'Consolidação', levelRange: '11–20' },
  { id: 's4', order: 4, title: 'Rank F', rankLetter: 'F', faixa: 'Consolidação', levelRange: '11–20' },
  { id: 's5', order: 5, title: 'Rank E', rankLetter: 'E', faixa: 'Full Stack', levelRange: '21–30' },
  { id: 's6', order: 6, title: 'Rank D', rankLetter: 'D', faixa: 'Full Stack', levelRange: '21–30' },
  { id: 's7', order: 7, title: 'Rank C', rankLetter: 'C', faixa: 'Projeto autoral', levelRange: '31–40' },
  { id: 's8', order: 8, title: 'Rank B', rankLetter: 'B', faixa: 'Projeto autoral', levelRange: '31–40' },
  { id: 's9', order: 9, title: 'Rank A', rankLetter: 'A', faixa: 'Empregabilidade', levelRange: '41–50' },
  { id: 's10', order: 10, title: 'Rank S', rankLetter: 'S', faixa: 'Empregabilidade', levelRange: '41–50' },
];

export { RANK_LETTERS };

export const MOCK_TASKS: JornadaTask[] = [
  // ---------- Etapa 1 – Iniciante (Introdução + HTML) ----------
  { id: 't1', stageId: 's1', title: 'Boas-vindas e visão AI-Driven', description: 'Introdução geral do curso e abordagem AI First.', status: 'done', order: 1 },
  { id: 't2', stageId: 's1', title: 'Configurar VS Code e agentes do curso', description: 'Entender modo socrático, Copilot e fluxo de estudo.', status: 'done', order: 2 },
  { id: 't3', stageId: 's1', title: 'Como usar plataforma e Discord', description: 'Organizar rotina de estudos e suporte na comunidade.', status: 'pending', order: 3 },
  { id: 't4', stageId: 's1', title: 'HTML: estrutura e tags essenciais', description: 'Headings, parágrafos, listas e atributos básicos.', status: 'done', order: 4 },
  { id: 't5', stageId: 's1', title: 'HTML: links, imagens e comentários', description: 'Criar páginas com navegação e conteúdo multimídia.', status: 'pending', order: 5 },
  { id: 't6', stageId: 's1', title: 'HTML: tabelas e semântica', description: 'Aplicar main, nav, section, header e footer.', status: 'pending', order: 6 },
  { id: 't7', stageId: 's1', title: 'Meta tags e favicon', description: 'Estruturar head corretamente para páginas web.', status: 'pending', order: 7 },
  { id: 't8', stageId: 's1', title: 'Exercícios de fundamentos HTML', description: 'Consolidar estrutura, semântica e organização.', status: 'pending', order: 8 },
  { id: 't9', stageId: 's1', title: 'Solicitação de certificado MEC', description: 'Conhecer critérios e processo de certificação.', status: 'pending', order: 9 },
  { id: 't10', stageId: 's1', title: 'Revisão de fundamentos iniciais', description: 'Validar domínio de introdução e HTML básico.', status: 'pending', order: 10 },

  // ---------- Etapa 2 – Iniciante (CSS + Layout + Git) ----------
  { id: 't11', stageId: 's2', title: 'CSS: conexão com HTML e seletores', description: 'Classes, IDs, display e organização inicial.', status: 'done', order: 1 },
  { id: 't12', stageId: 's2', title: 'CSS: tipografia, cores e box model', description: 'Padding, margin, border e box-sizing na prática.', status: 'done', order: 2 },
  { id: 't13', stageId: 's2', title: 'Flexbox na prática', description: 'Direction, justify-content, align-items e gap.', status: 'pending', order: 3 },
  { id: 't14', stageId: 's2', title: 'Grid layout responsivo', description: 'Template columns, areas, auto-fill e auto-fit.', status: 'pending', order: 4 },
  { id: 't15', stageId: 's2', title: 'Responsividade com media query', description: 'Adaptar layouts para diferentes tamanhos de tela.', status: 'pending', order: 5 },
  { id: 't16', stageId: 's2', title: 'Terminal e comandos básicos', description: 'Navegação, execução de comandos e produtividade.', status: 'pending', order: 6 },
  { id: 't17', stageId: 's2', title: 'Git e GitHub do zero', description: 'Configuração inicial, estados e token de acesso.', status: 'pending', order: 7 },
  { id: 't18', stageId: 's2', title: 'Git no VS Code e GitHub Pages', description: 'Versionar projeto e publicar página estática.', status: 'pending', order: 8 },
  { id: 't19', stageId: 's2', title: 'Projeto E-commerce HTML/CSS - construção', description: 'Menu, hero, cards, grid e rodapé.', status: 'pending', order: 9 },
  { id: 't20', stageId: 's2', title: 'Projeto E-commerce HTML/CSS - deploy', description: 'Finalizar responsividade e publicar no Pages.', status: 'pending', order: 10 },

  // ---------- Etapa 3 – Consolidação (JavaScript Base) ----------
  { id: 't21', stageId: 's3', title: 'JS: variáveis, tipos e operadores', description: 'Base de lógica com exercícios práticos.', status: 'done', order: 1 },
  { id: 't22', stageId: 's3', title: 'JS: condicionais e loops', description: 'if/else, switch, for, while e do while.', status: 'pending', order: 2 },
  { id: 't23', stageId: 's3', title: 'JS: funções e arrow functions', description: 'Criar funções reutilizáveis e resolver exercícios.', status: 'pending', order: 3 },
  { id: 't24', stageId: 's3', title: 'Arrays e objetos', description: 'forEach, map, filter, find, reduce e spread.', status: 'pending', order: 4 },
  { id: 't25', stageId: 's3', title: 'Desestruturação e manipulação de dados', description: 'Trabalhar estruturas complexas com clareza.', status: 'pending', order: 5 },
  { id: 't26', stageId: 's3', title: 'DOM: seletores e eventos', description: 'Clique, input e submit em formulários.', status: 'pending', order: 6 },
  { id: 't27', stageId: 's3', title: 'DOM dinâmico', description: 'Alterar classes, atributos e renderizar listas.', status: 'pending', order: 7 },
  { id: 't28', stageId: 's3', title: 'Assíncrono e APIs', description: 'Promises, async/await, try/catch e JSON.', status: 'pending', order: 8 },
  { id: 't29', stageId: 's3', title: 'localStorage e persistência no navegador', description: 'Salvar preferências e estado da aplicação.', status: 'pending', order: 9 },
  { id: 't30', stageId: 's3', title: 'Projeto JS de consolidação', description: 'Consumir API do GitHub e publicar no Pages.', status: 'pending', order: 10 },

  // ---------- Etapa 4 – Consolidação (TypeScript + React Fundamentos) ----------
  { id: 't31', stageId: 's4', title: 'TypeScript: primeiros passos', description: 'Instalação, tipos básicos e inferência.', status: 'pending', order: 1 },
  { id: 't32', stageId: 's4', title: 'TypeScript: funções, unions e aliases', description: 'Tipar entradas, saídas e contratos.', status: 'pending', order: 2 },
  { id: 't33', stageId: 's4', title: 'TypeScript: interfaces e generics', description: 'Modelar dados reutilizáveis com segurança.', status: 'pending', order: 3 },
  { id: 't34', stageId: 's4', title: 'TypeScript: modules e tsconfig', description: 'Organizar código e configurar o compilador.', status: 'pending', order: 4 },
  { id: 't35', stageId: 's4', title: 'React: setup com Vite', description: 'Estrutura do projeto e fluxo de renderização.', status: 'pending', order: 5 },
  { id: 't36', stageId: 's4', title: 'React: JSX, componentes e props', description: 'Composição e renderização condicional.', status: 'pending', order: 6 },
  { id: 't37', stageId: 's4', title: 'React: useState, listas e eventos', description: 'Construir interfaces interativas com estado.', status: 'pending', order: 7 },
  { id: 't38', stageId: 's4', title: 'React: estilização e Tailwind', description: 'Aplicar utilitários para layout responsivo.', status: 'pending', order: 8 },
  { id: 't39', stageId: 's4', title: 'React: Context API e hooks customizados', description: 'Compartilhar estado e extrair lógica reutilizável.', status: 'pending', order: 9 },
  { id: 't40', stageId: 's4', title: 'Exercícios de React Fundamentos', description: 'Consolidar base antes do módulo avançado.', status: 'pending', order: 10 },

  // ---------- Etapa 5 – Full Stack (React Avançado + Base Backend) ----------
  { id: 't41', stageId: 's5', title: 'React avançado: useEffect e ciclo de vida', description: 'Controlar efeitos e sincronização de estado.', status: 'pending', order: 1 },
  { id: 't42', stageId: 's5', title: 'Formulários com Zod e React Hook Form', description: 'Validação robusta e formulários escaláveis.', status: 'pending', order: 2 },
  { id: 't43', stageId: 's5', title: 'Roteamento e parâmetros com React Router', description: 'Navegação entre páginas e rotas dinâmicas.', status: 'pending', order: 3 },
  { id: 't44', stageId: 's5', title: 'Performance com lazy loading e suspense', description: 'Code splitting para melhor experiência.', status: 'pending', order: 4 },
  { id: 't45', stageId: 's5', title: 'TanStack Query e consumo de APIs', description: 'Busca de dados com cache e estado remoto.', status: 'pending', order: 5 },
  { id: 't46', stageId: 's5', title: 'Introdução ao backend e Node.js', description: 'Entender separação entre frontend e backend.', status: 'pending', order: 6 },
  { id: 't47', stageId: 's5', title: 'SQL: fundamentos e modelagem relacional', description: 'Banco de dados, tipos e chaves.', status: 'pending', order: 7 },
  { id: 't48', stageId: 's5', title: 'SQL: CRUD e JOIN', description: 'INSERT, UPDATE, DELETE e SELECT com relações.', status: 'pending', order: 8 },
  { id: 't49', stageId: 's5', title: 'HTTP: requisição e resposta', description: 'Métodos, headers, status codes e parâmetros.', status: 'pending', order: 9 },
  { id: 't50', stageId: 's5', title: 'Marketing pessoal: presença digital', description: 'Criar base para posicionamento profissional.', status: 'pending', order: 10 },

  // ---------- Etapa 6 – Full Stack (Node.js + Express + Projeto API) ----------
  { id: 't51', stageId: 's6', title: 'Node.js: ambiente e execução de scripts', description: 'Módulos, npm, nodemon e node --watch.', status: 'pending', order: 1 },
  { id: 't52', stageId: 's6', title: 'Node.js: servidor HTTP e rotas', description: 'Criar servidor e endpoints iniciais.', status: 'pending', order: 2 },
  { id: 't53', stageId: 's6', title: 'Express: rotas e métodos de resposta', description: 'Construir API com organização de handlers.', status: 'pending', order: 3 },
  { id: 't54', stageId: 's6', title: 'Express: middlewares e tratamento de erros', description: 'Application-level, terceiros e error handler.', status: 'pending', order: 4 },
  { id: 't55', stageId: 's6', title: 'Express: grupos de rotas e arquivos estáticos', description: 'Estruturar API para crescimento sustentável.', status: 'pending', order: 5 },
  { id: 't56', stageId: 's6', title: 'Projeto Node/PostgreSQL: setup inicial', description: 'Configuração base e padronização com ESLint.', status: 'pending', order: 6 },
  { id: 't57', stageId: 's6', title: 'Projeto Node/PostgreSQL: Prisma e models', description: 'Conectar banco e modelar entidades.', status: 'pending', order: 7 },
  { id: 't58', stageId: 's6', title: 'Projeto Node/PostgreSQL: CRUD de filmes', description: 'Cadastro, atualização, remoção e filtros.', status: 'pending', order: 8 },
  { id: 't59', stageId: 's6', title: 'Projeto Node/PostgreSQL: regras e validações', description: 'Evitar títulos duplicados e reforçar integridade.', status: 'pending', order: 9 },
  { id: 't60', stageId: 's6', title: 'Projeto Node/PostgreSQL: documentação e build', description: 'Swagger, endpoints e conclusão do módulo.', status: 'pending', order: 10 },

  // ---------- Etapa 7 – Projeto Autoral (Docker + Prisma) ----------
  { id: 't61', stageId: 's7', title: 'Docker: conceitos de imagem e container', description: 'Entender base para deploy e ambientes isolados.', status: 'pending', order: 1 },
  { id: 't62', stageId: 's7', title: 'Docker: instalação e Docker Hub', description: 'Preparar ambiente e gerenciamento de imagens.', status: 'pending', order: 2 },
  { id: 't63', stageId: 's7', title: 'Dockerfile e Docker Compose', description: 'Definir build e orquestração local.', status: 'pending', order: 3 },
  { id: 't64', stageId: 's7', title: 'Volumes e persistência de dados', description: 'Garantir dados entre reinícios de containers.', status: 'pending', order: 4 },
  { id: 't65', stageId: 's7', title: 'Prisma: primeiros passos', description: 'Criação e conexão do banco de dados.', status: 'pending', order: 5 },
  { id: 't66', stageId: 's7', title: 'Prisma: migrations e Prisma Studio', description: 'Versionar schema e inspecionar dados.', status: 'pending', order: 6 },
  { id: 't67', stageId: 's7', title: 'Prisma: client e operações CRUD', description: 'Create, update, delete e busca de registros.', status: 'pending', order: 7 },
  { id: 't68', stageId: 's7', title: 'Prisma: relacionamentos e include', description: 'Chave estrangeira, include e consultas compostas.', status: 'pending', order: 8 },
  { id: 't69', stageId: 's7', title: 'Prisma: transactions e boas práticas', description: 'Garantir consistência em operações críticas.', status: 'pending', order: 9 },
  { id: 't70', stageId: 's7', title: 'Desafio Node.js + Express + TypeScript', description: 'Consolidar backend com projeto prático final.', status: 'pending', order: 10 },

  // ---------- Etapa 8 – Projeto Autoral (Marketing Pessoal) ----------
  { id: 't71', stageId: 's8', title: 'Currículo: objetivo e estrutura', description: 'Montar currículo de dev iniciante com foco técnico.', status: 'pending', order: 1 },
  { id: 't72', stageId: 's8', title: 'Currículo: template e informações essenciais', description: 'Organizar conteúdo para leitura rápida de recrutador.', status: 'pending', order: 2 },
  { id: 't73', stageId: 's8', title: 'Currículo: demonstrar experiência sem emprego formal', description: 'Valorizar projetos, estudos e contribuições reais.', status: 'pending', order: 3 },
  { id: 't74', stageId: 's8', title: 'LinkedIn: criar e estruturar perfil', description: 'Headline, resumo e posicionamento profissional.', status: 'pending', order: 4 },
  { id: 't75', stageId: 's8', title: 'LinkedIn: atividade e networking', description: 'Publicar conteúdo e aumentar visibilidade.', status: 'pending', order: 5 },
  { id: 't76', stageId: 's8', title: 'LinkedIn: otimização de perfil antigo', description: 'Atualizar perfil para objetivo atual de carreira.', status: 'pending', order: 6 },
  { id: 't77', stageId: 's8', title: 'Empregabilidade e aplicações', description: 'Mapear empresas, vagas e estratégia de candidatura.', status: 'pending', order: 7 },
  { id: 't78', stageId: 's8', title: 'Preparação para entrevistas', description: 'Treinar comunicação e reduzir insegurança.', status: 'pending', order: 8 },
  { id: 't79', stageId: 's8', title: 'Gestão de propostas e negociações', description: 'Responder abordagens e conduzir próximas etapas.', status: 'pending', order: 9 },
  { id: 't80', stageId: 's8', title: 'Plano de marca pessoal contínuo', description: 'Manter presença ativa com consistência semanal.', status: 'pending', order: 10 },

  // ---------- Etapa 9 – Empregabilidade (IA aplicada + Deep Dives) ----------
  { id: 't81', stageId: 's9', title: 'IA para devs: fundamentos e impacto no mercado', description: 'Entender como IA acelera aprendizado e entrega.', status: 'pending', order: 1 },
  { id: 't82', stageId: 's9', title: 'Ferramentas de IA para desenvolvimento', description: 'Aplicar IA para code assist no fluxo diário.', status: 'pending', order: 2 },
  { id: 't83', stageId: 's9', title: 'IA para candidatura de vagas', description: 'Aprimorar busca e personalização de aplicações.', status: 'pending', order: 3 },
  { id: 't84', stageId: 's9', title: 'Deep Dive: criar portfólio - parte 1', description: 'Planejar narrativa e estrutura do portfólio.', status: 'pending', order: 4 },
  { id: 't85', stageId: 's9', title: 'Deep Dive: criar portfólio - parte 2', description: 'Implementar páginas e apresentação de projetos.', status: 'pending', order: 5 },
  { id: 't86', stageId: 's9', title: 'Deep Dive: criar portfólio - parte 3', description: 'Finalizar, revisar e preparar publicação.', status: 'pending', order: 6 },
  { id: 't87', stageId: 's9', title: 'Deep Dive: JavaScript para React no mercado', description: 'Revisar fundamentos críticos para entrevistas.', status: 'pending', order: 7 },
  { id: 't88', stageId: 's9', title: 'Workshop: criar projeto do zero sem travar', description: 'Estruturar solução antes de codar.', status: 'pending', order: 8 },
  { id: 't89', stageId: 's9', title: 'Workshop: Figma para implementação', description: 'Transformar layout em interface funcional.', status: 'pending', order: 9 },
  { id: 't90', stageId: 's9', title: 'Workshop: projeto receita ou fundo mágico', description: 'Entregar projeto prático com boa experiência.', status: 'pending', order: 10 },

  // ---------- Etapa 10 – Empregabilidade (Consolidação e Mercado) ----------
  { id: 't91', stageId: 's10', title: 'Workshop: codando com monitoria', description: 'Treinar execução guiada com feedback técnico.', status: 'pending', order: 1 },
  { id: 't92', stageId: 's10', title: 'Workshop: quando usar divs no HTML', description: 'Escrever marcação semântica sem vícios comuns.', status: 'pending', order: 2 },
  { id: 't93', stageId: 's10', title: 'Workshop: produtividade máxima nos estudos', description: 'Criar rotina sustentável de evolução técnica.', status: 'pending', order: 3 },
  { id: 't94', stageId: 's10', title: 'Refinar portfólio com feedback externo', description: 'Ajustar narrativa, UX e clareza dos projetos.', status: 'pending', order: 4 },
  { id: 't95', stageId: 's10', title: 'Atualizar currículo e LinkedIn com entregas', description: 'Sincronizar evidências de resultado e stack.', status: 'pending', order: 5 },
  { id: 't96', stageId: 's10', title: 'Meta semanal de candidaturas', description: 'Definir quantidade e acompanhar progresso.', status: 'pending', order: 6 },
  { id: 't97', stageId: 's10', title: 'Simular entrevista técnica e comportamental', description: 'Treinar respostas com foco em clareza e objetividade.', status: 'pending', order: 7 },
  { id: 't98', stageId: 's10', title: 'Consolidar trilha full stack + IA', description: 'Revisar módulos e fechar lacunas importantes.', status: 'pending', order: 8 },
  { id: 't99', stageId: 's10', title: 'Plano de evolução de 90 dias', description: 'Organizar próximos estudos com metas realistas.', status: 'pending', order: 9 },
  { id: 't100', stageId: 's10', title: 'Checkpoint final de prontidão para mercado', description: 'Validar repertório técnico e plano de aplicação.', status: 'pending', order: 10 },
];
