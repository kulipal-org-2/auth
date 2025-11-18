import { Migration } from '@mikro-orm/migrations';

export class Migration20251113164235 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "auth"."otp" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "identifier" varchar(255) not null, "token" varchar(255) not null, "token_ttl" timestamptz not null, constraint "otp_pkey" primary key ("id"));`);
    this.addSql(`create index "otp_identifier_token_index" on "auth"."otp" ("identifier", "token");`);

    this.addSql(`alter table "auth"."user" add column "is_phone_verified" boolean null default false, add column "user_type" varchar(255) not null;`);
    this.addSql(`alter table "auth"."user" alter column "phone_number" type varchar(255) using ("phone_number"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "phone_number" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "auth"."user" alter column "phone_number" drop not null;`,
    );
    this.addSql(
      `alter table "auth"."user" alter column "phone_number" type varchar(255) using ("phone_number"::varchar(255));`,
    );
    this.addSql(
      `alter table "auth"."user" drop column "is_phone_verified", drop column "user_type";`,
    );
    this.addSql(`drop index if exists "auth"."otp_identifier_token_index";`);
    this.addSql(`drop table if exists "auth"."otp";`);
  }

}
