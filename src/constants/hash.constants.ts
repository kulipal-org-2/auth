import { argon2id } from 'argon2';

export const HASH_CONFIG = {
  memoryCost: 2 ** 15, // ~32MB
  timeCost: 2,
  parallelism: 1,
  type: argon2id,
};

export const TOKEN_HASH_CONFIG = {
  memoryCost: 2 ** 15, // ~32MB
  timeCost: 2,
  parallelism: 1,
  type: argon2id,
};
