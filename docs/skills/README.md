# 📚 Skills - Guia de Referência do Projeto

Este diretório contém a documentação consolidada de **boas práticas, patterns e lições aprendidas** durante o desenvolvimento do Scudo.

---

## 📖 Documentação Principal

### 🎯 [Project Guide - Guia Completo](./project-guide.md)

**Guia centralizado único** com tudo que você precisa saber sobre o projeto:

#### 📋 Conteúdo
1. **Visão Geral do Projeto** - Características e objetivos
2. **Stack Tecnológica** - Next.js 16, React 19, Tailwind v4, TypeScript
3. **Arquitetura e Organização** - Estrutura de diretórios e princípios
4. **Next.js Patterns** - App Router, Server/Client Components, layouts
5. **React Best Practices** - Props, hooks, rendering, state
6. **TypeScript Patterns** - Interfaces, utility types, type safety
7. **Tailwind CSS v4** - Diferenças da v3, custom colors, dark mode
8. **Style Helpers System** - Utilitários centralizados de estilo
9. **SonarQube Compliance** - Regras e boas práticas de código limpo
10. **Troubleshooting** - Soluções para problemas comuns

#### 🎓 Para Quem?
- ✅ Novos desenvolvedores entrando no projeto
- ✅ Referência rápida durante desenvolvimento
- ✅ Onboarding de equipe
- ✅ Documentação de decisões técnicas
- ✅ Base de conhecimento para outros projetos

---

## 🚀 Quick Start

### Começando no Projeto

```bash
# 1. Clone e instale
git clone <repo>
cd scudo
npm install

# 2. Rode o dev server
npm run dev

# 3. Abra o navegador
http://localhost:3000
```

### Leia Primeiro
1. [Project Guide](./project-guide.md) - Leia do início ao fim (15-20 min)
2. [PRD](../prd.md) - Product Requirements Document
3. Explore o código em `app/` seguindo os patterns aprendidos

---

## 📂 Estrutura Simplificada

```
docs/skills/
├── README.md           # Este arquivo
└── project-guide.md    # 📖 GUIA PRINCIPAL (leia aqui)
```

**Anteriormente**: Múltiplos arquivos separados  
**Agora**: Um guia único e completo

---

## 🎯 Filosofia do Projeto

### Princípios Core

1. **📖 Documentação Centralizada**
   - Um lugar para todas as informações
   - Fácil de encontrar e atualizar
   - Evita fragmentação

2. **✅ Qualidade > Quantidade**
   - SonarQube compliant (zero code smells)
   - TypeScript strict mode
   - Code reviews rigorosos

3. **🔄 DRY (Don't Repeat Yourself)**
   - Style helpers para lógica reutilizável
   - Componentes modulares
   - Constants centralizadas

4. **🎨 Design System Consistente**
   - Cores padronizadas (primary, secondary, accent)
   - Spacing consistente
   - Dark mode em tudo

5. **⚡ Performance First**
   - Server Components quando possível
   - Otimização de fonts
   - Code splitting automático

---

## 📊 Métricas de Qualidade

### Status Atual
- ✅ **SonarQube**: 0 code smells
- ✅ **TypeScript**: 0 errors, strict mode
- ✅ **ESLint**: 0 warnings
- ✅ **Build**: Success
- ✅ **Documentação**: Completa

### Mantenha Sempre
- Zero TypeScript errors
- Zero SonarQube issues
- 100% de interfaces tipadas
- README.md atualizado
- Project Guide atualizado

---

## 🔧 Ferramentas e Setup

### Extensões VSCode Recomendadas
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens

### Scripts Úteis
```bash
npm run dev      # Dev server (turbopack)
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run ESLint
```

---

## 📝 Como Contribuir

### Ao adicionar funcionalidade:
1. ✅ Siga os patterns do [Project Guide](./project-guide.md)
2. ✅ Adicione types em `app/types/`
3. ✅ Use helpers existentes ou crie novos em `lib/`
4. ✅ Componentes em pastas apropriadas (`layout/` ou `dashboard/`)
5. ✅ Teste dark mode + responsivo
6. ✅ Verifique SonarQube antes do commit

### Ao encontrar problemas:
1. ✅ Consulte [Troubleshooting](./project-guide.md#troubleshooting)
2. ✅ Documente a solução no Project Guide
3. ✅ Adicione ao README se for algo comum

---

## 🌟 Recursos Externos

### Documentação Oficial
- [Next.js 16](https://nextjs.org/docs)
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org/docs)

### Livros Recomendados
- **Clean Code** - Robert C. Martin
- **The Pragmatic Programmer** - Hunt & Thomas
- **Refactoring** - Martin Fowler

### Ferramentas
- [SonarQube](https://www.sonarqube.org)
- [ESLint](https://eslint.org)
- [Prettier](https://prettier.io)

---

## 🎓 Checklist de Onboarding

Para novos desenvolvedores:

- [ ] ✅ Ler [Project Guide](./project-guide.md) completo
- [ ] ✅ Ler [PRD](../prd.md)
- [ ] ✅ Setup ambiente local (Node, VSCode, extensions)
- [ ] ✅ Rodar `npm install` e `npm run dev`
- [ ] ✅ Explorar estrutura em `app/`
- [ ] ✅ Entender tipos em `app/types/`
- [ ] ✅ Ver style helpers em `app/lib/styleHelpers.ts`
- [ ] ✅ Criar um componente de teste seguindo os patterns
- [ ] ✅ Fazer commit seguindo as regras
- [ ] ✅ Marcar como completo! 🎉

---

**Última Atualização**: 11 de fevereiro de 2026  
**Versão**: 2.0.0 (Guia Unificado)  
**Mantenedor**: Time Scudo

**📖 Próximo passo: Leia o [Project Guide](./project-guide.md)!**
