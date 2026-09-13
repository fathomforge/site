---
title: "Reading usage without reading prompts"
description: "A guardrail sees everything an agent says. Here's how to build one that enforces a spend cap without ever being able to reconstruct a conversation."
date: 2026-09-02
draft: false
tags: ["privacy", "design", "agents"]
---

A guardrail sits in the most sensitive position in the stack. It sees every call, every
tool invocation, every response. That access is what makes it useful, and it's also why
installing one is a real decision rather than an obvious one.

So the constraint I started from was this: **the plugin should be able to enforce a spend
cap without ever being able to reconstruct a conversation.**

That turns out to be entirely achievable, because the two things need completely different
data.

## The hook hands you more than you need

Here is the shape of the `llm_output` payload as observed on a live gateway — field names
and types only:

```
{ runId, sessionId, provider, model, contextTokenBudget, contextWindowSource,
  resolvedRef, harnessId, assistantTexts, lastAssistant, usage }
```

Two of those are the conversation. `assistantTexts` is what the model said. `lastAssistant`
is the full transcript entry — `role`, `content`, `provider`, `stopReason`, `timestamp`, the
lot.

Nobody asked for them. They arrive because the hook is general-purpose, and every plugin on
the gateway receives them.

Everything a spend meter actually needs is arithmetic:

- input and output token counts, plus `cacheRead` and `cacheWrite`
- transport bytes, where the gateway reports them
- a model identifier, to look up a price
- a timestamp, to put it in the right window

None of that requires reading a single word of a prompt or a reply. So the rule in the
codebase is blunt: **read `usage`, never touch `assistantTexts` or `lastAssistant.content`.**
Not "redact them later" — never read them in the first place. A field you don't read can't
leak, can't end up in a log line, and can't be accidentally serialised by a future
contributor who didn't know the rule.

## The recorder stores decisions, not evidence

This is where the discipline actually got tested.

A guardrail needs an audit trail — if it blocked something, you need to be able to prove it
blocked something. The tempting design writes the offending payload to disk so you can see
what tripped the limit. That is also exactly how a guardrail becomes the largest liability
in your system: one file containing everything every agent was ever asked.

So the flight recorder writes a line per decision, and the line contains the decision:

| field | example |
|---|---|
| what happened | `blocked`, `ended`, `escalated`, `logged` |
| which rung the ladder reached | `endRun` |
| the arithmetic | the threshold, the observed value |

And nothing about what was being discussed.

You lose some debuggability. When a limit fires you learn *that* an agent made 300 identical
calls, not what it was trying to say. In exchange you get a component that is safe to run in
production without a data-handling review — which, for most teams, is worth considerably
more than the thing you gave up.

The trail is a local JSONL file. It never leaves the machine, because the plugin makes no
network calls except the alerts you configure yourself.

## Why this matters beyond my plugin

The general principle: **an observability component should be scoped to the question it
answers.** A spend meter answers "how much," and "how much" is a number. The moment it can
also answer "about what," it has become a surveillance tool that happens to do billing.

That distinction is easy to hold at design time and very hard to retrofit, because by then
something else depends on the content being there.
