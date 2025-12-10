import { Metadata } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
  // add role or other claims here if needed
}

/**
 * Discriminated union: when success is true, payload and userId are guaranteed.
 */
export type AuthValidationResult =
  | { success: true; message: string; payload: JwtPayload; userId: string }
  | { success: false; message: string };

@Injectable()
export class JwtAuthGuard {
  constructor(private readonly jwtService: JwtService) {}

  validateToken(metadata: Metadata): AuthValidationResult {
    try {
      const token = this.extractToken(metadata);
      if (!token) {
        return { success: false, message: 'Authorization token is required' };
      }

      const payload = this.jwtService.verify<JwtPayload>(token);

      if (!payload || !payload.userId) {
        return { success: false, message: 'Invalid token payload' };
      }

      // return userId explicitly so callers can use it with TS narrowing
      return {
        success: true,
        message: 'Token validated successfully',
        payload,
        userId: payload.userId,
      };
    } catch (error: any) {
      return this.handleTokenError(error);
    }
  }

  validateTokenAndUserId(
    metadata: Metadata,
    requestedUserId: string,
  ): AuthValidationResult {
    const result = this.validateToken(metadata);
    if (!result.success) return result;

    // now TS knows result.userId exists
    if (result.userId !== requestedUserId) {
      return {
        success: false,
        message: 'Unauthorized: Token userId does not match requested userId',
      };
    }
    return result;
  }

  private extractToken(metadata: Metadata): string | null {
    const authHeader =
      (metadata?.get?.('authorization')?.[0] as string) ??
      (metadata?.get?.('Authorization')?.[0] as string) ??
      null;

    if (!authHeader) return null;
    const bearer = typeof authHeader === 'string' ? authHeader : '';
    return bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;
  }

  private handleTokenError(error: any): AuthValidationResult {
    switch (error?.name) {
      case 'TokenExpiredError':
        return {
          success: false,
          message: 'Token has expired. Please login again',
        };
      case 'JsonWebTokenError':
        return { success: false, message: 'Invalid token signature' };
      case 'NotBeforeError':
        return { success: false, message: 'Token not yet valid' };
      default:
        return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Decode JWT token without verification (no signature check, no expiration check)
   * Used for extracting userId from potentially expired tokens during refresh
   */
  decodeTokenWithoutValidation(token: string): JwtPayload | null {
    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      const decoded = this.jwtService.decode<JwtPayload>(cleanToken);

      console.log('decoded', decoded);
      return decoded;
    } catch (error: any) {
      return null;
    }
  }
}
