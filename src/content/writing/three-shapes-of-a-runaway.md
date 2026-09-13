---
title: "Three shapes of a runaway"
description: "Five months of production agent logs, and almost every expensive incident is one of three patterns. None of them look like failures while they're happening."
date: 2026-09-10
draft: false
tags: ["agents", "cost", "incidents"]
---

People assume a surprise bill from an autonomous agent means something exotic happened. In
five months of running five agents in production, it never once did. The agent did exactly
what it was told, for far longer than anyone pictured, and nothing in the stack was built
to notice.

Sorting my own incidents, almost all of the expensive ones are one of three shapes. I can
point at two of them in my own billing chart, and the third is invisible there — which is
the part worth staying for.

## 1. The invented task

One of my agents received a bare "Hello". From that it invented a task — a piece of
administrative work involving two people who do not exist — decided the task needed
announcing, went looking for a group to announce it in, guessed at a chat id, and settled
into roughly eleven model calls a minute. **148 events from one message**, until I
restarted it. It came close to broadcasting a fabricated ruling to a channel nobody had
authorised it to touch.

The cause was mundane: a deprecated model, and zero tool restrictions on the most
autonomous agent I had.

What makes this shape expensive is that the agent is *working*. Every call is well-formed.
Every response is a plausible next step. There is no error anywhere in the logs, because
from the inside this is indistinguishable from an agent doing its job.

**Signature:** sustained model-call rate from a single session, with no corresponding tool
errors. If you only alert on errors, you will never see this one.

## 2. The retried error

A model hallucinated a web URL instead of using the internal media reference it had been
given. The fetch 404'd. It tried again. Over four days it retried **245 to 700 model calls
per stuck photo**, each one re-sending a large context.

This was the single biggest cost spike of the project, and it is the least interesting
failure I have ever debugged. There was no retry cap, and tool-error storms weren't visible
anywhere.

The thing worth internalising: retry logic is written as though retries are cheap. In a
loop that re-sends a full context every time, the retry is the most expensive operation in
the system, and the failure is *self-sustaining* — a 404 is a perfectly ordinary thing for
a tool to return, so nothing escalates.

**Signature:** the same call, repeated, with the same error. Cheap to detect if you count
identical calls across a run; invisible if you only look at any single one.

## 3. The quiet reprocess

The other two are spikes. This one is a plateau, and it is the one I would have missed
indefinitely.

An hourly heartbeat on one agent re-read a **~174K-token context** every hour to "review"
sub-agent memories. Nothing was wrong. Nothing looped. It was doing precisely what it had
been configured to do, twenty-four times a day, forever. It was most likely my largest
steady cost, and it never produced a single anomalous-looking event.

**Signature:** there isn't a spike to find. You catch this one with a per-agent daily
budget and a warning when context size crosses a threshold — or you catch it by reading
your bill closely, which is how I caught it.

## What they have in common

All three are healthy at the level of the individual call. A well-formed request, a 200
response, a reasonable next action. The failure only exists in aggregate, which is why
per-call inspection — the thing every gateway gives you by default — cannot see any of
them.

That has a practical consequence for what you instrument. The useful signals are all
counters over a window:

- model calls per session per minute → catches shape 1
- identical calls, and repeated errors, per run → catches shape 2
- spend or bytes per agent per day, plus context size → catches shape 3

None of those require reading a single prompt, which matters if you'd rather not build
something that can reconstruct your conversations.

## What this looks like on a bill

I went back to the billing dashboard for the project these agents run on. I'm not going to
post the dollar figures — the absolute numbers are small enough to be misleading, because
this is a personal deployment on a cheap model. The ratios are the part that transfers.

**The invented task is the obvious one.** The confabulation loop happened on September 2nd.
That single day cost **about twenty-five times my normal daily spend**, and on its own
accounted for **nearly half of that entire month's** API cost — more than a fifth of my
last ninety days. From one "Hello".

Scale the model up and that ratio doesn't improve. It gets worse, because the expensive
models are the ones you reach for when an agent matters.

**The quiet reprocess is nowhere in that chart.** No spike. No bar that stands out. The
hourly heartbeat re-reading a 174K-token context just lifted the baseline slightly and
stayed there, for weeks, looking exactly like normal operation — because it *was* normal
operation. It was doing what I configured it to do.

That contrast is the whole argument for counting things. The incident that looks dramatic
on a chart is the one you'd have caught anyway, eventually, by noticing. The one that
doesn't show up at all is the one that needs a cap, because nothing about it will ever
attract your attention.

An agent that crashes tells you immediately. An agent that works, continuously, on
something nobody asked for is the expensive one, and the only thing that finds it is
something counting.
