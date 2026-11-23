# Controle Financeiro Familiar

Aplicação web em Next.js para organizar receitas, despesas, contas fixas, histórico mensal e saldo da família.

## Requisitos

- Node.js 20+
- npm
- Conta no Supabase
- Conta na Vercel

## Instalação local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

Configure estas variáveis no arquivo `.env.local` e também no ambiente da Vercel:

```bash
FINANCE_AUTH_EMAIL=voce@exemplo.com
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
```

`SUPABASE_SERVICE_ROLE_KEY` é um segredo de servidor: nunca use o prefixo
`NEXT_PUBLIC_` e nunca a versione.

## Configuração do Supabase

1. Crie um projeto no Supabase e abra o SQL Editor.
2. Execute, em ordem, todos os arquivos de `supabase/migrations/`.
3. Em **Authentication > Providers**, mantenha e-mail/senha ativo e desative novos cadastros públicos.
4. Em **Authentication > Users**, crie manualmente a única conta usando o mesmo e-mail de `FINANCE_AUTH_EMAIL`.

As migrações habilitam RLS e bloqueiam o acesso direto aos dados pela API pública do Supabase. A aplicação os acessa somente pela API do servidor, usando a chave de serviço.

## Publicação na Vercel

1. Importe o repositório na Vercel.
2. Adicione as variáveis do `.env.example` no painel de Environment Variables.
3. Publique a branch principal.
4. Verifique o login e a rota `/dashboard`.

## Checklist para repositório público

- O `.env.example` é um modelo seguro e deve ser versionado.
- `.env.local`, arquivos em `data/`, exports do Supabase e chaves de serviço nunca devem ser versionados.
- Caso um segredo tenha sido exposto fora desses arquivos, revogue-o no provedor antes de publicar.

## Testes

```bash
npm test
npm run build
```
