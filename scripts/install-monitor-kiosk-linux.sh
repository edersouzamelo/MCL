#!/usr/bin/env bash
set -euo pipefail

monitor_id="${1:-}"
if [[ ! "$monitor_id" =~ ^[1-8]$ ]]; then
  echo "Uso: bash install-monitor-kiosk-linux.sh <monitor de 1 a 8> [URL base]" >&2
  exit 2
fi
base_url="${2:-https://mcl-one.vercel.app}"
target="${base_url%/}/grupamento/monitor/$monitor_id"
profile_dir="${XDG_DATA_HOME:-$HOME/.local/share}/mcl/monitor-$monitor_id"
autostart_dir="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
mkdir -p "$profile_dir" "$autostart_dir"

if command -v firefox >/dev/null 2>&1; then
  browser="$(command -v firefox)"
  browser_kind="firefox"
elif command -v chromium >/dev/null 2>&1; then
  browser="$(command -v chromium)"
  browser_kind="chromium"
elif command -v google-chrome >/dev/null 2>&1; then
  browser="$(command -v google-chrome)"
  browser_kind="chromium"
else
  echo "Instale Firefox, Chromium ou Chrome antes de configurar o monitor." >&2
  exit 1
fi

desktop_file="$autostart_dir/mcl-monitor-$monitor_id.desktop"
launcher="$profile_dir/launch.sh"
printf -v quoted_browser '%q' "$browser"
printf -v quoted_profile '%q' "$profile_dir"
printf -v quoted_target '%q' "$target"
if [[ "$browser_kind" == "firefox" ]]; then
  printf '#!/usr/bin/env bash\nexec %s -no-remote -profile %s --kiosk %s\n' "$quoted_browser" "$quoted_profile" "$quoted_target" > "$launcher"
else
  printf '#!/usr/bin/env bash\nexec %s --user-data-dir=%s --no-first-run --start-fullscreen --app=%s\n' "$quoted_browser" "$quoted_profile" "$quoted_target" > "$launcher"
fi
chmod 700 "$launcher"
cat > "$desktop_file" <<EOF
[Desktop Entry]
Type=Application
Name=MCL Monitor $monitor_id
Comment=Abre o monitor do CCOL no notebook HDMI
Exec="$launcher"
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
"$launcher" >/dev/null 2>&1 &
echo "Monitor $monitor_id configurado. Nesta primeira abertura, entre no MCL e clique em 'Vincular notebook' no rodape."
echo "A sessao grafica abrira esta pagina automaticamente nos proximos logons."
