import type { EntityManager } from '@mikro-orm/postgresql';
import type { FindOptions } from '@mikro-orm/core';

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Normalizes pagination parameters from request data
 * @param page - Optional page number from request
 * @param limit - Optional limit from request
 * @param defaultLimit - Default limit if not provided (default: 10)
 * @returns Normalized pagination parameters with page, limit, and offset
 */
export function normalizePaginationParams(
  page?: number | null,
  limit?: number | null,
  defaultLimit: number = 10,
): {
  page: number;
  limit: number;
  offset: number;
} {
  const normalizedPage = page && page > 0 ? page : 1;
  const normalizedLimit = limit && limit > 0 ? limit : defaultLimit;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: (normalizedPage - 1) * normalizedLimit,
  };
}

/**
 * Paginates and retrieves data with metadata
 * @param em - EntityManager instance
 * @param entity - Entity class or name
 * @param where - Where clause for filtering
 * @param options - Pagination and find options
 * @param options.page - Optional page number
 * @param options.limit - Optional limit
 * @param options.defaultLimit - Default limit if not provided (default: 10)
 * @param options.orderBy - Order by clause
 * @param options.populate - Populate relations
 * @param options.other - Other find options
 * @returns Paginated data with metadata
 */
export async function paginate<T extends object>(
  em: EntityManager,
  entity: any,
  where: any,
  options?: {
    page?: number | null;
    limit?: number | null;
    defaultLimit?: number;
    [key: string]: any; // Allow any additional properties (orderBy, populate, etc.)
  },
): Promise<PaginatedResponse<T>> {
  const { page, limit, defaultLimit = 10, ...findOptions } = options || {};

  const {
    page: normalizedPage,
    limit: normalizedLimit,
    offset,
  } = normalizePaginationParams(page, limit, defaultLimit);

  // Get total count and paginated results in parallel
  const [total, data] = await Promise.all([
    em.count(entity, where),
    em.find<T>(entity, where, {
      ...(findOptions as any),
      limit: normalizedLimit,
      offset,
    } as FindOptions<T>),
  ]);

  const totalPages = Math.ceil(total / normalizedLimit);

  return {
    data,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages,
      hasNext: normalizedPage < totalPages,
      hasPrevious: normalizedPage > 1,
    },
  };
}

/**
 * Creates pagination metadata object wrapped in a meta object
 * @param total - Total number of items
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Pagination metadata object wrapped in meta
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): {
  meta: PaginationMeta;
} {
  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

