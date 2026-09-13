---
title: "Prompt injection is a blast radius problem"
description: "You cannot reliably detect the attack. So stop making detection the control, and start bounding what a successful one costs you — including being honest about which bounds you actually have."
date: 2026-09-06
draft: false
tags: ["prompt-injection", "agents", "security"]
---

Most prompt-injection advice is about the prompt. Sanitise the input, wrap untrusted
content in delimiters, add a system message telling the model to ignore instructions found
in documents. All of it helps a little. None of it is a control you can put in a threat
model and defend.

The reason is structural. For a language model, instructions and data arrive on the same
channel. There is no out-of-band signal that says *this part is the operator talking and
this part is a stranger*. Every mitigation that works on the prompt is trying to
reconstruct a boundary the architecture does not have.

This isn't a hunch. In 2023, Greshake and co-authors demonstrated *indirect* prompt
injection — payloads delivered through content the model retrieves rather than text the
user types — against real deployed systems including Bing's GPT-4-powered Chat
([arXiv:2302.12173](https://arxiv.org/abs/2302.12173)). Three years on, the attack class is
still with us, and the defences that have held are the ones that assume it succeeds.

More useful for practitioners is Simon Willison's
[lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/), which names
the three conditions that together make an agent worth attacking: **access to private data,
exposure to untrusted content, and a way to send data back out.** An agent with all three
is exploitable. An agent missing any one of them mostly isn't.

Willison's conclusion is the one I'd underline, because it's the opposite of where most
effort goes: the way out is to cut off one leg, and the most practical leg to cut is the
last one — the ability to send data anywhere the attacker can reach.

That reframes the problem into something you can actually build. Two of those three legs
are infrastructure decisions, and neither requires detecting anything.

## Untrusted content is almost everything

"Don't paste untrusted text into your prompt" badly understates the surface. For an agent
with tools, untrusted content includes:

- every web page it fetches
- every error message from an API it calls
- the contents of files it reads, including ones it wrote earlier
- messages from other agents, including your own
- filenames, HTTP headers, alt text, commit messages

An agent with web access reads attacker-controlled text as a matter of routine. That isn't
a misconfiguration; it's the job. The question was never whether hostile text reaches the
model. It's what happens in the five seconds afterward.

## The failure I actually had

The incident that convinced me of this wasn't an injection at all, and I want to be
careful about that. I've written about it
[in more detail elsewhere](/writing/three-shapes-of-a-runaway/); here it matters only for
its shape.

One of my agents received a bare "Hello". From that it invented a task involving two people
who don't exist, decided it needed announcing, went looking for a group to announce it in,
guessed at a chat id, and produced 148 events off that one message before I restarted it. It
came close to broadcasting a fabricated ruling to a channel nobody had authorised it to
touch.

Nothing attacked it. It confabulated.

But look at the shape: **a false instruction entered the agent's context, and every
downstream control agreed to carry it out.** Whether that instruction arrived from a
hallucination or from a hostile string in a fetched page is irrelevant to everything after
the first step. The outbound path didn't care. The tool layer didn't care. The only thing
that stopped it was me noticing.

An attacker who had wanted that outcome would have had to do less work than the model did
on its own.

## Bounding the radius

If you accept that the model will occasionally be convinced of something false, the
controls that matter sit between "the agent decided to act" and "the action happened".

**Volumetric limits** — spend caps, request-size limits, model- and tool-call rate limits,
identical-call limits. These bound injection aimed at your bill, and they bound *bulk*
exfiltration, because moving a lot of data takes a lot of calls. They're also the controls
that need no provider cooperation and no understanding of intent.

**An outbound allowlist.** The agent may send to destinations on a list — not destinations
it inferred, guessed, or was told about in a document. This is the control that breaks the
trifecta's third leg, and it would have stopped my incident dead.

**Per-agent tool restrictions.** The agent reading untrusted web content shouldn't be the
agent holding credentials. Most deployments give every agent the union of every capability
because it's easier, which means one injected instruction inherits everything.

**Human approval for anything irreversible.** Sending, publishing, deleting, paying.

## Where Belay is today, and where it's going

I write a guardrail plugin, so I should be exact about which of those layers it gives you
today — and about what's coming, because the plan is to cover the whole ladder.

**Belay 0.7.0 ships the volumetric layer.** Spend caps, request-size limits, model- and
tool-call rate limits, an identical-call limit, tool-error rate limits, a pause ladder (whose
final rung — pausing the account outright — is not available on OpenClaw 2026.8.2), and a
local flight recorder. Those bound the cost of a successful injection and they slow bulk
exfiltration, because moving a lot of data takes a lot of calls. If injection at your bill
is the thing you're worried about, that's covered now.

**The destination and content layer is next.** Every item in it came out of a real incident
rather than a threat-modelling workshop:

- an **outbound allowlist**, so an agent can only send to destinations on a list — the
  control described above, and the one I most want to be able to point at
- a **leak guard**, to stop planning text and internal reasoning being delivered as output
- **protected paths**, so files that matter can only be written through allowed tools
- an **empty-reply guard**, for the failure where an agent delivers nothing and looks frozen

That's the direction: from *how much* and *how fast*, to *to whom* and *what left the
building*. The allowlist needs one piece of verification first — confirming the hook carries
the destination id — and that work is in progress.

Until it lands, the volumetric caps pair well with whatever tool restrictions and egress
rules you already run; they're complementary controls rather than substitutes, and they
always were. The goal is that you need fewer of your own over time, not that you go and
assemble this yourself.

None of these controls detect an injection. That's the point — each one assumes the attack
already succeeded and asks what it's worth to the attacker.

## What this costs

I'd rather not present four controls as pure upside.

An allowlist is a list somebody maintains, and it will be wrong the first time a legitimate
destination is added without it — which is a design problem I'd rather solve before shipping
it than after. Per-agent tool restrictions mean running more agents with
more plumbing between them. Human approval on irreversible actions is in direct tension
with the word "autonomous" — if you approve everything, you've built a slow chatbot; if you
approve nothing, you've built the thing this post is about. Each of these buys a smaller
blast radius by spending convenience, and anyone who tells you otherwise hasn't run it.

Filtering is a mitigation. Blast radius is a control. Only one of them survives contact
with an attacker who has read your filter.
