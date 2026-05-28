.PHONY: dev dev-local dev-full stop reset logs shell migrate test e2e build push clean

# ── Local development (Supabase Cloud — leichtgewichtig) ─────────────────────
# Startet: Next.js (hot-reload) + Redis + Inbucket + Inngest
# Datenbank: Supabase Cloud (kein lokales Postgres nötig)

dev-local:
	docker compose -f docker-compose.local.yml up --build
	@echo ""
	@echo "Services running:"
	@echo "  App:     http://localhost:3000"
	@echo "  Mail:    http://localhost:9000"
	@echo "  Inngest: http://localhost:8288"
	@echo ""

# ── Full local stack (lokales Postgres + Studio) ──────────────────────────────

dev:
	docker compose up -d
	@echo ""
	@echo "Services running:"
	@echo "  App:     http://localhost:3000"
	@echo "  Studio:  http://localhost:3001"
	@echo "  Mail:    http://localhost:9000"
	@echo "  Inngest: http://localhost:8288"
	@echo ""

dev-full: dev

stop:
	docker compose -f docker-compose.local.yml down 2>/dev/null || true
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f app

shell:
	docker compose exec app sh

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	npx supabase db push

# ── Testing ───────────────────────────────────────────────────────────────────

test:
	npx vitest run

e2e:
	npx playwright test

# ── Image ─────────────────────────────────────────────────────────────────────

build:
	docker build -t xcare .

push:
	docker push ghcr.io/chesselmann-lang/xcare:latest

# ── Housekeeping ──────────────────────────────────────────────────────────────

clean:
	docker system prune -f
