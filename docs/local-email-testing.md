# Teste de envio de e-mail local

Para testar o envio de e-mails (ex: senha temporária da Área de Alunos) sem disparar mensagens reais, use o **Mailpit** — um servidor SMTP fake que captura tudo localmente e expõe uma UI web.

## Subindo o Mailpit com Docker

```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

| Porta | Função |
|-------|--------|
| `1025` | Servidor SMTP (recebe os e-mails do app) |
| `8025` | UI web para visualizar os e-mails → http://localhost:8025 |

Nenhum e-mail sai para fora. O Mailpit não valida credenciais SMTP.

## Variáveis de ambiente (`.env.local`)

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test
SMTP_FROM="CareerQuest <test@careerquest.local>"
```

## Testando o fluxo da Área de Alunos

1. Acesse `http://localhost:3000/acesso`
2. Informe um e-mail válido na plataforma de cursos
3. A rota `/api/auth/student-access` criará a conta e tentará enviar o e-mail
4. Abra `http://localhost:8025` para ver o e-mail recebido com as credenciais geradas

## Alternativas sem Docker

### Mailpit via binário

Download direto em https://github.com/axllent/mailpit/releases — sem dependências. Executar:

```bash
./mailpit
```

Mesmas portas (`1025` SMTP, `8025` UI).

### Mailtrap.io (remoto)

Útil para testar em equipe. Crie uma conta gratuita em https://mailtrap.io, crie uma inbox e use as credenciais SMTP fornecidas no painel.

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=<usuário-do-mailtrap>
SMTP_PASS=<senha-do-mailtrap>
```

## Parando o Mailpit

```bash
docker stop mailpit
docker rm mailpit
```
