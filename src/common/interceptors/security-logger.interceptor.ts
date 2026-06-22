import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class SecurityLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const method = req.method;
    const url = req.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logEvent(req, res, ip, userAgent, method, url, startTime);
        },
        error: (err: any) => {
          const status = err.status || err.statusCode || 500;
          this.logEvent(req, res, ip, userAgent, method, url, startTime, status, err.message);
        },
      }),
    );
  }

  private logEvent(
    req: any,
    res: Response,
    ip: string,
    userAgent: string,
    method: string,
    url: string,
    startTime: number,
    overrideStatus?: number,
    errorMessage?: string,
  ) {
    const duration = Date.now() - startTime;
    const status = overrideStatus || res.statusCode;
    const user = req.user;
    const userId = user ? user.id : 'anonymous';

    let category = 'TRAFFIC';
    if (status === 429) {
      category = 'SECURITY_RATE_LIMIT_BLOCKED';
    } else if (status === 401 || status === 403) {
      category = 'SECURITY_UNAUTHORIZED';
    } else if (url.includes('/public/') && method === 'GET') {
      category = 'PUBLIC_ACCESS';
    } else if (url.includes('/login') && method === 'POST') {
      category = status === 200 ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILURE';
    } else if (url.includes('/logout') && method === 'POST') {
      category = 'AUTH_LOGOUT';
    }

    const logPayload = {
      timestamp: new Date().toISOString(),
      category,
      ip,
      userAgent,
      method,
      url,
      status,
      durationMs: duration,
      userId,
      ...(errorMessage ? { error: errorMessage } : {}),
    };

    if (category.startsWith('SECURITY_') || category.startsWith('AUTH_LOGIN_FAILURE')) {
      this.logger.warn(JSON.stringify(logPayload));
    } else {
      this.logger.log(JSON.stringify(logPayload));
    }
  }
}
