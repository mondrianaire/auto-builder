You are picking up {slug} — a repo that was auto-built by AutoBuilder
(https://github.com/mondrianaire/auto-builder), ratified on {ratified_at},
and promoted here for product life.

{live_url_line}

WHERE THIS CAME FROM (informational, not regulatory)

The original AutoBuilder prompt was:

{prompt_abbreviated}

AutoBuilder's Discovery role interpreted that as:

{discovery_restatement}

Major choices AutoBuilder made on the user's behalf (the inflection
points it surfaced and defaulted):

{inflection_points_as_real_world_bullets}

Verification verdict was {verdict}.

{notable_exceptions_block_if_any}

WHERE TO LOOK NEXT

Read .claude/CLAUDE.md in this repo — it's auto-generated and contains
the full orientation: build provenance, "you are here" framing, repo
structure, visual iteration paths (Chrome MCP or puppeteer), product-
life mode guidance, and links into the AutoBuilder corpus for deeper
"why was this built this way" forensics.

The build is your STARTING POINT, not a specification. The user's actual
goals may have shifted since the build ran, and the AutoBuilder choices
above were defensible defaults — not commitments. Treat them as context
for understanding what's currently there, not as a frame the product
must stay within.

FIRST ACTION

Read .claude/CLAUDE.md, take a look at {live_url_or_local_entry_point}
(via Chrome MCP or puppeteer per the CLAUDE.md guidance), and tell me
what you see — what seems solid, what looks broken or unfinished, what
you'd want to know before making changes. Don't touch any files yet.
