import { Migration } from '@mikro-orm/migrations';

export class Migration20251117214317 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "auth"."vendor_profile" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "user_id" varchar(255) not null, "business_name" varchar(255) null, "business_type" varchar(255) null, "address" varchar(255) null, "cover_image_url" varchar(255) null, "description" text null, "service_types" jsonb null, "is_profile_complete" boolean null default false, "is_verified" boolean null default false, "verification_step" int null default 0, constraint "vendor_profile_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."vendor_profile" add constraint "vendor_profile_user_id_unique" unique ("user_id");`);

    this.addSql(`create table "auth"."business_hours" ("id" varchar(255) not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "vendor_profile_id" varchar(255) not null, "day_of_week" varchar(255) not null, "is_open" boolean null default true, "open_time" varchar(255) not null, "close_time" varchar(255) not null, "open_time2" varchar(255) null, "close_time2" varchar(255) null, constraint "business_hours_pkey" primary key ("id"));`);

    this.addSql(`alter table "auth"."business_hours" add constraint "business_hours_vendor_profile_id_foreign" foreign key ("vendor_profile_id") references "auth"."vendor_profile" ("id") on update cascade;`);

    this.addSql(`alter table "auth"."user" alter column "phone_number" type varchar(255) using ("phone_number"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "phone_number" set not null;`);
    this.addSql(`alter table "auth"."user" alter column "user_type" drop default;`);
    this.addSql(`alter table "auth"."user" alter column "user_type" type varchar(255) using ("user_type"::varchar(255));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."user" alter column "phone_number" type varchar(255) using ("phone_number"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "phone_number" drop not null;`);
    this.addSql(`alter table "auth"."user" alter column "user_type" type varchar(255) using ("user_type"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "user_type" set default 'customer';`);
  }

}
