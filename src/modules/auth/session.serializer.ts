import { PassportSerializer } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/modules/users/schemas/user.schema';
import { JwtPayload } from '@/modules/auth/interfaces/types';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly userService: UsersService) {
    super();
  }

  serializeUser(
    user: User,
    done: (err: Error | null, payload: JwtPayload) => void,
  ): void {
    done(null, { sub: user._id, email: user.email });
  }

  async deserializeUser(
    payload: JwtPayload,
    done: (err: Error | null, user: User | null) => void,
  ): Promise<void> {
    try {
      const user = await this.userService.findOne({ email: payload.email });
      if (!user) {
        return done(new UnauthorizedException('User not found'), null);
      }
      return done(null, user);
    } catch (error) {
      return done(
        error instanceof Error ? error : new Error('Deserialization error'),
        null,
      );
    }
  }
}
