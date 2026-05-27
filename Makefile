.PHONY: dev stop reset logs migrate test e2e build push clean

# ── Local development ─────────────────────────────────────────────────────────

dev:
	docker compose up -d
	@echo ""
	@echo "Services running:"
	@echo "  App:     http://localhost:3000"
	@echo "  Studio:  http://localhost:3001"
	@echo "  Mail:    http://localhost:9000"
	@echo "  Inngest: http://localhost:8288"
	@echo ""

stop:
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f app

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
