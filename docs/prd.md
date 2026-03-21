# PRD: Scudo (MVP)

## 1. Visão Geral

O **Scudo** é um hub de oportunidades estratégico para estudantes de tecnologia. A plataforma visa centralizar vagas de nível Estágio e Júnior, utilizando uma camada de inteligência (gamificação) para orientar o aluno sobre o momento ideal de iniciar um processo seletivo.

## 2. Personas

- **O Player (Candidato):** Desenvolvedor em início de carreira que busca clareza sobre sua posição no mercado.
- **O Recrutador/Sistema:** Fonte de dados que fornece os requisitos das missões (vagas).

---

## 3. Requisitos Funcionais (MVP)

### 3.1 Portal de Missões (Busca de Vagas)

- **Interface de Pesquisa:** Filtros por stack (React, Node, etc.), modelo de trabalho e nível (Estágio/Júnior).
- **Visualização de Card:** Exibição clara dos requisitos técnicos e link direto para a fonte da vaga.

### 3.2 Onboarding e Identidade (Cadastro do Aluno)

- **Entrada Facilitada:** Autenticação via Google/LinkedIn.
- **Sincronização de Atributos:** * Upload de currículo em PDF (extração de dados via IA).
    - *Futuro:* Conexão via API do LinkedIn para preenchimento automático de experiência e competências.
- **Perfil de Atributos:** Área onde o aluno visualiza as tecnologias que já domina.

### 3.3 Status de Aptidão (Sistema de Alerta)

Funcionalidade central para evitar o "spam" de candidaturas sem preparo. Caso o aluno acesse uma vaga acima de seu nível atual, o sistema exibirá:

> **Status de Aptidão:** O nível de complexidade desta vaga é superior ao seu estágio atual de desenvolvimento. Recomendamos priorizar a aquisição de novas competências técnicas para que sua entrada no mercado ocorra com a preparação devida.
> 

### 3.4 Ingestão Automática de Dados

- **Automação de E-mail (n8n/Make):** Captura de alertas de vagas recebidos em um e-mail centralizado, processamento do texto via LLM e cadastro automático no banco de dados.
- **Integração com Agregadores:** Consumo inicial via API (ex: Adzuna) para garantir volume de dados no lançamento.

---

## 4. Requisitos Não Funcionais

- **Estética:** Interface minimalista e moderna (estilo Dashboard Profissional).
- **Performance:** Carregamento rápido da listagem de vagas utilizando Server Components (visto que você está usando Next.js).
- **Segurança:** Proteção de dados sensíveis dos alunos conforme a LGPD.

---

## 5. Estrutura Técnica Sugerida (MVP)

| **Componente** | **Tecnologia** |
| --- | --- |
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript. |
| **Backend/Banco** | Supabase (PostgreSQL). |
| **Automação** | n8n ou Make.com para leitura de e-mails. |
| **Inteligência** | Gemini API para categorização de vagas e extração de dados de PDFs. |

---

## 6. Roadmap de Evolução

1. **GPS de Carreira:** Mapa visual de evolução técnica (Árvore de Habilidades).
2. **Alertas de Proximidade:** Notificações quando o aluno atinge 90% dos requisitos de uma "vaga dos sonhos".
3. **Sistema de Recomendação:** Sugestão de cursos ou projetos para cobrir o *gap* técnico identificado em vagas específicas.