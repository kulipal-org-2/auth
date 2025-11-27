import { Migration } from '@mikro-orm/migrations';

export class Migration20251118213506 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "auth"."vendor_verification" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "vendor_profile_id" varchar(255) not null, "verification_type" varchar(255) not null, "status" varchar(255) not null default 'pending', "document_type" varchar(255) null, "document_number" varchar(255) null, "selfie_image_url" varchar(255) null, "document_image_url" varchar(255) null, "smile_job_id" varchar(255) null, "smile_user_id" varchar(255) null, "smile_response" jsonb null, "smile_result_code" varchar(255) null, "smile_result_text" varchar(255) null, "reviewed_by" varchar(255) null, "reviewed_at" timestamptz null, "review_notes" text null, "rejection_reason" text null, constraint "vendor_verification_pkey" primary key ("id"));`);

    this.addSql(`alter table "auth"."vendor_verification" add constraint "vendor_verification_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade;`);

    this.addSql(`alter table "auth"."vendor_profile" add column "is_kyc_verified" boolean null default false;`);
    this.addSql(`alter table "auth"."vendor_profile" rename column "is_verified" to "is_third_party_verified";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."vendor_profile" rename column "is_third_party_verified" to "is_verified";`);
  }

}
