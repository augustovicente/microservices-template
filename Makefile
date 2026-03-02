.PHONY: docker-start
docker-start:
	docker-compose up --build -d --remove-orphans

.PHONY: docker-delete
docker-delete:
	docker-compose down -v

.PHONY: test
test:
	@for dir in services/* ; do \
		[ -d "$$dir" ] || continue; \
		[ -f "$$dir/package.json" ] || continue; \
		echo "\n==> Testing $$dir"; \
		(cd "$$dir" && npx jest --passWithNoTests --detectOpenHandles); \
	done

.PHONY: lint
lint:
	@for dir in services/* ; do \
		[ -d "$$dir" ] || continue; \
		[ -f "$$dir/package.json" ] || continue; \
		echo "\n==> Linting $$dir"; \
		(cd "$$dir" && npx eslint 'src/**/*.ts'); \
	done

.PHONY: typecheck
typecheck:
	@echo "==> Type-checking shared package..."
	@cd packages/shared && npx tsc --noEmit
	@for dir in services/* ; do \
		[ -d "$$dir" ] || continue; \
		[ -f "$$dir/package.json" ] || continue; \
		echo "\n==> Type-checking $$dir"; \
		(cd "$$dir" && npx tsc --noEmit); \
	done

.PHONY: check
check: typecheck lint test
	@echo "\n✅  All checks passed"

.PHONY: install
install:
	@echo "==> Building shared package..."
	@cd packages/shared && npm install && npm run build
	@for dir in services/* ; do \
		[ -d "$$dir" ] || continue; \
		[ -f "$$dir/package.json" ] || continue; \
		echo "==> Installing deps in $$dir"; \
		(cd "$$dir" && npm install); \
	done

.PHONY: add-service
add-service:
	@read -p "Service name: " service; \
	read -p "Host port (e.g. 3002): " port; \
	if [ -d "services/$$service" ]; then \
		echo "Error: services/$$service already exists"; \
		exit 1; \
	fi; \
	cp -r _template "services/$$service"; \
	find "services/$$service" -type f -exec sed -i '' "s/{{SERVICE_NAME}}/$$service/g" {} +; \
	find "services/$$service" -type f -exec sed -i '' "s/{{SERVICE_PORT}}/$$port/g" {} +; \
	echo "  - path: ./$$service/docker-compose.yml" >> services/docker-compose.yml; \
	echo ""; \
	echo "✅  Service '$$service' created at services/$$service"; \
	echo ""; \
	echo "Next steps:"; \
	echo "  1. Edit services/$$service/service.config.yaml"; \
	echo "  2. Run 'make install' to install dependencies"; \
	echo "  3. Run 'make docker-start' to start all services";
