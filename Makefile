.PHONY: docker-start
docker-start:
	docker-compose up --build -d --remove-orphans

.PHONY: docker-delete
docker-delete:
	docker-compose down -v

.PHONY: test
test:
	@for dir in services/* ; do \
		[ -d $$dir ] || continue; \
		echo "Running tests in $$dir"; \
		make -C $$dir test; \
	done

.PHONY: install
install:
	@for dir in services/* ; do \
		[ -d $$dir ] || continue; \
		echo "Installing deps in $$dir"; \
		cd $$dir && make install && cd ..; \
	done

.PHONY: add-service
add-service:
	@echo "Enter service name: "; \
	read service; \
	mkdir -p services/$$service; \
	echo "  - path: ./$$service/docker-compose.yml" >> services/docker-compose.yml; \
	echo "Service $$service created"; \
