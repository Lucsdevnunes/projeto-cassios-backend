import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, { count: number; lockUntil?: Date }>();
  private redisClient: any = null;
  private activeRefreshTokens = new Map<string, string>(); // Fallback in-memory session tracker

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
    private configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    if (redisUrl || redisHost) {
      try {
        const Redis = require('ioredis');
        if (redisUrl) {
          this.redisClient = new Redis(redisUrl);
        } else {
          this.redisClient = new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
          });
        }
      } catch (err) {
        console.error('Failed to initialize Redis client in AuthService:', err);
      }
    }
  }

  private registerFailedAttempt(email: string) {
    const now = new Date();
    const attempts = this.loginAttempts.get(email);
    const count = attempts ? attempts.count + 1 : 1;
    if (count >= 5) {
      const lockUntil = new Date(now.getTime() + 15 * 60000); // 15 minutes lockout
      this.loginAttempts.set(email, { count, lockUntil });
    } else {
      this.loginAttempts.set(email, { count });
    }
  }

  private async getActiveRefreshToken(userId: string): Promise<string | null> {
    if (this.redisClient) {
      try {
        return await this.redisClient.get(`active_rt:${userId}`);
      } catch (e) {
        console.error('Redis get active refresh token error:', e);
      }
    }
    return this.activeRefreshTokens.get(userId) || null;
  }

  private async setActiveRefreshToken(userId: string, token: string): Promise<void> {
    if (this.redisClient) {
      try {
        // Set with 7 days TTL (604800 seconds)
        await this.redisClient.set(`active_rt:${userId}`, token, 'EX', 604800);
        return;
      } catch (e) {
        console.error('Redis set active refresh token error:', e);
      }
    }
    this.activeRefreshTokens.set(userId, token);
  }

  private async revokeActiveRefreshToken(userId: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(`active_rt:${userId}`);
        return;
      } catch (e) {
        console.error('Redis del active refresh token error:', e);
      }
    }
    this.activeRefreshTokens.delete(userId);
  }

  async login(loginDto: LoginDto, ip: string) {
    const { email, senha } = loginDto;

    const now = new Date();
    const attempts = this.loginAttempts.get(email);
    if (attempts && attempts.lockUntil && attempts.lockUntil > now) {
      const minutesLeft = Math.ceil((attempts.lockUntil.getTime() - now.getTime()) / 60000);
      throw new UnauthorizedException(`Conta temporariamente bloqueada devido a excesso de tentativas. Tente novamente em ${minutesLeft} minutos.`);
    }

    const user = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user || !user.ativo) {
      this.registerFailedAttempt(email);
      await this.audit.log(null, 'LOGIN_FAILURE', 'usuarios', email, ip);
      throw new UnauthorizedException('E-mail ou senha incorretos, ou usuário inativo');
    }

    const passwordMatch = await bcrypt.compare(senha, user.senhaHash);
    if (!passwordMatch) {
      this.registerFailedAttempt(email);
      await this.audit.log(user.id, 'LOGIN_FAILURE', 'usuarios', user.id, ip);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    // Reset login attempts on success
    this.loginAttempts.delete(email);

    await this.audit.log(user.id, 'LOGIN_SUCCESS', 'usuarios', user.id, ip);

    const payload = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m', // Reduced access token validity for security
    });

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      {
        expiresIn: '7d', // 7 days refresh token
      },
    );

    // Save active refresh token
    await this.setActiveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET || 'super-secret-key-123',
      });

      const userId = payload.id;
      const activeRt = await this.getActiveRefreshToken(userId);

      // Verify that this is the active refresh token
      if (!activeRt) {
        throw new UnauthorizedException('Sessão expirada ou inválida. Por favor, faça login novamente.');
      }

      if (activeRt !== refreshToken) {
        // REUSE BREACH DETECTED: An old refresh token was submitted!
        // Revoke all tokens for this user immediately for security.
        await this.revokeActiveRefreshToken(userId);
        await this.audit.log(userId, 'TOKEN_REUSE_BREACH', 'usuarios', userId, '0.0.0.0');
        throw new UnauthorizedException('Violação de segurança detectada: tentativa de reutilização de refresh token. Todas as sessões foram revogadas.');
      }

      const user = await this.prisma.usuario.findFirst({
        where: { id: userId, deletedAt: null, ativo: true },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      const newPayload = {
        id: user.id,
        email: user.email,
        nome: user.nome,
        perfil: user.perfil,
      };

      const newAccessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: '15m',
      });

      const newRefreshToken = await this.jwtService.signAsync(
        { id: user.id },
        {
          expiresIn: '7d',
        },
      );

      // Rotate active refresh token
      await this.setActiveRefreshToken(user.id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async logout(userId: string, ip: string) {
    await this.revokeActiveRefreshToken(userId);
    await this.audit.log(userId, 'LOGOUT', 'usuarios', userId, ip);
  }
}
