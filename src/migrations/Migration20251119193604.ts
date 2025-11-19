import { Migration } from '@mikro-orm/migrations';

export class Migration20251119193604 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "auth"."vendor_profile" add column "latitude" numeric(10,8) null, add column "longitude" numeric(11,8) null, add column "location" geography(Point, 4326) null;`);
    this.addSql(`create index "vendor_profile_location_index" on "auth"."vendor_profile" using gist ("location");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "auth"."vendor_profile_location_index";`);
  }

}
