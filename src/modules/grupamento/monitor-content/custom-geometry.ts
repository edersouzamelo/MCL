/** Supported DrawingML path commands only. Unknown commands stay blocked. */
export function customGeometry(xml: string) {
  const custom = xml.match(/<a:custGeom\b[\s\S]*?<\/a:custGeom>/)?.[0];
  if (!custom) return undefined;
  const paths = [...custom.matchAll(/<a:path\b([^>]*)>([\s\S]*?)<\/a:path>/g)];
  if (paths.length !== 1) return undefined;
  const width = Number(paths[0][1].match(/\bw="(\d+)"/)?.[1]);
  const height = Number(paths[0][1].match(/\bh="(\d+)"/)?.[1]);
  if (!(width > 0 && height > 0)) return undefined;
  let body = paths[0][2], path = "";
  const commands = /<a:(moveTo|lnTo|cubicBezTo|quadBezTo)\b[^>]*>([\s\S]*?)<\/a:\1>|<a:close\s*\/>/g;
  for (const command of body.matchAll(commands)) {
    if (!command[1]) path += " Z";
    else {
      const points = [...command[2].matchAll(/<a:pt\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"[^>]*\/>/g)];
      const counts: Record<string, number> = { moveTo: 1, lnTo: 1, cubicBezTo: 3, quadBezTo: 2 };
      if (points.length !== counts[command[1]]) return undefined;
      const letters: Record<string, string> = { moveTo: "M", lnTo: "L", cubicBezTo: "C", quadBezTo: "Q" };
      path += " " + letters[command[1]] + points.map(p => `${Number(p[1])} ${Number(p[2])}`).join(" ");
    }
  }
  body = body.replace(commands, "").trim();
  return body || !path ? undefined : { path: path.trim(), width, height };
}
