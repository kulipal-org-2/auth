import { Migration } from '@mikro-orm/migrations';

export class Migration20251125180439 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "auth"."user" add column "is_identity_verified" boolean not null default false, add column "identity_verification_type" varchar(255) null, add column "identity_verified_at" timestamptz null, add column "last_verification_id" varchar(255) null;`);
    this.addSql(`alter table "auth"."user" alter column "password" type varchar(255) using ("password"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "password" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."user" alter column "password" type varchar(255) using ("password"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "password" set not null;`);
  }

}
