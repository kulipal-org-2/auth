import { Catch, ArgumentsHost, ExceptionFilter, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToRpc();
    const data = ctx.getData();

    // Log full details for internal tracking
    this.logger.error(
      `Unhandled exception in RPC request: ${
        exception instanceof Error ? exception.message : exception
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // If this is an RPC request expecting a response
    const isObservable = !!ctx.getContext()?.reply;

    // Return a safe fallback
    const errorResponse = {
      success: false,
      message: 'Something went wrong. Please try again later.',
    };

    // If exception is RpcException, extract its message safely
    if (exception instanceof RpcException) {
      const error = exception.getError();
      return { message: error, success: false };
    }

    // Otherwise, respond gracefully only if it’s a request-response pattern
    if (isObservable) {
      return errorResponse;
    }

    // For fire-and-forget messages (e.g., events), just log and swallow
  }
}
