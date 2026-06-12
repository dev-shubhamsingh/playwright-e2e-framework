<div align="center">

# 🤖 TARS

### Test Automation & Reliability System

**An autonomous quality-engineering agent that builds, runs, and reasons about
the test suite — encoded as living rules, shipping real intelligence today.**

</div>

---

## The idea

A principal SDET's value isn't typing tests — it's _judgment_: knowing what to
test, spotting flake before it spreads, reading a run and saying "ship it" or
"stop." TARS captures that judgment as a system: **rules that govern how the
suite is built** plus **engines that act on every run**. It doesn't replace the
engineer; it does the 10x of the busywork so the engineer does the thinking.

This is built the way you'd build a product, not a demo: ship a working core,
be honest about what's next, and never claim a capability that isn't running.

## Shipped today

| Capability                   | What it does                                                                                                                                                                                                                                                                            | Where                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Mission Control reporter** | A custom Playwright reporter that turns every run into intelligence: pass rate, **flake detection** (tests that only went green on retry), slowest paths, and breakdowns by project and tag. Writes a Markdown brief + console summary. Defensive by design — it can never break a run. | [`reporter/TarsReporter.ts`](./reporter/TarsReporter.ts)                                                         |
| **Governance engine**        | Three steering documents that hold every change — human or AI — to a principal bar: typed code, deterministic tests, clean commits, honest tradeoffs. Loaded as context on every interaction.                                                                                           | [`persona.md`](./persona.md) · [`architecture.md`](./architecture.md) · [`test-patterns.md`](./test-patterns.md) |

Run any suite and TARS reports:

```
┌─ 🤖 TARS Mission Control ─────────────────────────────
│ 🟢 ALL SYSTEMS GREEN
│ Pass 100.0% (28/28)  ·  Flake 0.00%  ·  Fail 0  ·  3.7s
│ Brief written to tars-report.md
└───────────────────────────────────────────────────────
```

## Architecture — the agent loop

TARS follows the classic autonomous-agent loop, grounded in real tooling rather
than buzzwords:

```mermaid
flowchart LR
    subgraph SENSE["1 · Sense"]
        R[Run results]
        T[Traces / timings]
        H[Git history]
    end
    subgraph REASON["2 · Reason"]
        M[Rules + memory<br/>persona · architecture · patterns]
        Q[Quality signals<br/>flake · pass rate · risk]
    end
    subgraph ACT["3 · Act"]
        B[Mission Control brief]
        G[Quality gates]
        N[Next-step proposals]
    end
    SENSE --> REASON --> ACT --> SENSE
    classDef s fill:#1f6feb,color:#fff;
    class M,Q s;
```

- **Sense** — ingest test results, durations, retries, and (roadmap) traces +
  diffs.
- **Reason** — apply the governing rules and quality signals; decide what
  matters.
- **Act** — emit the Mission Control brief today; gate, quarantine, and propose
  fixes on the roadmap.

## Capability roadmap

Honest status — `✅` runs today, `◐` in design, `○` planned. Each maps to an
industry best practice a senior QE team would recognise.

| Capability                                  | Best practice                     | Status |
| ------------------------------------------- | --------------------------------- | ------ |
| Run intelligence brief (pass/flake/slowest) | Observability-driven QE           | ✅     |
| Flake detection from retries                | Flake <1% culture                 | ✅     |
| Governance rules as living docs             | Shift-left, code-review-as-config | ✅     |
| Auto-quarantine of flaky tests              | Deterministic CI                  | ◐      |
| Risk-based test selection from git diff     | Test-impact analysis              | ◐      |
| Trend memory across runs (SQLite/JSON)      | SLO dashboards                    | ◐      |
| Failure triage: correlate trace + logs      | MTTR reduction                    | ○      |
| MCP server — TARS as a callable agent tool  | Agent-native tooling              | ○      |
| Self-healing locator suggestions            | AI-augmented authoring            | ○      |
| PR review bot (rules + diff)                | Quality gate automation           | ○      |

## Principles (the honesty setting)

TARS is built to push back, not comply. From this project's actual history:

- **Deferred `mergeTests`** — no real consumer, so it wasn't added as dead code.
- **Swapped Vitest → Jest** for Pact mid-build — wrong runner, called it out.
- **Baselined a real WCAG defect** instead of ignoring it — the a11y engine
  caught a genuine `select-name` violation in the target app.
- **Kept visual tests out of gated CI** — OS-specific baselines would cause
  false failures; documented the tradeoff instead of hiding it.

---

<div align="center">

**Rules govern. Engines act. The engineer decides.**

← back to the [framework README](../README.md)

</div>
