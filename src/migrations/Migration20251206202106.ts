import { Migration } from '@mikro-orm/migrations';

export class Migration20251206202106 extends Migration {

  override async up(): Promise<void> {
    // Drop foreign key constraints first
    // Drop business_hours foreign key to vendor_profile (if it exists)
    this.addSql(`alter table "auth"."business_hours" drop constraint if exists "business_hours_vendor_profile_id_foreign";`);
    
    // Drop vendor_verification foreign key to vendor_profile
    this.addSql(`alter table "auth"."vendor_verification" drop constraint if exists "vendor_verification_vendor_profile_id_foreign";`);
    
    // Drop wallet foreign key to user
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_foreign";`);
    
    // Drop unique constraints
    this.addSql(`alter table "auth"."vendor_profile" drop constraint if exists "vendor_profile_user_id_unique";`);
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_user_id_unique";`);
    this.addSql(`alter table "auth"."wallet" drop constraint if exists "wallet_account_number_unique";`);
    
    // Drop tables in order (drop dependent tables first)
    this.addSql(`drop table if exists "auth"."vendor_verification";`);
    this.addSql(`drop table if exists "auth"."vendor_profile";`);
    this.addSql(`drop table if exists "auth"."wallet_pin_reset_otp";`);
    this.addSql(`drop table if exists "auth"."wallet";`);
  }

  override async down(): Promise<void> {
    // Recreate wallet table
    this.addSql(`create table "auth"."wallet" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "account_number" varchar(10) not null, "balance" numeric(15,2) not null default 0, "pin_hash" varchar(128) not null, "is_pin_set" boolean not null default false, "currency" varchar(3) not null default 'NGN', "is_active" boolean not null default true, "last_transaction_at" timestamptz null, constraint "wallet_pkey" primary key ("id"));`);
    this.addSql(`create index "wallet_user_id_index" on "auth"."wallet" ("user_id");`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_account_number_unique" unique ("account_number");`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_user_id_unique" unique ("user_id");`);
    this.addSql(`alter table "auth"."wallet" add constraint "wallet_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete no action;`);

    // Recreate wallet_pin_reset_otp table
    this.addSql(`create table "auth"."wallet_pin_reset_otp" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "otp_hash" varchar(128) not null, "expires_at" timestamptz not null, "is_used" boolean not null default false, "used_at" timestamptz null, constraint "wallet_pin_reset_otp_pkey" primary key ("id"));`);

    // Recreate vendor_profile table
    this.addSql(`create table "auth"."vendor_profile" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "business_name" varchar(255) null, "business_type" varchar(255) null, "address" varchar(255) null, "cover_image_url" varchar(255) null, "description" text null, "service_types" jsonb null, "is_profile_complete" boolean null default false, "is_third_party_verified" boolean null default false, "verification_step" int4 null default 0, "is_kyc_verified" boolean null default false, "latitude" numeric(10,8) null, "longitude" numeric(11,8) null, "location" geography null, constraint "vendor_profile_pkey" primary key ("id"));`);
    this.addSql(`create index "vendor_profile_location_index" on "auth"."vendor_profile" ("location");`);
    this.addSql(`alter table "auth"."vendor_profile" add constraint "vendor_profile_user_id_unique" unique ("user_id");`);

    // Recreate vendor_verification table
    this.addSql(`create table "auth"."vendor_verification" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "vendor_profile_id" varchar(255) not null, "verification_type" varchar(255) not null, "status" varchar(255) not null default 'pending', "document_type" varchar(255) null, "document_number" varchar(255) null, "selfie_image_url" varchar(255) null, "document_image_url" varchar(255) null, "smile_job_id" varchar(255) null, "smile_user_id" varchar(255) null, "smile_response" jsonb null, "smile_result_code" varchar(255) null, "smile_result_text" varchar(255) null, "reviewed_by" varchar(255) null, "reviewed_at" timestamptz null, "review_notes" text null, "rejection_reason" text null, constraint "vendor_verification_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."vendor_verification" add constraint "vendor_verification_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade on delete no action;`);

    // Recreate business_hours foreign key to vendor_profile
    this.addSql(`alter table "auth"."business_hours" add constraint "business_hours_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade on delete no action;`);
  }

}

