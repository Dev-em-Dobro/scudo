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
  // ---------- Etapa 1 – Iniciante (10 tarefas) ----------
  { id: 't1', stageId: 's1', title: 'Configurar ambiente de desenvolvimento', description: 'Instalar editor (VS Code/Cursor), Node.js e Git.', status: 'done', order: 1 },
  { id: 't2', stageId: 's1', title: 'Primeiro repositório no GitHub', description: 'Criar conta no GitHub e primeiro repositório.', status: 'done', order: 2 },
  { id: 't3', stageId: 's1', title: 'Conhecer IA generativa e n8n', description: 'Noções de prompts e automação com ferramentas de IA.', status: 'pending', order: 3 },
  { id: 't4', stageId: 's1', title: 'Comandos básicos do terminal', description: 'Navegar pastas, criar arquivos e rodar comandos no terminal.', status: 'done', order: 4 },
  { id: 't5', stageId: 's1', title: 'Fluxo Git: commit, push e pull', description: 'Fazer commits, enviar e puxar alterações do repositório.', status: 'pending', order: 5 },
  { id: 't6', stageId: 's1', title: 'Estrutura de pastas de um projeto', description: 'Organizar arquivos (src, assets, config) em um projeto web.', status: 'pending', order: 6 },
  { id: 't7', stageId: 's1', title: 'Abrir e rodar um projeto no editor', description: 'Clonar um repo e abrir no editor, instalar dependências.', status: 'pending', order: 7 },
  { id: 't8', stageId: 's1', title: 'Noções de HTTP e navegador', description: 'Entender URL, requisição e resposta no DevTools.', status: 'pending', order: 8 },
  { id: 't9', stageId: 's1', title: 'Criar conta em plataforma de deploy', description: 'Vercel, Netlify ou similar para publicar sites.', status: 'pending', order: 9 },
  { id: 't10', stageId: 's1', title: 'Primeiro deploy de uma página estática', description: 'Publicar uma página HTML simples online.', status: 'pending', order: 10 },

  // ---------- Etapa 2 – HTML/CSS (10 tarefas) ----------
  { id: 't11', stageId: 's2', title: 'Estrutura HTML semântica', description: 'Páginas com header, main, section, footer e landmarks.', status: 'done', order: 1 },
  { id: 't12', stageId: 's2', title: 'Estilizar com CSS (layout e cores)', description: 'Flexbox, grid e responsividade básica.', status: 'done', order: 2 },
  { id: 't13', stageId: 's2', title: 'Projeto: landing page', description: 'Uma página completa publicada com conteúdo real.', status: 'pending', order: 3 },
  { id: 't14', stageId: 's2', title: 'Formulários em HTML', description: 'Inputs, labels, botões e validação básica.', status: 'pending', order: 4 },
  { id: 't15', stageId: 's2', title: 'CSS: variáveis e organização', description: 'Usar custom properties e separar estilos em arquivos.', status: 'pending', order: 5 },
  { id: 't16', stageId: 's2', title: 'Design responsivo (mobile-first)', description: 'Media queries e breakpoints para diferentes telas.', status: 'pending', order: 6 },
  { id: 't17', stageId: 's2', title: 'Acessibilidade básica (HTML)', description: 'Alt em imagens, contraste, foco e hierarquia de headings.', status: 'pending', order: 7 },
  { id: 't18', stageId: 's2', title: 'Animações e transições em CSS', description: 'Transitions e keyframes para microinterações.', status: 'pending', order: 8 },
  { id: 't19', stageId: 's2', title: 'Página "Sobre mim" ou portfólio estático', description: 'Página pessoal com foto, texto e links.', status: 'pending', order: 9 },
  { id: 't20', stageId: 's2', title: 'Revisão: boa prática de HTML/CSS', description: 'Código limpo, comentários e nomenclatura consistente.', status: 'pending', order: 10 },

  // ---------- Etapa 3 – JavaScript (10 tarefas) ----------
  { id: 't21', stageId: 's3', title: 'JavaScript: variáveis, funções e arrays', description: 'Lógica e manipulação de dados no console.', status: 'done', order: 1 },
  { id: 't22', stageId: 's3', title: 'DOM e eventos', description: 'Selecionar elementos, alterar conteúdo e responder a cliques.', status: 'pending', order: 2 },
  { id: 't23', stageId: 's3', title: 'Projeto Botflix ou Fundo Mágico', description: 'Aplicar JS em projeto guiado do curso.', status: 'pending', order: 3 },
  { id: 't24', stageId: 's3', title: 'Objetos e manipulação de dados', description: 'Criar e acessar objetos, spread e desestruturação.', status: 'pending', order: 4 },
  { id: 't25', stageId: 's3', title: 'fetch e consumo de API', description: 'Fazer requisições HTTP e exibir dados na página.', status: 'pending', order: 5 },
  { id: 't26', stageId: 's3', title: 'Tratamento de erros e async', description: 'try/catch, Promises e async/await.', status: 'pending', order: 6 },
  { id: 't27', stageId: 's3', title: 'Manipulação de formulários com JS', description: 'Validar e enviar dados do form via JavaScript.', status: 'pending', order: 7 },
  { id: 't28', stageId: 's3', title: 'LocalStorage e persistência simples', description: 'Salvar e recuperar dados no navegador.', status: 'pending', order: 8 },
  { id: 't29', stageId: 's3', title: 'Projeto: lista ou to-do em JS puro', description: 'CRUD simples com dados na tela e no localStorage.', status: 'pending', order: 9 },
  { id: 't30', stageId: 's3', title: 'Revisão: boas práticas em JavaScript', description: 'Nomenclatura, funções pequenas e evitar código duplicado.', status: 'pending', order: 10 },

  // ---------- Etapa 4 – React e TypeScript (10 tarefas) ----------
  { id: 't31', stageId: 's4', title: 'React: componentes e estado', description: 'Criar e reutilizar componentes com useState.', status: 'pending', order: 1 },
  { id: 't32', stageId: 's4', title: 'TypeScript no React', description: 'Tipagem de props, estado e eventos.', status: 'pending', order: 2 },
  { id: 't33', stageId: 's4', title: 'IA no fluxo de desenvolvimento', description: 'Usar ferramentas de IA no dia a dia (Cursor, Copilot).', status: 'pending', order: 3 },
  { id: 't34', stageId: 's4', title: 'Listas e keys', description: 'Renderizar listas dinâmicas e entender key prop.', status: 'pending', order: 4 },
  { id: 't35', stageId: 's4', title: 'useEffect e ciclo de vida', description: 'Efeitos colaterais, dependências e cleanup.', status: 'pending', order: 5 },
  { id: 't36', stageId: 's4', title: 'Formulários controlados', description: 'Inputs ligados ao estado e validação.', status: 'pending', order: 6 },
  { id: 't37', stageId: 's4', title: 'Roteamento (React Router ou Next)', description: 'Múltiplas páginas e navegação entre rotas.', status: 'pending', order: 7 },
  { id: 't38', stageId: 's4', title: 'Consumir API em React', description: 'fetch/axios em componente e exibir loading e erro.', status: 'pending', order: 8 },
  { id: 't39', stageId: 's4', title: 'Projeto: app React com várias telas', description: 'App completo com navegação e dados de API.', status: 'pending', order: 9 },
  { id: 't40', stageId: 's4', title: 'Revisão: estrutura de pastas React', description: 'Organizar componentes, hooks e utils.', status: 'pending', order: 10 },

  // ---------- Etapa 5 – Full Stack (10 tarefas) ----------
  { id: 't41', stageId: 's5', title: 'Syntax Wear completo', description: 'Finalizar projeto full stack do curso.', status: 'pending', order: 1 },
  { id: 't42', stageId: 's5', title: 'Back-end com Node e Express', description: 'Criar API REST básica com rotas e middlewares.', status: 'pending', order: 2 },
  { id: 't43', stageId: 's5', title: 'Conectar front ao back', description: 'Consumir API no React (CORS e ambiente).', status: 'pending', order: 3 },
  { id: 't44', stageId: 's5', title: 'Autenticação simples (login/senha)', description: 'Rota de login, sessão ou JWT básico.', status: 'pending', order: 4 },
  { id: 't45', stageId: 's5', title: 'Validação de dados no back-end', description: 'Validar body e params (Zod, Joi ou manual).', status: 'pending', order: 5 },
  { id: 't46', stageId: 's5', title: 'Tratamento de erros na API', description: 'Status HTTP corretos e mensagens consistentes.', status: 'pending', order: 6 },
  { id: 't47', stageId: 's5', title: 'Variáveis de ambiente', description: 'Configurar .env e não commitar segredos.', status: 'pending', order: 7 },
  { id: 't48', stageId: 's5', title: 'Documentar endpoints (README ou Swagger)', description: 'Listar rotas, métodos e exemplos.', status: 'pending', order: 8 },
  { id: 't49', stageId: 's5', title: 'Deploy do back (Railway, Render ou similar)', description: 'Publicar API em ambiente cloud.', status: 'pending', order: 9 },
  { id: 't50', stageId: 's5', title: 'Integração front + back em produção', description: 'Front apontando para API deployada.', status: 'pending', order: 10 },

  // ---------- Etapa 6 – API com Prisma e portfólio (10 tarefas) ----------
  { id: 't51', stageId: 's6', title: 'API com Prisma e banco de dados', description: 'CRUD com ORM e persistência em PostgreSQL/SQLite.', status: 'pending', order: 1 },
  { id: 't52', stageId: 's6', title: 'Portfólio online', description: 'Deploy do seu portfólio com projetos e links.', status: 'pending', order: 2 },
  { id: 't53', stageId: 's6', title: 'Modelagem de dados e migrations', description: 'Definir schema Prisma e rodar migrate.', status: 'pending', order: 3 },
  { id: 't54', stageId: 's6', title: 'Relacionamentos entre tabelas', description: 'One-to-many, many-to-many no Prisma.', status: 'pending', order: 4 },
  { id: 't55', stageId: 's6', title: 'Queries eficientes (include, select)', description: 'Evitar N+1 e trazer só o necessário.', status: 'pending', order: 5 },
  { id: 't56', stageId: 's6', title: 'Filtros e paginação na API', description: 'Query params para busca e limit/offset.', status: 'pending', order: 6 },
  { id: 't57', stageId: 's6', title: 'Testes manuais da API (Postman/Insomnia)', description: 'Coleção de requests para todos os endpoints.', status: 'pending', order: 7 },
  { id: 't58', stageId: 's6', title: 'Seeds e dados iniciais', description: 'Script para popular banco em dev.', status: 'pending', order: 8 },
  { id: 't59', stageId: 's6', title: 'Portfólio com lista de projetos da API', description: 'Front consumindo seu próprio back de portfólio.', status: 'pending', order: 9 },
  { id: 't60', stageId: 's6', title: 'README do portfólio com stack e deploy', description: 'Instruções para rodar e link de produção.', status: 'pending', order: 10 },

  // ---------- Etapa 7 – Projeto autoral Fintrack (10 tarefas) ----------
  { id: 't61', stageId: 's7', title: 'Projeto Fintrack', description: 'App de controle financeiro pessoal (entrada/saída).', status: 'pending', order: 1 },
  { id: 't62', stageId: 's7', title: 'Devlingo (ou equivalente)', description: 'Projeto de aprendizado aplicado do curso.', status: 'pending', order: 2 },
  { id: 't63', stageId: 's7', title: 'Documentar e publicar no GitHub', description: 'README, screenshots e link de deploy.', status: 'pending', order: 3 },
  { id: 't64', stageId: 's7', title: 'Definir escopo e backlog do projeto', description: 'Lista de features e prioridades (MVP).', status: 'pending', order: 4 },
  { id: 't65', stageId: 's7', title: 'Design de telas (wireframe ou Figma)', description: 'Esboço das principais telas antes de codar.', status: 'pending', order: 5 },
  { id: 't66', stageId: 's7', title: 'Autenticação e perfis de usuário', description: 'Login e dados por usuário no Fintrack.', status: 'pending', order: 6 },
  { id: 't67', stageId: 's7', title: 'CRUD de categorias e transações', description: 'Cadastro e listagem de gastos/receitas.', status: 'pending', order: 7 },
  { id: 't68', stageId: 's7', title: 'Gráficos ou resumos (totais, por categoria)', description: 'Visualização dos dados financeiros.', status: 'pending', order: 8 },
  { id: 't69', stageId: 's7', title: 'Testes de usabilidade com alguém', description: 'Alguém usa o app e você anota feedback.', status: 'pending', order: 9 },
  { id: 't70', stageId: 's7', title: 'Ajustes pós-feedback e polish', description: 'Corrigir bugs e melhorar UX.', status: 'pending', order: 10 },

  // ---------- Etapa 8 – Devlingo e Docker (10 tarefas) ----------
  { id: 't71', stageId: 's8', title: 'Projeto com Docker', description: 'Containerizar aplicação (Dockerfile e docker-compose).', status: 'pending', order: 1 },
  { id: 't72', stageId: 's8', title: 'CI/CD básico', description: 'Pipeline de build e deploy (GitHub Actions ou similar).', status: 'pending', order: 2 },
  { id: 't73', stageId: 's8', title: 'Multi-stage build no Docker', description: 'Otimizar imagem para produção.', status: 'pending', order: 3 },
  { id: 't74', stageId: 's8', title: 'Docker Compose: app + banco', description: 'Subir aplicação e PostgreSQL juntos.', status: 'pending', order: 4 },
  { id: 't75', stageId: 's8', title: 'Variáveis de ambiente em containers', description: 'Configurar .env no Docker sem expor segredos.', status: 'pending', order: 5 },
  { id: 't76', stageId: 's8', title: 'Documentar como rodar com Docker', description: 'README com docker-compose up e pré-requisitos.', status: 'pending', order: 6 },
  { id: 't77', stageId: 's8', title: 'Projeto Devlingo: conclusão', description: 'Finalizar todas as features do projeto.', status: 'pending', order: 7 },
  { id: 't78', stageId: 's8', title: 'Deploy em VPS ou cloud com Docker', description: 'Rodar containers em servidor (ex. Railway, Fly).', status: 'pending', order: 8 },
  { id: 't79', stageId: 's8', title: 'Backup e migração de banco', description: 'Exportar/importar dados entre ambientes.', status: 'pending', order: 9 },
  { id: 't80', stageId: 's8', title: 'Monitoramento básico (logs, saúde)', description: 'Ver logs e endpoint de health da aplicação.', status: 'pending', order: 10 },

  // ---------- Etapa 9 – Empregabilidade: full stack e IA (10 tarefas) ----------
  { id: 't81', stageId: 's9', title: 'Projeto full stack autoral', description: 'Do zero ao deploy, documentado e no GitHub.', status: 'pending', order: 1 },
  { id: 't82', stageId: 's9', title: 'Formação em IA aplicada', description: 'Concluir trilha de IA do curso.', status: 'pending', order: 2 },
  { id: 't83', stageId: 's9', title: 'Automações com n8n/IA', description: 'Criar fluxos que resolvem um problema real.', status: 'pending', order: 3 },
  { id: 't84', stageId: 's9', title: 'Integração com API externa', description: 'Consumir API de terceiros no seu projeto.', status: 'pending', order: 4 },
  { id: 't85', stageId: 's9', title: 'Testes automatizados (unit ou e2e)', description: 'Pelo menos um fluxo coberto por teste.', status: 'pending', order: 5 },
  { id: 't86', stageId: 's9', title: 'Otimização de performance', description: 'Lazy load, cache ou query otimizada.', status: 'pending', order: 6 },
  { id: 't87', stageId: 's9', title: 'SEO básico no front', description: 'Meta tags, títulos e estrutura semântica.', status: 'pending', order: 7 },
  { id: 't88', stageId: 's9', title: 'Documentação técnica do projeto', description: 'Arquitetura, stack e decisões no README.', status: 'pending', order: 8 },
  { id: 't89', stageId: 's9', title: 'Vídeo ou post sobre o projeto', description: 'Mostrar o projeto em rede social ou blog.', status: 'pending', order: 9 },
  { id: 't90', stageId: 's9', title: 'Code review em projeto open source', description: 'Contribuir com PR em repo público.', status: 'pending', order: 10 },

  // ---------- Etapa 10 – Automações, RAG e mercado (10 tarefas) ----------
  { id: 't91', stageId: 's10', title: 'Projeto com RAG ou IA integrada', description: 'Demonstrar uso de IA em produto (chat, busca, etc.).', status: 'pending', order: 1 },
  { id: 't92', stageId: 's10', title: 'Perfil alinhado ao mercado', description: 'LinkedIn, currículo e portfólio atualizados.', status: 'pending', order: 2 },
  { id: 't93', stageId: 's10', title: 'Candidaturas e entrevistas', description: 'Aplicar a vagas e praticar entrevistas.', status: 'pending', order: 3 },
  { id: 't94', stageId: 's10', title: 'RAG: ingestão e busca em documentos', description: 'Pipeline de embeddings e retrieval.', status: 'pending', order: 4 },
  { id: 't95', stageId: 's10', title: 'Automação de tarefas repetitivas', description: 'Script ou n8n para algo que você faz sempre.', status: 'pending', order: 5 },
  { id: 't96', stageId: 's10', title: 'Pitch do seu perfil (1 min)', description: 'Gravar ou ensaiar apresentação profissional.', status: 'pending', order: 6 },
  { id: 't97', stageId: 's10', title: 'Simular entrevista técnica', description: 'Com colega ou mentor: algoritmo ou system design.', status: 'pending', order: 7 },
  { id: 't98', stageId: 's10', title: 'Networking: eventos ou comunidades', description: 'Participar de meetup, Discord ou Twitter/X.', status: 'pending', order: 8 },
  { id: 't99', stageId: 's10', title: 'Manter portfólio e GitHub ativos', description: 'Commits recentes e projetos com README claro.', status: 'pending', order: 9 },
  { id: 't100', stageId: 's10', title: 'Meta: X candidaturas por semana', description: 'Definir número e acompanhar aplicações.', status: 'pending', order: 10 },
];
