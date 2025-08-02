\# Gatra Sinau.AI — Developer Guide



AI-powered educational platform aligned with the \*Kurikulum Merdeka\* that helps teachers generate lesson plans, evaluate exams, and track student progress — automatically, intelligently, and efficiently.



---



\## 📦 Core Technologies



| Layer        | Stack                  |

|--------------|------------------------|

| Frontend     | React.js (`.jsx` only) |

| Backend      | Python Flask (venv)    |

| AI Engine    | External API + RAG     |

| Database     | Relational (PostgreSQL preferred) |

| OCR          | Tesseract / EasyOCR    |

| Vector DB    | FAISS / Qdrant         |



---



\## 🚀 How to Start (For Human or AI Agents)



\### 1. Clone the Repo



```bash

git clone <your-repo-url>

cd gatra-sinau-ai

```



\### 2. Read the Product Requirements



Main PRD: \[`prd-gatra-sinau.txt`](./prd-gatra-sinau.txt)



\### 3. Use the Right Workflow (for AI agents)



| File | Description |

|------|-------------|

| `greenfield-edu-rag.yaml` | Build app from scratch |

| `debug-from-repo.yaml` | Continue development from GitHub repo |

| `debug-ui-from-log.yaml` | Fix frontend bugs (React JSX only) |

| `evaluate-handwritten-tests.yaml` | Handle grading of handwritten exams via OCR + AI |



All workflows will auto-trigger on PRD presence or GitHub repo context.



---



\## 📁 Project Structure (Suggestion)



```

gatra-sinau-ai/

├── frontend/                 # React (.jsx)

├── backend/                  # Flask API (venv-based)

├── prd-gatra-sinau.txt       # The master PRD file (must-read)

├── workflows/

│   ├── greenfield-edu-rag.yaml

│   ├── debug-from-repo.yaml

│   ├── debug-ui-from-log.yaml

│   └── evaluate-handwritten-tests.yaml

├── team-gatrasinau.txt       # Team behavior file for AI agents

└── README-dev.md             # This guide

```



---



\## 💡 Conventions



\- \*\*Do not use TypeScript.\*\* All frontend code must be `.jsx`.

\- \*\*All Flask backend code must be inside a virtual environment.\*\*

\- \*\*AI Agents\*\* must auto-detect context (from repo or PRD) and continue development without prompting.

\- \*\*Error logs\*\* or \*\*screenshots\*\* can be dropped into the repo — AI will debug automatically.



---



\## 🔐 Access Roles



| Role            | Description |

|------------------|-------------|

| Developer        | Full access |

| Admin Sekolah    | Access limited to their school's data |

| Guru             | Can only see and manage their own class content |



---



\## 🧠 Core Features Overview



1\. Upload Kemendikbud PDF → OCR → Indexed for AI

2\. Generate Silabus, RPP, Soal, Rubrik, Feedback

3\. Auto-evaluate scanned student tests

4\. Manage students, classes, attendance

5\. Export results to `.docx` or `.pdf`



See PRD file for complete logic and database schema.



---



\## 🛠 Dev Notes



\- If you're an AI Agent, \*\*read `team-gatrasinau.txt` first\*\*.

\- If no errors or prompts are provided, assume you're expected to continue development based on `prd-gatra-sinau.txt`.

\- If user provides only a GitHub repo, analyze → compare vs PRD → fix or build missing parts.



---



\## ✉️ Feedback or Issues?



Please contact the human project owner (Bang Jaka) or leave an issue in this repo.



