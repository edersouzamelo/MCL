import { findOmCrest, omMentionParts, omDisplayName } from "@/modules/grupamento/om-crests";

/** Exact catalog lookup. Unknown units keep their name without a guessed emblem. */
export function OmIdentity({ name, className = "" }: { name: string; className?: string }) {
  const om = findOmCrest(name);
  return <span className={`mcl-om-identity ${className}`}>
    {/* Native image keeps the transparent official contour and works in offline captures. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {om && <img src={om.image} alt={`Escudo ${om.acronym}`} title={om.name} width={40} height={56} loading="eager" />}
    <span>{omDisplayName(name)}</span>
  </span>;
}

export function OmMentions({ text, header = false }: { text: string; header?: boolean }) {
  return <>{omMentionParts(text).map((part, index) => part.om && !(header && part.om.id === "9-gpt-log")
    ? <OmIdentity key={index} name={part.text} className="mcl-om-mention" />
    : <span key={index}>{part.text}</span>)}</>;
}
