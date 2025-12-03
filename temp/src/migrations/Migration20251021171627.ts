import { Migration } from '@mikro-orm/migrations';

export class Migration20251021171627 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create schema if not exists "auth";`);
    this.addSql(`create table "auth"."refresh_token" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" varchar(255) not null, "token_hash" varchar(255) not null, "expires_at" varchar(255) not null, "revoked_at" varchar(255) null, constraint "refresh_token_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."user" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "email" varchar(255) not null, "avatar_url" varchar(255) null, "password" varchar(255) not null, "phone_number" varchar(255) null, "source" varchar(255) null, "agree_to_terms" boolean not null, "is_email_verified" boolean null default false, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."user" add constraint "user_email_unique" unique ("email");`);
  }

}
