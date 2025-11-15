import { Migration } from '@mikro-orm/migrations';

export class Migration20251115095020 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "auth"."user" alter column "user_type" type varchar(255) using ("user_type"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "user_type" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."user" alter column "user_type" type varchar(255) using ("user_type"::varchar(255));`);
    this.addSql(`alter table "auth"."user" alter column "user_type" set not null;`);
  }

}
