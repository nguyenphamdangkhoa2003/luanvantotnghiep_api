import { PassportSerializer } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/modules/users/schemas/user.schema';
import { IAccessPayload } from '@/modules/jwt-auth/interfaces/access-token.interface';
import { Types } from 'mongoose';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly userService: UsersService) {
    super();
  }

  serializeUser(
    user: User,
    done: (err: Error | null, payload: IAccessPayload) => void,
  ): void {
    done(null, { id: user._id.toString() });
  }

  async deserializeUser(
    payload: IAccessPayload,
    done: (err: Error | null, user: User | null) => void,
  ): Promise<void> {
    try {
      const user = await this.userService.findOneById(
        new Types.ObjectId(payload.id),
      );
      if (!user) {
        return done(
          new UnauthorizedException('Không tìm thấy người dùng'),
          null,
        );
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
