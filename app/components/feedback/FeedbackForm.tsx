'use client';

import { useState } from 'react';

type FeedbackCategory = 'BUG' | 'UX' | 'FEATURE' | 'CONTENT' | 'OTHER';

type FeedbackFormState = {
  category: FeedbackCategory;
  title: string;
  description: string;
  expectedBehavior: string;
  pagePath: string;
  impact: string;
  honey: string;
};

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string; helper: string }> = [
  {
    value: 'BUG',
    label: 'Bug / erro',
    helper: 'Algo que quebrou, travou ou exibiu comportamento incorreto.',
  },
  {
    value: 'UX',
    label: 'Experiência de uso',
    helper: 'Fluxo confuso, navegação difícil, texto pouco claro ou fricção.',
  },
  {
    value: 'FEATURE',
    label: 'Nova funcionalidade',
    helper: 'Sugestão de melhoria ou recurso que agregaria valor no produto.',
  },
  {
    value: 'CONTENT',
    label: 'Conteúdo / texto',
    helper: 'Ajustes em mensagens, orientações ou informações visíveis ao aluno.',
  },
  {
    value: 'OTHER',
    label: 'Outro',
    helper: 'Use quando não se encaixar nas opções acima.',
  },
];

const INITIAL_STATE: FeedbackFormState = {
  category: 'BUG',
  title: '',
  description: '',
  expectedBehavior: '',
  pagePath: '',
  impact: '',
  honey: '',
};

function fieldClassName() {
  return 'w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';
}

export default function FeedbackForm() {
  const [form, setForm] = useState<FeedbackFormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof FeedbackFormState>(key: K, value: FeedbackFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    void submitForm(event);
  }

  async function submitForm(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; details?: Array<{ message?: string }> }
        | null;

      if (!response.ok) {
        const issueMessage = data?.details?.[0]?.message;
        throw new Error(issueMessage ?? data?.error ?? 'Não foi possível enviar o feedback.');
      }

      setSuccessMessage('Feedback enviado com sucesso. Obrigado por ajudar a melhorar a plataforma.');
      setForm(INITIAL_STATE);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao enviar feedback.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-semibold text-white">
          Tipo do feedback
        </label>
        <select
          id="category"
          value={form.category}
          onChange={(event) => updateField('category', event.target.value as FeedbackCategory)}
          className={fieldClassName()}
          required
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-300">
          {CATEGORY_OPTIONS.find((option) => option.value === form.category)?.helper}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-semibold text-white">
          Título
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
          className={fieldClassName()}
          placeholder="Ex.: Filtro de vagas não mantém seleção"
          minLength={8}
          maxLength={140}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-semibold text-white">
          O que aconteceu?
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          className={`${fieldClassName()} min-h-32 resize-y`}
          placeholder="Descreva o contexto, o passo a passo e o resultado observado."
          minLength={20}
          maxLength={3000}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="expectedBehavior" className="text-sm font-semibold text-white">
          Comportamento esperado (opcional)
        </label>
        <textarea
          id="expectedBehavior"
          value={form.expectedBehavior}
          onChange={(event) => updateField('expectedBehavior', event.target.value)}
          className={`${fieldClassName()} min-h-24 resize-y`}
          placeholder="Como você esperava que a plataforma se comportasse?"
          maxLength={1200}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="pagePath" className="text-sm font-semibold text-white">
            Página / rota (opcional)
          </label>
          <input
            id="pagePath"
            type="text"
            value={form.pagePath}
            onChange={(event) => updateField('pagePath', event.target.value)}
            className={fieldClassName()}
            placeholder="Ex.: /jobs"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="impact" className="text-sm font-semibold text-white">
            Impacto para você (opcional)
          </label>
          <input
            id="impact"
            type="text"
            value={form.impact}
            onChange={(event) => updateField('impact', event.target.value)}
            className={fieldClassName()}
            placeholder="Ex.: impede candidatura"
            maxLength={600}
          />
        </div>
      </div>

      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.honey}
        onChange={(event) => updateField('honey', event.target.value)}
        className="hidden"
      />

      {errorMessage ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-400">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
      </button>
    </form>
  );
}
