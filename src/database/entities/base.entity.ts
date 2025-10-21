import { PrimaryKey, Property } from '@mikro-orm/postgresql';

export abstract class CustomBaseEntity {
  @PrimaryKey({ defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt?: Date;
}
