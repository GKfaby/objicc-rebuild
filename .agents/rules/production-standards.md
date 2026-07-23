---
trigger: always_on
---

# Workspace Rule: High-End Web App Production Pipeline

## Context & Stack Standards
This workspace contains a high-end web application. Every UI change, API integration, or bug fix must meet enterprise standards.

## Mandatory Execution Workflow for Web Changes
1. **Visual & Structural Check:** - Before modifying frontend components, inspect existing layout structures, styling tokens (Tailwind/CSS variables), and state management patterns.
   - If UI changes are made, run verification routines or use the browser sub-agent/screenshots to confirm there are no layout regressions.
2. **Strict Error Testing Protocol:**
   - Always run the local test command (e.g., `npm test`, `npm run build`, or project lint scripts) after altering source code.
   - If a build error occurs, capture the traceback, analyze the failure context, and execute `/rewind` or `/undo` if successive modifications degrade stability.
3. **State and Data Safety:**
   - Preserve existing component props and API contracts. If an interface must change, provide backward compatibility layers or update consumers atomically in the same commit.