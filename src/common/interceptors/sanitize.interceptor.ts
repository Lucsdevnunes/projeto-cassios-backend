import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request && request.body) {
      request.body = this.sanitize(request.body);
    }
    return next.handle();
  }

  private sanitize(obj: any): any {
    if (typeof obj === 'string') {
      // Basic XSS sanitization: strip script tags or inline events
      return obj
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitize(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = this.sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  }
}
