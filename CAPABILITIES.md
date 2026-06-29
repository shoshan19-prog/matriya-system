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
| **Knowledge Events** <br/><sub>אירועי ידע</sub> | 🔵 DESIGN | — | — | — | — | — |
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

### 🔵 Knowledge Events — אירועי ידע
First-class record of every knowledge change (new evidence, contradiction, intent, open question). Today these are scattered across audit logs.
- **Depends on:** knowledge-engine
- **Open items:**
  - Define the event schema and emit points; this is the substrate the Control Tower's 'Knowledge Growth' panel needs.

### ⚪ Evolution Engine — מנוע התפתחות
Asserted to exist as a prototype, but the codebase scan did not locate an implementation.
- **Depends on:** knowledge-engine
- **Open items:**
  - ACTION: link the prototype source, or downgrade to 'design'. This is exactly the kind of ambiguity the registry exists to surface.

### 🔵 Decision Engine — מנוע החלטות
Turn knowledge + evidence into recommended engineering decisions. Design stage only.
- **Depends on:** knowledge-engine, knowledge-events
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

✅ READY: **5** · 🟡 PARTIAL: **2** · 🔵 DESIGN: **2** · ⚪ UNKNOWN: **1**

---
_Rendered from capabilities.json. 10 capabilities, 5 connections, 5 repositories._
