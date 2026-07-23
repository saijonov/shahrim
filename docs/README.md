# Shahrim documentation

- **[Shahrim-User-Guide.pdf](./Shahrim-User-Guide.pdf)** — onboarding for citizens, government operators/admins, and (planned) super-admins: how each role signs in and uses the product.
- **[Shahrim-Technical-Overview.pdf](./Shahrim-Technical-Overview.pdf)** — technology stack, architecture, data model, authentication flows, AI pipeline, and how everything is deployed/hosted (including how the Expo native app is built and distributed vs. the server-hosted backend/web apps).

## Regenerating the PDFs

The PDFs are generated from [`generate_docs.py`](./generate_docs.py) (single source of truth — edit the content there and re-run):

```bash
uv run --with fpdf2 --python 3.12 python docs/generate_docs.py
```
