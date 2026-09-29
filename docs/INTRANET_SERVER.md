# MCL em servidor local da intranet

## Objetivo

Executar o MCL dentro da rede local, servido por um unico computador ou servidor da intranet, sem depender do Vercel para entregar as paginas aos notebooks HDMI.

A topologia alvo e:

```text
Estacao do gestor ─┐
Monitor 1 ─────────┤
Monitor 2 ─────────┤
...                 ├── rede local ── MCL Next.js ── PostgreSQL local
Monitor 8 ─────────┘                    no mesmo servidor
```

O MCL continua sendo uma aplicacao Node/Next.js. O banco de dados desta implantacao fica no mesmo servidor, em PostgreSQL 16, isolado em container e persistido no volume `mcl_intranet_postgres`.

## O que passa a funcionar sem Internet

Depois de instalado e com os dados necessarios no PostgreSQL local:

- interface do MCL;
- Painel CCOL;
- configuracoes dos oito monitores;
- documentos ja importados e aprovados;
- assets e cenas dos documentos;
- vinculo dos notebooks HDMI;
- leitura e atualizacao das telas pela intranet.

Conectores externos, OAuth Google/GitHub, PNCP, Compras.gov e recursos de IA continuam dependendo de saida para a Internet. A indisponibilidade desses servicos nao impede o servidor local de entregar as telas ja persistidas.

## Arquivos do pacote

- `Dockerfile.intranet`: imagem do MCL para servidor local;
- `docker-compose.intranet.yml`: MCL + PostgreSQL;
- `.env.intranet.example`: configuracao da instalacao;
- `scripts/intranet-entrypoint.sh`: migrations, build e inicializacao;
- `scripts/package-intranet-offline.sh`: gera pacote transportavel inclusive para servidor sem acesso externo.

## Implantacao direta em servidor com Internet

No servidor Linux:

```bash
git clone https://github.com/edersouzamelo/MCL.git
cd MCL
git checkout feat/intranet-local-server-20260929
cp .env.intranet.example .env.intranet
```

Edite `.env.intranet` e defina, no minimo:

```env
POSTGRES_PASSWORD=uma_senha_longa_alfanumerica
MCL_BASE_URL=http://IP_FIXO_DO_SERVIDOR:3000
AUTH_SECRET=um_segredo_longo_e_aleatorio
```

Depois:

```bash
docker compose --env-file .env.intranet -f docker-compose.intranet.yml up -d --build
```

O primeiro boot executa as migrations e compila o Next.js. Pode demorar alguns minutos.

Valide:

```text
http://IP_FIXO_DO_SERVIDOR:3000/api/health/db
```

Resposta esperada:

```json
{"status":"UP","database":"connected"}
```

Depois abra:

```text
http://IP_FIXO_DO_SERVIDOR:3000
```

## Pacote offline

Em uma maquina Linux com Internet e Docker:

```bash
bash scripts/package-intranet-offline.sh
```

O artefato sera:

```text
dist/mcl-intranet-local-server.tar.gz
```

Copie o arquivo para o servidor da intranet, extraia e siga `INSTALAR.txt`. As imagens do MCL e do PostgreSQL ja estarao dentro do pacote.

## Banco atual e migracao de dados

Nao conecte simultaneamente duas bases independentes esperando sincronizacao automatica. Vercel e servidor local somente compartilham estado se apontarem para o mesmo PostgreSQL ou se houver uma rotina de sincronizacao especifica.

Para tornar a intranet independente da Internet, a estrategia recomendada e copiar o banco atual uma vez para o PostgreSQL local e passar a operar o Painel CCOL pela URL da intranet.

Exemplo de exportacao, executado em maquina autorizada que possua acesso ao banco atual:

```bash
docker run --rm -e PGPASSWORD="$SOURCE_DB_PASSWORD" postgres:16-alpine \
  pg_dump -h "$SOURCE_DB_HOST" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -Fc > mcl.dump
```

Restaure no servidor local somente em janela de implantacao e antes do uso operacional. As credenciais reais nao devem ser versionadas.

## HTTP interno e cookie dos monitores

O vinculo dos notebooks HDMI usa cookie de longa duracao. Na intranet servida apenas por HTTP, configure:

```env
MCL_COOKIE_SECURE=false
```

A producao Vercel continua usando cookie seguro por padrao. Se a STI fornecer HTTPS para o endereco interno, use `MCL_COOKIE_SECURE=true`.

## Notebooks dos monitores

Os scripts de kiosk ja aceitam uma URL base. Exemplo Linux para o Monitor 1:

```bash
bash scripts/install-monitor-kiosk-linux.sh 1 http://IP_FIXO_DO_SERVIDOR:3000
```

No Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-monitor-kiosk-windows.ps1 -MonitorId 1 -BaseUrl "http://IP_FIXO_DO_SERVIDOR:3000"
```

A rota exibida sera:

```text
http://IP_FIXO_DO_SERVIDOR:3000/grupamento/monitor/1
```

Repita para os demais monitores.

## Requisitos para a STI

1. Um servidor ou computador Linux que permaneça ligado.
2. IP fixo ou reserva DHCP.
3. Acesso TCP dos notebooks ao servidor na porta escolhida, por padrao 3000.
4. Docker Engine e Docker Compose.
5. Opcionalmente, DNS interno, por exemplo `mcl.intra`.
6. Opcionalmente, reverse proxy/HTTPS para expor o MCL em porta 80/443.

Nenhuma publicacao no Vercel e necessaria para os browsers dos monitores depois que esta instancia local estiver ativa.
