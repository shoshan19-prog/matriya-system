# MATRIYA — Capability Registry

> **Generated file — do not edit by hand.** Source of truth: `capabilities.json`. Regenerate with `npm run render`.
> Platform: **MATRIYA** · As of: **2026-06-29** · Control plane: **matriya-system**

Single Source of Truth for the maturity, wiring and health of every platform capability. This file is data, not prose — the Control Tower (and any dashboard, CI gate or status report) reads it. Humans read the generated CAPABILITIES.md.

## Capabilities

| Capability | Status | Backend | Frontend | API | DB | Repos |
|---|---|:--:|:--:|:--:|:--:|---|
| **Authentication** <br/><sub>זיהוי והרשאות</sub> | ✅ READY | ✅ | ✅ | ✅ | ✅ | matriya-back, maneger-back, matriya-front, maneger-front |
| **Project Management** <br/><sub>ניהול פרויקטים</sub> | ✅ READY | ✅ | ✅ | ✅ | ✅ | maneger-back, maneger-front |
| **Laboratory** <br/><sub>מעבדה</sub> | ✅ READY | ✅ | ✅ | ✅ | ✅ | maneger-back, maneger-front |
| **Document Intake** <br/><sub>קליטת מסמכים</sub> | ✅ READY | ✅ | ✅ | ✅ | ✅ | matriya-back, maneger-back, matriya-front, maneger-front |
| **RAG** <br/><sub>אחזור מבוסס מסמכים</sub> | ✅ READY | ✅ | ✅ | ✅ | ✅ | matriya-back, maneger-back, matriya-front, maneger-front |
| **Knowledge Engine** <br/><sub>מנוע ידע</sub> | 🟡 PARTIAL | ✅ | 🟡 | ✅ | ✅ | matriya-back, matriya-front |
| **Knowledge Events** <br/><sub>אירועי ידע</sub> | 🟢 POC | ✅ | 🟡 | ✅ | 🟡 | matriya-system |
| **Change Detector** <br/><sub>גלאי שינוי</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Evidence Qualification** <br/><sub>מיון ראיות</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Human Review** <br/><sub>אישור אנושי</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Episodic Linking** <br/><sub>קישור אפיזודי (היפוקמפוס)</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Learning Model** <br/><sub>מודל למידה</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Evolution Engine** <br/><sub>מנוע התפתחות</sub> | ⚪ UNKNOWN | — | — | — | — | — |
| **Decision Engine** <br/><sub>מנוע החלטות</sub> | 🔵 DESIGN | — | — | — | — | — |
| **Report Engine** <br/><sub>מנוע דוחות</sub> | 🟡 PARTIAL | 🟡 | 🟡 | 🟡 | n/a | matriya-back, maneger-back |

## Capability detail

### ✅ Authentication — זיהוי והרשאות
JWT login/signup, single identity across both products.
- **Depends on:** jwt

### ✅ Project Management — ניהול פרויקטים
Projects, tasks (FSM), milestones, notes, members, chat, audit log, RBAC.
- **Depends on:** authentication, supabase

### ✅ Laboratory — מעבדה
Experiments, runs, materials library, formulation parsing/comparison, lab AI insights.
- **Depends on:** authentication, supabase, openai
- **Open items:**
  - Suggestion Engine is a UI placeholder with no backend logic.

### ✅ Document Intake — קליטת מסמכים
Upload + parse (PDF/DOCX/XLSX/CSV), chunking, storage (Supabase buckets), SharePoint pull.
- **Depends on:** supabase, msgraph
- **Open items:**
  - Frontends rely on default/fallback API URLs — env vars not pinned in Vercel.

### ✅ RAG — אחזור מבוסס מסמכים
Vector retrieval + grounded answers. matriya: local pgvector. maneger: management_vector + OpenAI file_search.
- **Depends on:** document-intake, openai, supabase

### 🟡 Knowledge Engine — מנוע ידע
Kernel v1.6 breakdown detection, integrity monitor + rules engine, decision/research audit logs, evidence attribution.
- **Depends on:** rag
- **Open items:**
  - No first-class 'Knowledge Event' entity yet — knowledge state is implied by audit/decision logs.
  - Admin/observability endpoints exist but UI coverage is partial.

### 🟢 Knowledge Events — אירועי ידע
Append-only ledger of knowledge movements — the foundational substrate the whole learning pipeline stands on. Knowledge Growth is computed from it (the bank-statement model). Schema + ledger + live feed work in the control plane.
- **Open items:**
  - Emit points WIRED in code: document.ingested/removed (matriya-back + maneger-back), question.opened + intent.declared (maneger-back). Activate by setting KNOWLEDGE_LEDGER_URL in both backends.
  - evidence.attached emit point still to wire (matriya-back decision-audit flow).
  - Ledger shows seeded sample data until the backends are activated.
  - JSONL store is a POC — promote to a DB table for production.

### 🔵 Change Detector — גלאי שינוי
Senses + first nervous system: notice that something in reality differs from before, and filter signal from noise before it reaches the ledger. Today backends emit directly; this layer would qualify 'is this even a change?'.
- **Depends on:** knowledge-events
- **Open items:**
  - Design only — emit points currently bypass any change-detection.

