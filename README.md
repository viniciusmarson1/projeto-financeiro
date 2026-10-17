# Controle Financeiro Familiar

Aplicação web em Next.js para organizar receitas, despesas, contas fixas, histórico mensal e saldo da família.

## Requisitos

- Node.js 20+
- npm
- Conta no Supabase
- Conta no Vercel

## Instalação local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000.

## Variáveis de ambiente

Configure estas variáveis no arquivo `.env.local` e também no ambiente da Vercel:

```bash
FINANCE_AUTH_EMAIL=voce@exemplo.com
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
```

## Criação no Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor.
3. Execute `supabase/migrations/001_initial_finance_schema.sql`. Se já tinha aplicado a versão anterior, execute também `supabase/migrations/002_secure_existing_policies.sql`.
4. Em **Authentication > Providers**, mantenha e-mail/senha ativo e desative novos cadastros públicos.
5. Em **Authentication > Users**, crie manualmente a única conta usando o mesmo e-mail de `FINANCE_AUTH_EMAIL`.
6. A migração já habilita RLS e limita o banco a usuários autenticados.

## Autorização da conta

A aplicação usa o Supabase Auth. O e-mail configurado em `FINANCE_AUTH_EMAIL` é a única conta aceita; a senha fica apenas no Supabase. A chave `SUPABASE_SERVICE_ROLE_KEY` é usada exclusivamente no servidor e nunca deve receber o prefixo `NEXT_PUBLIC_`.

## Download e publicação na Vercel

1. Faça o deploy do repositório no Vercel.
2. Adicione as variáveis do `.env.example` no painel de Environment Variables.
3. Publique com a branch principal.
4. Verifique se a rota `/login` carrega corretamente e se o login com a conta configurada funciona.

## Testes

```bash
npm test
npm run build
```

## Limitações atuais

- É necessário configurar o Supabase antes de executar ou publicar a aplicação; não há fallback local, para evitar perda de dados na Vercel.
- A sessão tem duração de até oito horas. Ao expirar, basta entrar novamente.
