# System architecture

```mermaid
flowchart LR
    UI[Frontend<br/>Next.js] -->|REST / JSON| API[Backend<br/>FastAPI]
    API --> DB[(PostgreSQL)]
    API --> ML[ML module<br/>PyTorch]
```

The frontend only talks to the backend. The backend stores data in PostgreSQL and calls the ML module for recognition.

## Recognition pipeline (proposal)

```mermaid
flowchart LR
    A[Page image] --> B[Find the lines]
    B --> C[Read each line]
    C --> D[Translate the text]
```

Details and model candidates for each step are in [AI model research](ai-model-research.md).
