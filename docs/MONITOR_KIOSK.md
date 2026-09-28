# Exibição automática dos monitores CCOL

O painel central controla telas SAG, documentos aprovados, ordem e intervalo. Cada notebook HDMI precisa manter um navegador aberto na rota do monitor. O site atualiza essa página a cada 30 segundos; uma página fechada não pode ser aberta remotamente por outro navegador.

## Instalação única no notebook HDMI

1. Conecte o notebook ao monitor pelo HDMI e configure a TV como a saída desejada no sistema operacional.
2. No Windows, execute no PowerShell da conta que ficará ligada à TV: `powershell -ExecutionPolicy Bypass -File scripts/install-monitor-kiosk-windows.ps1 -MonitorId 6`. Para a TV posicionada à direita do notebook no modo estendido, informe também `-WindowX 1920` (ajuste à resolução real).
3. No Linux, execute: `bash scripts/install-monitor-kiosk-linux.sh 6`.
4. Na primeira abertura, entre com a conta gestora do MCL no perfil de navegador criado pelo instalador. Revele o rodapé do monitor e clique **Vincular notebook**. O vínculo autoriza apenas leitura do monitor escolhido, dura até 180 dias e pode ser revogado no painel CCOL em **Notebooks HDMI vinculados**.
5. Deixe o navegador em execução. Nos próximos logons do sistema operacional, a tarefa do Windows ou o autostart do Linux abre o mesmo perfil já vinculado em tela cheia.

Depois disso, altere a configuração e os documentos pelo painel CCOL em qualquer terminal da mesma organização. A TV recebe as mudanças sem repetir **Abrir** ou F11. Novas versões do código passam a provocar recarga automática em até um minuto. Para receber esse mecanismo pela primeira vez, reabra o monitor uma vez após esta implantação. O notebook precisa estar ligado, com sessão gráfica iniciada e rede disponível. Após reinicialização, se a política local exige senha do sistema operacional, alguém ainda precisa desbloquear essa sessão. Quando o vínculo expirar ou for revogado, entre novamente no MCL nesse perfil e vincule de novo.

Não use navegação anônima nem apague o perfil de navegador criado pelo instalador: isso apagaria o cookie de exibição. Para remover a abertura automática, exclua a tarefa `MCL Monitor N` do Agendador de Tarefas no Windows ou o arquivo `~/.config/autostart/mcl-monitor-N.desktop` no Linux, e revogue o vínculo no painel.
