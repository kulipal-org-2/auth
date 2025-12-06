import { Migration } from '@mikro-orm/migrations';

export class Migration20251203151523 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "auth"."wallet" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "account_number" varchar(10) not null, "balance" numeric(15,2) not null default 0, "pin_hash" varchar(128) not null, "is_pin_set" boolean not null default false, "currency" varchar(3) not null default 'NGN', "is_active" boolean not null default true, "last_transaction_at" timestamptz null, constraint "wallet_pkey" primary key ("id"));`);

    // ensure unique constraints are created but avoid failure if they already exist
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_unique";`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_user_id_unique" unique ("user_id");`);

    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_account_number_unique";`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_account_number_unique" unique ("account_number");`);

    this.addSql(`create table if not exists "auth"."wallet_pin_reset_otp" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "otp_hash" varchar(128) not null, "expires_at" timestamptz not null, "is_used" boolean not null default false, "used_at" timestamptz null, constraint "wallet_pin_reset_otp_pkey" primary key ("id"));`);

    // add FK but avoid failure if it's already present
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_foreign";`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_foreign";`);
    this.addSql(`drop table if exists "auth"."wallet_pin_reset_otp";`);
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_account_number_unique";`);
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_unique";`);
    this.addSql(`drop table if exists "auth"."wallet";`);
  }

}
