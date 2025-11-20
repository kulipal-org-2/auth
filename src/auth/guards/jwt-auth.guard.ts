import { Metadata } from "@grpc/grpc-js";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

export interface AuthValidationResult {
    success: boolean;
    message: string;
    payload?: JwtPayload;
    userId?: string;
}

@Injectable()
export class JwtAuthGuard {
    constructor(private readonly jwtService: JwtService) { }

    validateToken(metadata: Metadata): AuthValidationResult {
        try {
            const token = this.extractToken(metadata);

            if (!token) {
                return {
                    success: false,
                    message: 'Authorization token is required',
                }
            }

            const payload = this.jwtService.verify<JwtPayload>(token);

            if (!payload || !payload.userId) {
                return {
                    success: false,
                    message: 'Invalid token payload'
                }
            }

            return {
                success: true,
                message: 'Token validated successfully',
                payload,
            }
        } catch (error: any) {
            return this.handleTokenError(error);
        }
    }

    validateTokenAndUserId(metadata: Metadata, requestedUserId: string): AuthValidationResult {
        const result = this.validateToken(metadata);

        if (!result.success) {
            return result;
        }

        if (result.payload!.userId !== requestedUserId) {
            return {
                success: false,
                message: 'Unathorized: Token userId does not match requested userId',
            }
        }

        return result;
    }


    private extractToken(metadata: Metadata): string | null {
        const authHeader =
            (metadata?.get?.('authorization')?.[0] as string) ??
            (metadata?.get?.('Authorization')?.[0] as string);

        if (!authHeader) {
            return null;
        }

        const bearer = typeof authHeader === 'string' ? authHeader : '';

        if (bearer.startsWith('Bearer ')) {
            return bearer.slice(7);
        }

        return bearer;
    }

    /**
     * Handles JWT verification errors
     */
    private handleTokenError(error: any): AuthValidationResult {
        switch (error.name) {
            case 'TokenExpiredError':
                return {
                    success: false,
                    message: 'Token has expired. Please login again',
                };
            case 'JsonWebTokenError':
                return {
                    success: false,
                    message: 'Invalid token signature',
                };
            case 'NotBeforeError':
                return {
                    success: false,
                    message: 'Token not yet valid',
                };
            default:
                return {
                    success: false,
                    message: 'Authentication failed',
                };
        }
    }
}