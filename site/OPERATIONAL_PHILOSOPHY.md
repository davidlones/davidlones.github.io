# Sol Operational Philosophy

Captured: 2026-06-06

Status: canonical operating policy for Sol-37 and related Sol runtime work.

Historical continuity: see [`SOL_ARCHIVE_OPERATIONAL_HISTORY.md`](SOL_ARCHIVE_OPERATIONAL_HISTORY.md) for the recorded development of this operating philosophy.

## Operational Philosophy

The Sol system is not merely a software project. It is a continuously operating archival environment.

Treat changes as modifications to a living system rather than isolated code edits.

Before significant changes:

- Create backups.
- Verify restore paths.
- Preserve prior behavior when possible.
- Record the rationale for changes.

After changes:

- Validate functionality.
- Validate public-facing behavior.
- Validate runtime services.
- Validate dependent systems.
- Document findings.

Never assume a successful build implies a successful deployment. Never assume a successful deployment implies a successful user experience. Verification must occur at every layer.

## Runtime Documentation

Operational discoveries should become permanent knowledge. If a debugging session reveals service restart procedures, failure modes, cache behavior, deployment requirements, recovery workflows, or architectural constraints, document them immediately.

Institutional memory should not remain trapped in terminal scrollback.

## Archive Promotion Rule

When a conversation produces durable operational knowledge, do not leave that knowledge in chat history. Promote it.

Potential destinations include:

- Documentation.
- Runbooks.
- Skills.
- Site content.
- Indexes.
- Searchable archives.

Valuable discoveries should migrate toward permanence. Conversation can become policy; policy can become documentation; documentation can become operational behavior; operational behavior can shape future conversations.

## Archive Gravity

Information should naturally migrate toward the most durable form available.

- Terminal output becomes notes.
- Notes become documentation.
- Documentation becomes policy.
- Policy becomes automation.
- Automation becomes institutional memory.

The archive should not merely store outcomes. It should preserve the path by which observations become procedures and procedures become future behavior.

## Archive Ecology

Not all information deserves promotion. Information should compete for permanence.

- Repeated observations gain weight.
- Verified procedures gain authority.
- Used knowledge stays active.
- Unused knowledge may decay.
- Contradicted knowledge should be archived, not erased.
- Institutional memory should remain searchable while confidence evolves over time.

Promotion should be selective. Preserve context, provenance, verification status, and contradiction history so the archive can distinguish durable knowledge from transient interpretation.

## Cache Philosophy

Caching is not merely a performance feature. Caching is a preservation mechanism.

Whenever practical:

- Preserve expensive reasoning.
- Preserve generated context.
- Preserve successful interpretations.
- Preserve page-specific summaries.

Reuse must remain context-bound. Correctness is more important than cache hit rate. Avoid semantic reuse when it risks altering meaning.

## Archive-First Development

When adding new features, ask:

1. Does this improve retrieval?
2. Does this improve recollection?
3. Does this improve preservation?
4. Does this improve discoverability of existing knowledge?

Features that increase memory value should generally outrank features that merely increase visual complexity.

## Observability Requirements

Major systems should expose:

- Health status.
- Verification paths.
- Failure states.
- Recovery procedures.

A system that cannot explain its condition is difficult to preserve.

## Narrative Continuity

Technical changes are part of the archive. Development logs, architectural decisions, operational incidents, and deployment stories are themselves archival artifacts.

The history of the system should be searchable alongside the content the system stores. The archive should preserve not only what was created, but how it came to exist.
