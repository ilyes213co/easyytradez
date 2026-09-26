---
name: open-design
description: |
  Use when designing interfaces, web prototypes, dashboards, decks, design systems, and visual artifacts using OpenDesign (https://github.com/nexu-io/open-design). Implements local-first design systems, brand contracts (DESIGN.md), anti-AI-slop design standards, and coordinates with the OpenDesign desktop app and MCP server.
triggers:
  - "open design"
  - "opendesign"
  - "open-design"
  - "od"
  - "design system"
  - "design.md"
  - "claude design"
  - "prototype design"
---

# OpenDesign Skill

> Integrated from OpenDesign (https://github.com/nexu-io/open-design) — The open-source Claude Design alternative.

## Overview

OpenDesign transforms your coding agent into an AI design engine. Instead of generating generic, interchangeable AI layouts, OpenDesign enforces high visual craft, brand-specific design systems, and real-code artifacts (HTML, CSS, React, Next.js).

## Core Responsibilities

1. **Design System & Brand Contract (`DESIGN.md`)**:
   - Every project can establish a `DESIGN.md` specifying color tokens, typography, hierarchy, component guidelines, and interactive states.
   - When `DESIGN.md` is present in the repository, treat it as the strict visual contract.

2. **Anti-AI-Slop Standards**:
   - **No generic purple-to-blue gradients** on dark backgrounds unless explicitly requested.
   - **No over-rounded, floating glassmorphic cards** without functional hierarchy.
   - **No centered marketing fluff** on dense operational dashboards.
   - **Distinctive Typography**: Pair refined fonts (e.g. Satoshi, DM Sans, Plus Jakarta Sans, Instrument Serif, Outfit, Inter) with deliberate scale and line-height.
   - **Realistic Content**: Provide authentic, domain-appropriate data and labels rather than placeholder text.

3. **Artifact Creation**:
   - **Prototypes & Screens**: Functional, production-ready interfaces with responsive layout, real CSS/Tailwind, and accessible interactive states (hover, focus, active, loading).
   - **Micro-Interactions**: Smooth state transitions, subtle hover feedback, and clear visual cues.
   - **Visual Polish**: Intentional spacing, balanced contrast, and clean layout grids.

4. **OpenDesign App & MCP Connection**:
   - **Desktop App**: OpenDesign is available as a native Windows installer (`open-design-win-x64-setup.exe` from GitHub releases).
   - **Local Daemon**: When running, OpenDesign serves a local daemon on `http://127.0.0.1:7456`.
   - **CLI (`od`)**: The `od` command allows managing design assets, running skills, and wiring into agents.
