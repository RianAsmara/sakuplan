.PHONY: bootstrap infra-up infra-up-platform infra-down migrate-up migrate-down run fmt test test-race test-integration coverage vet lint build verify
bootstrap:; task bootstrap
infra-up:; task infra:up
infra-up-platform:; task infra:up:platform
infra-down:; task infra:down
migrate-up:; task migrate:up
migrate-down:; task migrate:down
run:; task run
fmt:; task fmt
test:; task test
test-race:; task test:race
test-integration:; task test:integration
coverage:; task coverage
vet:; task vet
lint:; task lint
build:; task build
verify:; task verify
