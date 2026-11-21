# Portal Oficial

Projeto independente de portal de notícias, desenvolvido para estudo de interface e navegação. Não é afiliado ao Metrópoles nem representa o veículo.

## Executar localmente

Requer Node.js.

```bash
npm install
npm run dev
```

Para gerar e visualizar a versão de produção:

```bash
npm run build
npm run preview
```

## Sobre

A aplicação usa Vite e JavaScript, com layout responsivo, navegação por categorias, busca, links para redes sociais e espaços visuais para anúncios. Conteúdo de notícias, entrega de notificações push e veiculação de anúncios dependem de serviços próprios e não são fornecidos por este projeto.

## Banco de dados do CMS

As migrações em `supabase/migrations/` criam as tabelas, as permissões e o bucket privado `article-media`. Elas também importam a manchete da capa e as quatro notícias atuais. O material original contém apenas manchetes, imagens e o resumo da capa. Os corpos ficam vazios e as datas da importação mantêm a ordem atual.

Com a Supabase CLI e o Docker em execução, rode em um ambiente local de desenvolvimento:

```sh
supabase start
supabase migration up --local
supabase status
psql "<URL DO BANCO LOCAL MOSTRADA PELO SUPABASE STATUS>" -X -v ON_ERROR_STOP=1 -f supabase/tests/cms_permissions.sql
```

O roteiro SQL de teste precisa de um banco descartável e desfaz suas alterações com `ROLLBACK`. Para um ambiente hospedado de teste, vincule a CLI ao projeto correto e revise a lista de migrações pendentes antes de executá-las:

```sh
supabase link --project-ref <referência-do-projeto-de-teste>
supabase db push --dry-run
supabase db push
```

No projeto hospedado, desabilite o cadastro público no Supabase Auth. O primeiro administrador terá uma conta criada pelo responsável pelo projeto e um registro em `public.profiles` com o UUID dessa conta e o perfil `admin`. O acesso de publicação para editores é concedido separadamente em `can_publish`.

Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável do projeto quando a aplicação for integrada. Variáveis com prefixo `VITE_` são públicas. Credenciais privadas devem ficar no serviço responsável por usá-las.

Consultas do site usarão `published_articles`, que aplica a janela de publicação mesmo se o visitante estiver autenticado no CMS. Uma notícia com status `scheduled` torna-se visível ao chegar a data programada, sem alterar seu status no banco. Indicadores de dashboard devem contar agendamentos futuros separadamente dos que já estão visíveis. A integração deve converter os horários locais em `America/Sao_Paulo` antes de gravar os valores e usar esse fuso na exibição.

No fluxo de mídia, o painel deve salvar a notícia antes do upload e inserir a referência em `article_media` somente após enviar o arquivo. O caminho usa `<id-da-notícia>/<uuid-do-arquivo>.<extensão>`. O bucket aceita JPG, PNG e WebP de até 8 MiB. Arquivos publicados devem ser acessados pela rota autenticada do Storage com a chave publicável ou por um endpoint público que aplique a mesma política de visibilidade. O painel deve enviar arquivos com nomes únicos, usar URLs assinadas com validade curta apenas em prévias privadas e remover associações antes da limpeza administrativa dos arquivos.

## Autenticação do painel

1. Complete `.env.local` com `VITE_SUPABASE_URL` e uma chave `sb_publishable_…`. Reinicie o Vite após alterar as variáveis. Configure as mesmas variáveis no ambiente de prévia ou produção da Vercel antes do build correspondente.
2. No Supabase Auth, mantenha o cadastro público desabilitado, configure o mínimo de oito caracteres e adicione a URL exata de recuperação à lista de redirecionamento de cada ambiente. Use, por exemplo, `http://localhost:5173/admin/redefinir-senha` no desenvolvimento e `https://portaloficial.vercel.app/admin/redefinir-senha` quando a implantação em produção for aprovada.
3. Crie ou convide a conta editorial no Supabase Auth. No SQL Editor do mesmo projeto, substitua o UUID abaixo pelo ID da conta criada para provisionar o primeiro administrador.

```sql
insert into public.profiles (id, role)
values ('UUID-DA-CONTA', 'admin');
```

4. Rode `npm run dev` e acesse `/admin`. Verifique login válido e inválido, logout e acesso de uma conta autenticada sem perfil. Em ambiente local, abra o Mailpit indicado por `supabase status` para testar o e-mail de recuperação. Em ambiente hospedado, verifique o serviço de envio e teste um link de recuperação novo na origem autorizada.

