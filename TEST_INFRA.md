# Testing Infrastructure: Delacour Tool 1.2 (Plan B & Continuité d'Activité)

## Overview & Architecture
The testing suite for Tool 1.2 employs an **opaque-box Node.js VM evaluation architecture** (`node:vm`) paired with a lightweight mock DOM in `scratch/common_harness.js`. This design allows comprehensive, instantaneous E2E evaluation of the browser-based single page application (`OUTILS_RENTABILITE_DELACOUR/app/tool_page.html`) with **zero external npm dependencies**.

### Key Principles
1. **Zero External Dependencies**: Operates strictly within native Node.js (`fs`, `path`, `vm`, `assert`). No heavy headless browsers (`puppeteer`, `playwright`) or uninstalled packages (`jsdom`) required.
2. **DOM & State Virtualization**: Emulates the window context (`mockWindow`), document tree (`mockDocument`), storage (`localStorage`), user events, and printing subsystem (`window.open`).
3. **Progressive Testability & Interface Oracles**: Incorporates authoritative mathematical and structural reference oracles directly into the harness. Tests validate against the live `tool_page.html` code dynamically or fall back to progressive interface oracles when running ahead of implementation tracks.
4. **Non-Regression & Universal History**: Validates state integrity, 7-column schema constraints, and `DelacourUndoManager` (document snapshots and field history).

---

## File Layout
```
scratch/
├── package.json                   # CommonJS environment declaration for scratch/
├── common_harness.js              # Shared VM loader, mock DOM, and reference oracles
├── test_decomposed_wizard.js      # Baseline Suite 1: 4-step wizard & 7-column insertion
├── test_problem_starter.js        # Baseline Suite 2: Anti-false solution regex & maturity gauge
├── test_undo_manager.js           # Baseline Suite 3: Document snapshots & field history undo/redo
└── test_planb_advanced.js         # Advanced Suite: 4-tier comprehensive validation (R1-R4)
```

---

## Suite Descriptions & Coverage

| Test File | Focus Areas | Total Tests |
|---|---|---|
| `scratch/test_decomposed_wizard.js` | 4-step wizard navigation, validation blocking, 7-column row assembly, A5 print document generation | 5 tests |
| `scratch/test_problem_starter.js` | Trap phrase detector regex (`checkAntiFalseSolution`), maturity gauge scoring (1 to 3), trigger preset injection | 3 tests |
| `scratch/test_undo_manager.js` | `recordDocState`, `undoDoc`, `redoDoc`, `recordFieldChange`, `undoField`, `redoField`, universal routing, max stack size (40) | 4 tests |
| `scratch/test_planb_advanced.js` | **Tier 1**: R1 multi-scenarios, R2 reflex sheet, R3 executive export, R4 7-column schema.<br>**Tier 2**: Boundaries (zero salaries, zero cost, free parade, enterprise scale, commas, NaNs).<br>**Tier 3**: Cross-feature interactions & rollback.<br>**Tier 4**: PME Benchmark verification. | 12 tests |
| **Total** | | **24 tests** |

---

## Execution Guide

Run all tests individually or as a combined run from the workspace root:

```bash
# Combined full suite run
node scratch/test_decomposed_wizard.js && \
node scratch/test_problem_starter.js && \
node scratch/test_undo_manager.js && \
node scratch/test_planb_advanced.js
```
