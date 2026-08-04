-- +goose Up
ALTER TABLE users
    ADD COLUMN accepted_terms_version text NOT NULL DEFAULT '',
    ADD COLUMN accepted_privacy_version text NOT NULL DEFAULT '';
ALTER TABLE users ALTER COLUMN accepted_terms_version DROP DEFAULT;
ALTER TABLE users ALTER COLUMN accepted_privacy_version DROP DEFAULT;

-- +goose Down
ALTER TABLE users
    DROP COLUMN accepted_terms_version,
    DROP COLUMN accepted_privacy_version;
