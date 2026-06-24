import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'super-secret-key-123') {
      throw new UnauthorizedException('Configuração de segurança do servidor inválida (JWT_SECRET ausente)');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });
      // Attach payload (id, email, nome, perfil) to the request object
      request['user'] = payload;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
