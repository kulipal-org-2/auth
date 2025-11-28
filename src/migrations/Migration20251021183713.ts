import { Migration } from '@mikro-orm/migrations';

export class Migration20251021183713 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "auth"."refresh_token" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);
    this.addSql(`alter table "auth"."refresh_token" alter column "created_at" set default now();`);

    this.addSql(`alter table "auth"."user" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);
    this.addSql(`alter table "auth"."user" alter column "created_at" set default now();`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."refresh_token" alter column "created_at" drop default;`);
    this.addSql(`alter table "auth"."refresh_token" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);

    this.addSql(`alter table "auth"."user" alter column "created_at" drop default;`);
    this.addSql(`alter table "auth"."user" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);
  }

}
