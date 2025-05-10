import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  JsonWebTokenError,
  JwtService,
  JwtSignOptions,
  TokenExpiredError,
} from '@nestjs/jwt';
import { CommonService } from '../common/common.service';
import {
  IAccessPayload,
  IAccessToken,
} from './interfaces/access-token.interface';
import { IEmailPayload, IEmailToken } from './interfaces/email-token.interface';
import {
  IRefreshPayload,
  IRefreshToken,
} from './interfaces/refresh-token.interface';
import { TokenTypeEnum } from '@/modules/jwt-auth/enums/types';
import { User } from '@/modules/users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { IJwtConfig } from '@/config/interface/jwt-config.interface';
import { JwtVerifyOptions } from '@nestjs/jwt';

@Injectable()
export class JwtAuthService {
  private readonly jwtConfig: IJwtConfig;
  private readonly issuer: string;
  private readonly domain: string;

  constructor(
    private configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly commonService: CommonService,
  ) {
    this.jwtConfig = this.configService.get<IJwtConfig>('jwt')!;
    this.issuer = this.configService.get<string>('id')!;
    this.domain = this.configService.get<string>('domain')!;
  }

  public async generateTokenAsync(
    payload: IAccessPayload | IEmailPayload | IRefreshPayload,
    secret: string,
    options: JwtSignOptions,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret,
      ...options,
    });
  }

  public async verifyTokenAsync<T extends object>(
    token: string,
    secret: string,
    options: JwtVerifyOptions,
  ): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, {
      secret,
      ...options,
    });
  }

  public async generateToken(
    user: User,
    tokenType: TokenTypeEnum,
    domain?: string | null,
    tokenId?: string,
  ): Promise<string> {
    const jwtOptions: JwtSignOptions = {
      issuer: this.issuer,
      subject: user.email,
      audience: domain ?? this.domain,
      algorithm: 'HS256',
    };

    switch (tokenType) {
      case TokenTypeEnum.ACCESS:
        const { privateKey, time: accessTime } = this.jwtConfig.access;
        const accessPayload: IAccessPayload = {
          id: user._id.toString(),
        };
        return this.commonService.throwInternalError(
          this.generateTokenAsync(accessPayload, privateKey, {
            ...jwtOptions,
            expiresIn: accessTime,
            algorithm: 'RS256',
          }),
        );
      case TokenTypeEnum.REFRESH:
        const { secret: refreshSecret, time: refreshTime } =
          this.jwtConfig.refresh;
        return this.commonService.throwInternalError(
          this.generateTokenAsync(
            {
              id: user._id.toString(),
              version: user.credentials.version,
              tokenId: tokenId ?? crypto.randomUUID(),
            },
            refreshSecret,
            {
              ...jwtOptions,
              expiresIn: refreshTime,
            },
          ),
        );
      case TokenTypeEnum.CONFIRMATION:
      case TokenTypeEnum.RESET_PASSWORD:
        const { secret, time } = this.jwtConfig[tokenType];
        return this.commonService.throwInternalError(
          this.generateTokenAsync(
            { id: user._id.toString(), version: user.credentials.version },
            secret,
            {
              ...jwtOptions,
              expiresIn: time,
            },
          ),
        );
    }
  }

  public async verifyToken<
    T extends IAccessToken | IRefreshToken | IEmailToken,
  >(token: string, tokenType: TokenTypeEnum): Promise<T> {
    const jwtOptions: JwtVerifyOptions = {
      issuer: this.issuer,
      audience: new RegExp(this.domain),
    };

    switch (tokenType) {
      case TokenTypeEnum.ACCESS:
        const { publicKey, time: accessTime } = this.jwtConfig.access;
        return JwtAuthService.throwBadRequest(
          this.verifyTokenAsync(token, publicKey, {
            ...jwtOptions,
            maxAge: accessTime,
            algorithms: ['RS256'],
          }),
          TokenTypeEnum.ACCESS,
        );
      case TokenTypeEnum.REFRESH:
      case TokenTypeEnum.CONFIRMATION:
      case TokenTypeEnum.RESET_PASSWORD:
        const { secret, time } = this.jwtConfig[tokenType];
        return JwtAuthService.throwBadRequest(
          this.verifyTokenAsync(token, secret, {
            ...jwtOptions,
            maxAge: time,
            algorithms: ['HS256'],
          }),
          'Token',
        );
    }
  }

  private static async throwBadRequest<
    T extends IAccessToken | IRefreshToken | IEmailToken,
  >(promise: Promise<T>, tokenType: TokenTypeEnum | string): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      const tokenTypeName = tokenType
        .toString()
        .replace(/_/g, ' ')
        .toLowerCase();
      const capitalizedTokenType =
        tokenTypeName.charAt(0).toUpperCase() + tokenTypeName.slice(1);

      if (error instanceof TokenExpiredError) {
        throw new BadRequestException(error);
      }
      if (error instanceof JsonWebTokenError) {
        throw new BadRequestException(`${capitalizedTokenType} không hợp lệ`);
      }
      throw new InternalServerErrorException(
        `Lỗi không xác định với ${tokenTypeName}: ${error.message}`,
      );
    }
  }

  public async generateAuthTokens(
    user: User,
    domain?: string,
    tokenId?: string,
  ): Promise<[string, string]> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(user, TokenTypeEnum.ACCESS, domain, tokenId),
      this.generateToken(user, TokenTypeEnum.REFRESH, domain, tokenId),
    ]);

    return [accessToken, refreshToken];
  }
}
