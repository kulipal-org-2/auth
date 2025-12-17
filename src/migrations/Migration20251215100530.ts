import { Migration } from '@mikro-orm/migrations';

export class Migration20251215100530 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "auth"."user" add column if not exists "deleted_at" timestamptz null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "auth"."user" drop column if exists "deleted_at";`,
    );
  }
}
