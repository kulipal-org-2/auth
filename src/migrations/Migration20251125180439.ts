import { Migration } from '@mikro-orm/migrations';

export class Migration20251125180439 extends Migration {

  override async up(): Promise<void> {
    // Add columns only if they don't already exist
    this.addSql(`alter table "auth"."user" add column if not exists "is_identity_verified" boolean not null default false;`);
    this.addSql(`alter table "auth"."user" add column if not exists "identity_verification_type" varchar(255) null;`);
    this.addSql(`alter table "auth"."user" add column if not exists "identity_verified_at" timestamptz null;`);
    this.addSql(`alter table "auth"."user" add column if not exists "last_verification_id" varchar(255) null;`);

    this.addSql(`alter table "auth"."user" alter column "password" type varchar(255) using ("password"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "password" drop not null;`);
  }

  override async down(): Promise<void> {
    // Remove the columns only if they exist (safer)
    this.addSql(`alter table "auth"."user" drop column if exists "is_identity_verified";`);
    this.addSql(`alter table "auth"."user" drop column if exists "identity_verification_type";`);
    this.addSql(`alter table "auth"."user" drop column if exists "identity_verified_at";`);
    this.addSql(`alter table "auth"."user" drop column if exists "last_verification_id";`);

    this.addSql(`alter table "auth"."user" alter column "password" type varchar(255) using ("password"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "password" set not null;`);
  }
}