O painel usa o cliente oficial `@supabase/supabase-js` para gerenciar sessão e recuperação de senha. A interface exige um perfil de `admin`, `editor` ou `journalist`, e as políticas do banco continuam sendo a fonte de autorização. O retorno de recuperação usa o fluxo implícito do Supabase para aceitar links abertos em outro navegador. O SDK lê a sessão do fragmento da URL, e a página de redefinição exige que o SDK tenha reconhecido um evento de recuperação para a conta.

Em **Equipe**, administradores podem conceder, alterar e revogar o perfil editorial de contas existentes. A conta de autenticação continua sob gestão do Supabase Auth. Para uma pessoa nova, provisionar a conta no Supabase e conceder o perfil no painel são etapas distintas.

## Fluxo editorial

Aplique todas as migrações ao ambiente de teste antes de abrir o painel. O dashboard lista os registros visíveis para o perfil autenticado. Administradores gerenciam editorias e excluem notícias. Editores podem revisar notícias em rascunho ou em revisão e precisam de permissão adicional para publicar. Jornalistas podem criar, editar seus próprios rascunhos e enviar para revisão.

O editor usa Tiptap e salva um documento JSON. A prévia aceita somente elementos de texto, listas, links HTTP(S) e imagens referenciadas no Storage. O painel usa prévias assinadas por 15 minutos para arquivos existentes. Imagens novas são validadas no navegador e, quando possível, redimensionadas ou compactadas para WebP. O Storage também limita os tipos aceitos e o tamanho a 8 MiB.

Uma notícia nova recebe um ID como rascunho antes de o painel enviar os arquivos. O salvamento atualiza a notícia e suas referências de imagens em uma transação, com verificação para evitar sobrescrever alterações de outra sessão. Se um upload ou salvamento falhar após criar o rascunho, ele pode ser retomado pela lista de notícias. Arquivos sem referência continuam privados. A exclusão física é restrita a administradores, que podem limpar arquivos órfãos no Storage.

## Integração do site público

Aplique também a migração que cria as consultas públicas de notícias e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no mesmo ambiente usado pelo painel. No desenvolvimento, `npm run dev` atende inclusive as rotas de artigo, sitemap e mídia. Para conferir o resultado compilado com a mesma configuração, rode `npm run build` e `npm run preview`.

- Sem ambas as variáveis do Supabase, o portal usa as cinco notícias de demonstração. Com um projeto configurado, falhas de consulta são exibidas como erros para que conteúdo removido no CMS não reapareça a partir da demonstração.
- O endereço de uma matéria é `/noticia/<slug>`. A listagem geral fica em `/ultimas-noticias`, as editorias em `/editoria/<slug>` e a busca em `/busca?q=<termo>`. Os links antigos `/#/<editoria>` continuam funcionando. Ao desativar uma editoria, o portal remove sua página e o link do menu. Matérias publicadas continuam acessíveis pela URL, na listagem geral e na busca.
- As consultas e os arquivos públicos respeitam a janela de publicação no Supabase. Cada acesso ou atualização consulta os dados atuais. Imagens enviadas pelo painel são mediadas por `/midia/`, que verifica novamente a referência pública e usa apenas a chave publicável.
- A função pública da Vercel entrega HTML e metadados de cada matéria, além de `/sitemap.xml` e `/robots.txt`. Configure `VITE_SITE_URL` com a origem canônica em produção, por exemplo `https://portaloficial.vercel.app`. Use a mesma origem na configuração do build e da função. O sitemap inclui até 50 mil URLs e deve ser dividido em um índice de sitemaps se o volume ultrapassar esse limite.

## Validação e prévia

Rode `npm ci`, `npm test` e `npm run build`. Os testes HTTP usam um serviço local simulado. Os testes em `supabase/tests/cms_permissions.sql` exercitam as políticas e migrações em um banco descartável. Para testar no navegador com a pilha local, use a URL e a chave publicável mostradas por `supabase status`, provisione os perfis de teste e abra `/admin` em `npm run dev` ou `npm run preview`. Use o Mailpit local para conferir o link de redefinição.

Antes de uma prévia hospedada, configure as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SITE_URL` no ambiente de **Preview** da Vercel. Use um Supabase de teste com as migrações aplicadas e cadastre a URL exata de recuperação dessa prévia no Supabase Auth. Em seguida, valide o acesso direto a `/admin` e `/noticia/<slug>`, a recuperação por e-mail e a publicação de uma matéria de teste com imagem. Confirme a branch de produção e mantenha as variáveis de **Production** separadas das de **Preview**.
