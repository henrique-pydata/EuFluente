# EuFluente

Aplicação pessoal para organizar o aprendizado de inglês, acompanhar o domínio de palavras e conteúdos e manter metas por seção e no geral.

## O que já está incluído

- React + TypeScript + Vite.
- Oito seções fixas: Conteúdos, Verbos, Substantivos, Adjetivos, Advérbios, Preposições, Phrasal verbs e Expressões.
- Paleta verde e branca aprovada no protótipo.
- Busca por palavra, tradução, conteúdo e anotação; filtros por nível; cadastro, edição e exclusão.
- Níveis Não estudado, Baixo, Médio e Alto, com barra de progresso vermelha, amarela e verde.
- Metas gerais e metas por seção, calculadas a partir dos itens em nível Alto.
- Detalhes dos verbos com forma base, passado simples e particípio passado.
- Supabase Auth, PostgreSQL, políticas de Row Level Security (RLS) e migração SQL.
- Importação inicial das suas planilhas: **199 verbos, 215 substantivos, 142 adjetivos sem duplicata e 53 conteúdos**.
- Modo de demonstração local com exemplos fictícios para testar a interface sem configurar Supabase; nesse modo, as alterações ficam no navegador atual. A base pessoal extraída do Excel é usada apenas pelo script local de importação e não é empacotada no frontend.

A base importada de verbos já continha forma base, passado simples, tradução e dois níveis de domínio (presente e passado), mas não uma coluna própria de particípio. Os particípios foram preenchidos para as formas conhecidas/deriváveis da lista; o cadastro de novos verbos exige os três campos. O nível geral inicial de cada verbo considera o menor nível entre forma base e passado simples. Ao alterar o nível de um verbo pela interface, as duas formas ficam sincronizadas.

## Requisitos

- Node.js 22 (recomendado) e npm.
- Uma conta/projeto no Supabase quando for ativar persistência na nuvem.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço local informado pelo Vite (normalmente `http://localhost:5173`). No Windows, você também pode executar `INICIAR.bat`. Sem variáveis do Supabase, o app entra no modo de demonstração local e carrega uma pequena amostra fictícia para testar a interface.

## Configurar o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. No projeto, abra **SQL Editor** e execute o arquivo completo `supabase/migrations/001_initial_schema.sql`.
3. Copie `.env.example` para `.env.local`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do painel **Connect** do seu projeto. A chave do frontend deve ser a publishable/anon key — nunca a `service_role`.
5. Reinicie o servidor de desenvolvimento (`Ctrl+C` e `npm run dev`).
6. Crie a conta na tela de cadastro do EuFluente. Se a confirmação de e-mail estiver habilitada no Supabase, confirme o endereço antes de entrar.

A migration cria as oito seções, as tabelas de vocabulário, conteúdos e configurações, índices para evitar duplicatas, gatilhos de `updated_at` e políticas RLS para cada usuário. Cada conta só pode consultar e alterar seus próprios registros.

## Importar a base inicial para a sua conta

Faça a importação depois de criar a conta e configurar a migration do banco.

1. Copie `.env.import.example` para `.env.import.local`.
2. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `IMPORT_USER_EMAIL`.
3. Execute:

```bash
npm run import:initial
```

O script localiza o usuário pelo e-mail e importa palavras e conteúdos que ainda não existem nessa conta, a partir de `data/initialSeed.json` (montado a partir das planilhas enviadas). Ele preserva registros já existentes e pode ser executado novamente sem duplicar os itens. A chave `SUPABASE_SERVICE_ROLE_KEY` dá acesso administrativo: mantenha-a apenas no arquivo `.env.import.local`, que está no `.gitignore`. **Nunca** a coloque em `src/`, `.env.local`, no Git ou nas variáveis do frontend hospedado. O arquivo `data/initialSeed.json` também contém os níveis que estavam nas suas planilhas; mantenha o repositório privado caso não queira publicar esses dados de estudo.

## Build de produção

```bash
npm run build
npm run preview
```

A saída de produção é gerada em `dist/`.

## Publicar na Vercel + Git

1. Mantenha o repositório privado se não quiser publicar os níveis que constam nas planilhas. No terminal dentro da pasta do projeto, use `git init`, `git add .` e `git commit -m "Versão inicial do EuFluente"`. Crie um repositório no GitHub e conecte-o com `git remote add origin URL_DO_REPOSITORIO`, depois execute `git branch -M main` e `git push -u origin main`.
2. Importe o repositório na Vercel; o preset Vite e o comando `npm run build` devem ser detectados automaticamente. A pasta de saída é `dist`.
3. Em **Project Settings → Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para Production, Preview e Development, conforme necessário.
4. Faça um novo deploy depois de adicionar as variáveis.
5. No Supabase, ajuste as URLs de site e redirecionamento de autenticação para o domínio de produção e os URLs de preview que forem usados.
6. Conecte um domínio `.app` que você tenha registrado. A compra e a disponibilidade do domínio não fazem parte deste projeto.

Não é necessário Render na primeira versão: a aplicação é um frontend estático e o Supabase já fornece autenticação e banco de dados. O projeto não está publicado nem conectado a um Supabase real até você configurar suas credenciais.

## Estrutura principal

```text
INICIAR.bat
src/
  components/       # autenticação, modais, nível e notificações
  data/             # amostra fictícia para o modo de demonstração
  lib/              # cliente Supabase e repositório de dados
  App.tsx           # navegação, cartões, listas e progresso
  constants.ts      # seções fixas, níveis e metas padrão
  styles.css        # identidade visual responsiva
supabase/
  migrations/       # schema, gatilhos, índices e RLS
data/
  initialSeed.json    # base pessoal extraída das planilhas, usada só pelo importador
scripts/
  import-initial-data.mjs
.env.example
.env.import.example
```

## Próximas melhorias possíveis

- API de dicionário para sugerir formas verbais ao cadastrar novos verbos.
- Revisões e exercícios com base nos itens de nível Baixo/Médio.
- Exportação de backup do vocabulário.
- Ajustes finais de marca e domínio depois de testar a primeira versão hospedada.
