# MCL Input Compiler

## Problem and implementation boundary

The previous PPTX path independently extracted objects, applied broad cleanup,
selected titles from font size alone, and rendered objects without provenance or
a fidelity gate. Reverting PR105 restored the display but did not implement the
structural request. This change starts from PR108 and replaces that ingestion
path with a versioned compiler. It contains no filename, monitor-ID, OM-ID, or
one-document layout exceptions.

## Contracts and data flow

`rawInput` is the immutable binary in `MonitorContentImport.rawFile`, identified
by SHA-256. `parsedInput` preserves extracted elements, native IDs/types,
geometry, z-order, parent groups, XML group transforms, complete native chart
metadata and extraction issues. `interpretedContent` records archetype,
spatial relationships, atomic blocks and protected entities. `normalizedContent`
is a separate copy with explained transformations. `renderedOutput` is selected
by the strategy and measured in the React renderer. Structural PASS and observed
visual fidelity are separate facts.

The eight archetypes are COVER, CHART_CENTRIC, TABLE_CENTRIC, DOCUMENT_LIKE,
IMAGE_FULLFRAME, TEXT_CENTRIC, MIXED and UNKNOWN. Confidence is a heuristic score,
not a calibrated probability of fidelity. Annotation relationships are based on
geometry. Unsupported charts, grouped transforms, source crops/rotations,
inherited meaningful objects and uncertain mixed compositions require a native
reference; they are not flattened by deleting their constituent information.

Documents are paginated as ordered paragraphs in the existing TV frame. Repeated
words and fields remain repeated. Atomic compositions use one common affine
transform or the complete native slide. Only demonstrably redundant neutral
chart backgrounds may be removed; their source node and explanation remain.

## Coverage of the original request

| Requirement | Implementation / limit |
| --- | --- |
| Preserve original and stages | Immutable binary, source hash, separate IR copies and append-only revisions |
| Scene graph and origin | Stable slide/object IDs, type, geometry, native metadata and group provenance |
| Spatial relations | Containment, overlap, near, annotation and chart/image/table membership |
| Classify heterogeneous inputs | Eight archetypes, conservative deterministic rules |
| Atomic chart plus annotations | Preserve graph constituents; use native fallback for uncertain composition |
| All chart data and metadata | Series, categories, values, labels, axes, units and legend retained; unsupported chart XML series recorded |
| Document layout | Ordered paragraphs and measured dynamic pagination, no stored text truncation |
| Integral cover | Full-frame image, no duplicated reconstructed heading |
| Semantic names | Reusable entity trie: 5,298 distinct official municipality names, existing OM catalog and institutional tokens |
| Unknown proper names | Preserve spelling rather than blindly lowercase; automatic resolution of arbitrary unknown names remains uncertain |
| PI/UASG | Source identifiers preserved and additional catalog entities supported by the semantic API; existing SAG enrichment remains separate |
| Cleanup | Narrow, recorded transformations; uncertain small images/shapes retained |
| Confidence and decision explanation | Per-slide scores, reasons, transformations and diagnostic view |
| Optional LLM | ID-only semantic classification, strict schema, validation, no values/layout invention |
| LLM budget and cache | Opt-in, at most two calls/import, 10s/call, 1,800 output tokens, persistent org/model/version/hash cache |
| Preflight | Text token multiset, repeated tokens, chart/table/image signatures, unsupported elements and geometry |
| Readability | Existing measured document pagination; structured text DOM overflow/minimum font gate |
| Native visual reference | SHA-bound Office/PDF conversion to PNG, page count/order/resolution/text checks |
| Fallback | Whole-slide native reference; region-level clipping is intentionally not used for uncertain dependent objects |
| Visual comparison | Regression browser captures compare native composition with its own reference and measure text clipping; this is not a PowerPoint equivalence guarantee |
| Safe failure | Blocked preview cannot be approved; failed automatic or manual replacement preserves current data |
| Human exception desk | Original reference, graph, explanations, archetype review, faithful/correction-needed recording, existing editor |
| Metrics | Archetypes, failures, fallbacks, LLM/cache; verified-without-correction denominator uses explicit human reviews only |
| Regression corpus | Reproducible synthetic PPTX generator for eight incident classes, invariant tests and real-file private visual verification |
| Rollback | Original binary and append-only scene revisions retained, including prior assets; no UI restore action yet |
| PDF/DOCX | Whole-page native preservation; detailed editable vector graphs are not extracted from every PDF/DOCX object |
| CCOL/SAG/PWA/control | Existing routes, frame and workflows retained; no automatic reprocessing of existing published version7 imports |

## Native runtime and deployment gate

The default provider uses the existing Vercel project OIDC identity and
`@vercel/sandbox`. A reusable snapshot contains Ubuntu, LibreOffice, Poppler and
fonts only. Customer bytes are written only after a separate ephemeral conversion
VM is created from that software snapshot. Conversion has denied outbound
networking, no exposed port and no snapshot of user data. The VM is stopped after
success or failure. The snapshot reference is cached and expired references are
invalidated. Preparing the first snapshot adds latency.

The alternate provider is `workers/monitor-renderer`, a bounded authenticated
HTTP worker with the same response contract. Set `MCL_NATIVE_RENDERER_URL` and
`MCL_NATIVE_RENDERER_TOKEN` together to use it. The client checks the input hash,
PNG hash, ordered page count and image resolution before attaching references.
Local worker integration was exercised with the synthetic corpus and the supplied
PPTX. Cloud permissions, project OIDC availability, font matching, cost and runtime
limits must be validated in the preview environment before promotion.

Every Vercel preview build invokes `scripts/verify-compiler-deployment.ts` after
Next.js build. It generates public synthetic inputs, runs actual native conversion
and refuses a green preview if any of eight scenes is blocked or native fallback
was not exercised. This check needs the additive migration and usable native
provider. It does not read or upload operational slides, does not create imports
and does not mark human quality reviews.

LibreOffice is a compatibility renderer, not Microsoft PowerPoint. It can differ
for unavailable fonts, embedded objects or unsupported Office effects. Structural
checks and native text checks do not prove pixel identity with the PowerPoint UI.
An operator can record NEEDS_CORRECTION; this blocks approval. Universal visual
semantic judging and font-perfect Office compatibility are not claimed.

## Administrative diagnostics

`GET /api/grupamento/monitor-content/[importId]/diagnostics` and
`POST /api/grupamento/monitor-content/[importId]/review` require ADMIN or
LOGISTICS_MANAGER and enforce organization scope. Review changes use serializable
transactions, compare-and-swap and audit logs. `GET .../quality` reports explicit
verified sample size; no reviewed sample yields null rather than fabricated 100%.
Reprocessing/editor changes append prior snapshots and retain referenced assets.
The additive migration creates `MonitorContentRevision` and
`MonitorCompilerDecision`; existing operational tables are not rewritten.

## Validation recorded before publication

Local unit suite, typecheck, lint and production build must pass. Private browser
verification covers the supplied nine-slide deck and eight synthetic slides at
1536x864 and 1280x720. Native fallbacks are compared to reference PNGs after fitting;
structured/report text is measured for clipping. Synthetic long reports span
three/four pages depending on viewport. Screenshots and extracted operational
content remain outside the public repository. Cloud preview verification remains
a separate required result, not an inference from local tests.
