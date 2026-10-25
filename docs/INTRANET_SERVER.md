# MCL em servidor local da intranet

## Alvo confirmado

Servidor institucional:

- Sistema operacional: Ubuntu 26.04
- IP fixo: `10.56.120.28`
- Docker Engine e Docker Compose: autorizados
- URL inicial do MCL: `http://10.56.120.28:3000`

## Objetivo

Executar o MCL dentro da rede local, servido pelo servidor da intranet, sem depender do Vercel para entregar as paginas aos notebooks HDMI.

A topologia alvo e:

```text
Estacao do gestor ─┐
Monitor 1 ─────────┤
Monitor 2 ─────────┤
...                 ├── intranet ── 10.56.120.28 ── MCL Next.js ── PostgreSQL local
Monitor 8 ─────────┘
```

A implantacao Vercel/Supabase continua existindo em paralelo. O servidor da intranet e uma segunda implantacao do mesmo codigo, destinada a operacao local.

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

## Instalacao no Ubuntu 26.04

No servidor, clone este repositorio e use o instalador preparado:

```bash
git clone https://github.com/edersouzamelo/MCL.git /opt/mcl
cd /opt/mcl
git checkout feat/intranet-local-server-20260929
sudo bash scripts/install-intranet-ubuntu-26.04.sh
```

Na primeira execucao o instalador criara `.env.intranet` e interrompera antes de subir os containers enquanto existirem segredos `CHANGE_ME`.

Edite:

```bash
sudo nano /opt/mcl/.env.intranet
```

Defina no minimo:

```env
POSTGRES_PASSWORD=uma_senha_longa_alfanumerica
AUTH_SECRET=um_segredo_longo_e_aleatorio
MCL_BASE_URL=http://10.56.120.28:3000
```

Depois execute novamente:

```bash
cd /opt/mcl
sudo bash scripts/install-intranet-ubuntu-26.04.sh
```

Valide:

```text
http://10.56.120.28:3000/api/health/db
```

Resposta esperada:

```json
{"status":"UP","database":"connected"}
```

A aplicacao fica em:

```text
http://10.56.120.28:3000
```

## Arquivos do pacote

- `Dockerfile.intranet`: imagem do MCL para servidor local;
- `docker-compose.intranet.yml`: MCL + PostgreSQL;
- `.env.intranet.example`: configuracao da instalacao, ja apontada para 10.56.120.28;
- `scripts/install-intranet-ubuntu-26.04.sh`: instalacao e subida no Ubuntu 26.04;
- `scripts/intranet-entrypoint.sh`: migrations, build e inicializacao;
- `scripts/package-intranet-offline.sh`: gera pacote transportavel inclusive para servidor sem acesso externo.

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

## Banco atual e sincronizacao

Vercel/Supabase e PostgreSQL local nao devem ser tratados como duas bases que se sobrescrevem livremente.

A implantacao local deve receber uma copia inicial dos dados necessarios. A sincronizacao ciclica entre cloud e intranet sera implementada como uma camada propria, com marcacao de versao/horario, fila de alteracoes pendentes e autoridade definida por tipo de dado. Ate essa camada entrar em producao, a base local nao deve ser considerada um espelho automatico do Supabase.

Para uma copia inicial autorizada do banco atual:

```bash
docker run --rm -e PGPASSWORD="$SOURCE_DB_PASSWORD" postgres:16-alpine \
  pg_dump -h "$SOURCE_DB_HOST" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -Fc > mcl.dump
```

As credenciais reais nao devem ser versionadas.

## HTTP interno e cookie dos monitores

O vinculo dos notebooks HDMI usa cookie de longa duracao. Na intranet servida apenas por HTTP:

```env
MCL_COOKIE_SECURE=false
```

A producao Vercel continua usando cookie seguro por padrao. Se futuramente houver HTTPS interno, use `MCL_COOKIE_SECURE=true`.

## Notebooks dos monitores

Linux, exemplo Monitor 1:

```bash
bash scripts/install-monitor-kiosk-linux.sh 1 http://10.56.120.28:3000
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-monitor-kiosk-windows.ps1 -MonitorId 1 -BaseUrl "http://10.56.120.28:3000"
```

Rota direta:

```text
http://10.56.120.28:3000/grupamento/monitor/1
```

Repita para os demais monitores.

## Requisitos de rede

1. O servidor Ubuntu 26.04 deve permanecer ligado.
2. O IP `10.56.120.28` deve permanecer reservado ao servidor.
3. Os notebooks precisam alcançar TCP `10.56.120.28:3000`.
4. Docker deve iniciar com o sistema.
5. Opcionalmente, a STI pode criar DNS interno, por exemplo `mcl.intra`.
6. Opcionalmente, um reverse proxy pode expor o MCL em porta 80/443.

A operacao local dos browsers dos monitores nao depende do Vercel depois que esta instancia estiver ativa.
