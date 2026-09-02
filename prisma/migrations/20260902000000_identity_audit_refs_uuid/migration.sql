-- tenant_membership audit columns reference a UserId (U), align UUID type.
-- Values are (re)seeded as UUIDs after the UUIDv7 migration, plain casts are safe.
ALTER TABLE "tenant_membership"
    ALTER COLUMN "created_by" TYPE UUID USING "created_by"::uuid,
    ALTER COLUMN "updated_by" TYPE UUID USING "updated_by"::uuid,
    ALTER COLUMN "deleted_by" TYPE UUID USING "deleted_by"::uuid;