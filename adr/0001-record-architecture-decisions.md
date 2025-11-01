# Architecture Decision Records (ADRs)

This `adr` directory contains Architecture Decision Records (ADRs) for the project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures a significant architectural or design decision made for this project. Each ADR describes a decision, its context, and its consequences.

The primary purpose of ADRs is to:

- **Document "Why":** Explain the rationale behind key technical choices, not just what was chosen.
- **Preserve History:** Provide a chronological log of how the system has evolved and the decisions that shaped it.
- **Prevent Rework:** Avoid rehashing old debates or making conflicting decisions later.
- **Aid Onboarding:** Help new team members quickly understand the project's architectural philosophy and historical context.
- **Facilitate Communication:** Ensure shared understanding among the team regarding significant decisions.

## When to Write an ADR?

An ADR should be created for any decision that:

- Has a **significant impact** on the project's architecture, design, or implementation.
- Introduces **new technologies** or major changes to existing ones.
- Resolves a **complex technical problem** with multiple viable solutions.
- Affects **multiple teams or components**.
- Requires a **non-trivial trade-off**.

If you're unsure whether a decision warrants an ADR, it's generally better to err on the side of documenting it.

## Structure of an ADR

Each ADR is a Markdown file (`.md`) named with a sequential number and a short, descriptive title (e.g., `0001-record-architecture-decisions.md`).

A typical ADR contains the following sections:

1.  **Title:** A concise summary of the decision.
2.  **Status:** The current state of the decision (e.g., `Accepted`, `Rejected`, `Proposed`, `Superseded by [ADR-XXXX]`).
3.  **Context:** The problem or situation that led to the decision.
4.  **Decision:** The specific choice that was made.
5.  **Consequences:** The positive and negative impacts of the decision.
6.  **Options Considered:** A brief overview of alternatives explored and why they were not chosen.
7.  **Further Details / Notes:** Any additional context, links, or relevant information.

## How to Create a New ADR

1.  **Identify the need:** Determine if your decision warrants an ADR (see "When to Write an ADR?" above).
2.  **Assign the next sequential number:** Look at the existing ADRs to find the next available number (e.g., if `0005-` is the last, your new one will be `0006-`).
3.  **Create a new Markdown file:**
    ```bash
    cp adr-template.md 00XX-my-new-decision.md
    ```
    (You might want to create a `adr-template.md` in this folder for consistency, or use a tool).
4.  **Fill out the template:** Clearly describe the context, decision, consequences, and options considered.
5.  **Discuss and Review:** Share your ADR with relevant team members for feedback and consensus.
6.  **Update Status:** Once the decision is agreed upon, change the `Status` to `Accepted`. If it's a proposal, keep it `Proposed` until finalized.
7.  **Commit:** Commit the new ADR to version control.

## Best Practices

- **Keep it focused:** Each ADR should address a single, significant decision.
- **Be concise:** Get straight to the point, but provide enough detail to be understood later.
- **Be objective:** Describe facts and rationale, not just opinions.
- **Update status:** If a decision changes or is superseded, create a _new_ ADR to reflect the change and mark the old one as `Superseded`.
- **Commit with code:** Ideally, an ADR is committed alongside the code or feature it describes.