### 🔵 Evidence Qualification — מיון ראיות
Immune system: is a change real, an error, or impossible? Qualify evidence before it is allowed to become accepted knowledge.
- **Depends on:** change-detector
- **Open items:**
  - Design only — no qualification gate exists between an event and the ledger.

### 🔵 Human Review — אישור אנושי
Cortex acceptance: a human accepts or rejects qualified evidence before it enters long-term memory and is allowed to change the model.
- **Depends on:** evidence-qualification
- **Open items:**
  - Design only — the 'accepted' funnel stage has no source yet.

### 🔵 Episodic Linking — קישור אפיזודי (היפוקמפוס)
The hippocampus: connect events across time into chains/stories so patterns can emerge (material swap → cracks → supplier change → resolved). Asserts a link only after the whole chain exists — not before.
- **Depends on:** knowledge-events
- **Open items:**
  - Design only — the ledger records movements but does not yet link them into episodes.
  - This is the organ that turns history into patterns.

### 🔵 Learning Model — מודל למידה
Produces learning, not knowledge — the model that changes as accepted evidence and linked episodes accumulate. 'Knowledge is a picture; learning is a movie.' This is the real subject of the Control Room's 'how does the lab learn?' question.
- **Depends on:** human-review, episodic-linking
- **Open items:**
  - Design only — replaces 'how much knowledge?' with 'what changed the model, and why?'.

### ⚪ Evolution Engine — מנוע התפתחות
Asserted to exist as a prototype, but the codebase scan did not locate an implementation.
- **Depends on:** knowledge-engine
- **Open items:**
  - ACTION: link the prototype source, or downgrade to 'design'. This is exactly the kind of ambiguity the registry exists to surface.

### 🔵 Decision Engine — מנוע החלטות
Turn learning into recommended engineering decisions (and, ultimately, laws). Design stage only — the last stage of the pipeline, not the first.
- **Depends on:** learning-model
- **Open items:**
  - No implementation located — design only.

### 🟡 Report Engine — מנוע דוחות
matriya-back value-summary endpoints + maneger TXT project export. Not unified into one reporting capability.
- **Depends on:** knowledge-engine, project-management
- **Open items:**
  - Two ad-hoc exporters; no shared report model or unified output.

## Connections

| Connection | Status | Used by | Notes |
|---|---|---|---|
| **JWT auth** | ✅ ready | matriya-back, matriya-front, maneger-back, maneger-front | maneger-back proxies auth to matriya-back; same token bridges the two products. |
| **Supabase (Postgres)** | ✅ ready | matriya-back, maneger-back | Two separate instances by design — no shared DB; products integrate via API only. |
| **OpenAI** | ✅ ready | matriya-back, maneger-back | file_search + embeddings (maneger: text-embedding-ada-002). matriya-back also supports Together AI / HuggingFace. |
| **Microsoft Graph (SharePoint)** | 🟡 partial | maneger-back | Code wired; needs Azure app registration (SHAREPOINT_*). Returns 400 if unconfigured. |
| **Email (Resend)** | 🟡 partial | maneger-back | Inbound+outbound mail. NOTE: the product brief calls this 'Gmail' — actual implementation is Resend. Reconcile naming. |
| **Knowledge Ledger emit** | 🟡 partial | matriya-back, maneger-back | Backends emit knowledge movements into the control-plane ledger (fire-and-forget, no-op unless configured). Code wired; not yet activated in deployments. |

## Repositories

| Repo | Maturity | Role | Primary capabilities |
|---|---|---|---|
| **matriya-back** | production | Research / RAG / Knowledge backend (mature, production) | authentication, document-intake, rag, knowledge-engine, report-engine |
| **matriya-front** | functional | Research UI (Ask Matriya, upload, research, admin) | authentication, document-intake, rag, report-engine |
| **maneger-back** | production | Lab & Project management backend (mature) | authentication, project-management, laboratory, document-intake, rag, report-engine |
| **maneger-front** | functional | Lab & Project management UI (Hebrew RTL) | project-management, laboratory, document-intake, rag |
| **matriya-system** | control-plane | Platform Control Plane — home of this registry and the future Control Tower. (Was an abandoned RAG skeleton; the empty src/ tree is dormant and slated for removal once the Control Tower lands.) | — |

## System health

| Check | Status | Notes |
|---|---|---|
| **DB restore verified** | ⚠️ warning | maneger-back RESTORE-TEST-DONE.md is empty — restore drill not yet performed. |
| **CI / automated tests on push** | ❌ missing | No GitHub Actions in any repo, despite rich test suites in both backends. |
| **Production env vars pinned** | ⚠️ warning | Frontends fall back to hardcoded URLs; cross-product URLs (Management Lab) unset. |

## Roll-up

✅ READY: **5** · 🟡 PARTIAL: **2** · 🟢 POC: **1** · 🔵 DESIGN: **6** · ⚪ UNKNOWN: **1**

---
_Rendered from capabilities.json. 15 capabilities, 6 connections, 5 repositories._
