import { Migration } from '@mikro-orm/migrations';

export class Migration20251120185939 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "auth"."business_profile" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "business_name" varchar(255) not null, "industry" varchar(255) not null, "description" text null, "place_id" varchar(255) null, "latitude" numeric(10,8) not null, "longitude" numeric(11,8) not null, "string_address" varchar(255) not null, "location" geography(Point, 4326) null, "cover_image_url" varchar(255) null, "service_modes" jsonb not null, "is_third_party_verified" boolean not null default false, "is_kyc_verified" boolean not null default false, constraint "business_profile_pkey" primary key ("id"));`);
    this.addSql(`create index "business_profile_location_index" on "auth"."business_profile" using gist ("location");`);

    this.addSql(`create table "auth"."operating_times" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "business_profile_id" varchar(255) not null, "day" varchar(255) not null, "start_time" varchar(255) not null, "end_time" varchar(255) not null, constraint "operating_times_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."business_verification" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "business_profile_id" varchar(255) not null, "verification_type" varchar(255) not null, "status" varchar(255) not null default 'pending', "selfie_image_url" varchar(255) null, "document_image_url" varchar(255) null, "smile_job_id" varchar(255) null, "smile_user_id" varchar(255) null, "smile_response" jsonb null, "smile_result_code" varchar(255) null, "smile_result_text" varchar(255) null, "reviewed_by" varchar(255) null, "reviewed_at" timestamptz null, "review_notes" text null, "rejection_reason" text null, constraint "business_verification_pkey" primary key ("id"));`);

    this.addSql(`alter table "auth"."business_profile" add constraint "business_profile_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade;`);

    this.addSql(`alter table "auth"."operating_times" add constraint "operating_times_business_profile_id_foreign" foreign key ("business_profile_id") references "auth"."business_profile" ("id") on update cascade;`);

    this.addSql(`alter table "auth"."business_verification" add constraint "business_verification_business_profile_id_foreign" foreign key ("business_profile_id") references "auth"."business_profile" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table "auth"."vendor_profile" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "business_name" varchar(255) null, "business_type" varchar(255) null, "address" varchar(255) null, "latitude" numeric(10,8) null, "longitude" numeric(11,8) null, "location" geography(Point, 4326) null, "cover_image_url" varchar(255) null, "description" text null, "service_types" jsonb null, "is_profile_complete" boolean null default false, "is_third_party_verified" boolean null default false, "is_kyc_verified" boolean null default false, "verification_step" int null default 0, constraint "vendor_profile_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."vendor_profile" add constraint "vendor_profile_user_id_unique" unique ("user_id");`);
    this.addSql(`create index "vendor_profile_location_index" on "auth"."vendor_profile" using gist ("location");`);

    this.addSql(`create table "auth"."business_hours" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "vendor_profile_id" varchar(255) not null, "day_of_week" varchar(255) not null, "is_open" boolean null default true, "open_time" varchar(255) not null, "close_time" varchar(255) not null, "open_time2" varchar(255) null, "close_time2" varchar(255) null, constraint "business_hours_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."vendor_verification" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "vendor_profile_id" varchar(255) not null, "verification_type" varchar(255) not null, "status" varchar(255) not null default 'pending', "document_type" varchar(255) null, "document_number" varchar(255) null, "selfie_image_url" varchar(255) null, "document_image_url" varchar(255) null, "smile_job_id" varchar(255) null, "smile_user_id" varchar(255) null, "smile_response" jsonb null, "smile_result_code" varchar(255) null, "smile_result_text" varchar(255) null, "reviewed_by" varchar(255) null, "reviewed_at" timestamptz null, "review_notes" text null, "rejection_reason" text null, constraint "vendor_verification_pkey" primary key ("id"));`);

    this.addSql(`alter table "auth"."business_hours" add constraint "business_hours_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade;`);

    this.addSql(`alter table "auth"."vendor_verification" add constraint "vendor_verification_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade;`);
  }

}
