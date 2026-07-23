# Shahrim — developer convenience targets
.PHONY: up down restart logs ps migrate revision test-backend lint-backend fmt-backend shell-backend install typecheck clean

# ---- Docker / full stack ----
up:            ## Build & start db + backend + adminer
	docker compose up -d --build

down:          ## Stop and remove containers
	docker compose down

restart:
	docker compose restart backend

logs:          ## Tail backend logs
	docker compose logs -f backend

ps:
	docker compose ps

# ---- Backend (run inside the backend container) ----
migrate:       ## Apply DB migrations
	docker compose exec backend alembic upgrade head

revision:      ## Create a new migration: make revision m="message"
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

test-backend:  ## Run backend test suite
	docker compose exec backend pytest -q

lint-backend:  ## Lint backend
	docker compose exec backend ruff check .

fmt-backend:   ## Format backend
	docker compose exec backend ruff format .

shell-backend:
	docker compose exec backend bash

# ---- JS monorepo ----
install:
	pnpm install

typecheck:
	pnpm -r run typecheck

clean:
	docker compose down -v
