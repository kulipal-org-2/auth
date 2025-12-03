import { Migration } from '@mikro-orm/migrations';

export class Migration20251103111542 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "auth"."reset_password_token" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "token_hash" varchar(255) not null, "expires_at" timestamptz not null, constraint "reset_password_token_pkey" primary key ("id"));`);
  }

}
