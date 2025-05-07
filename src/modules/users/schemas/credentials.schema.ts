import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as dayjs from 'dayjs';

// Định nghĩa schema cho Credentials (tương đương CredentialsEmbeddable)
@Schema({ _id: false }) // Không tạo _id cho sub-document
export class Credentials {
  @Prop({ type: Number, default: 0 })
  public version: number;

  @Prop({ type: String, default: '' })
  public lastPassword: string;

  @Prop({ type: Number, default: () => dayjs().unix() })
  public passwordUpdatedAt: number;

  @Prop({ type: Number, default: () => dayjs().unix() })
  public updatedAt: number;
  constructor(isConfirmed = false) {
    this.version = isConfirmed ? 1 : 0;
  }
  public updatePassword(password: string): void {}

  public updateVersion(): void {}
}

// Tạo type cho document
export type CredentialsDocument = HydratedDocument<Credentials>;

// Tạo schema
export const CredentialsSchema = SchemaFactory.createForClass(Credentials);

// Định nghĩa các phương thức instance

CredentialsSchema.method.constructor

CredentialsSchema.methods.updatePassword = function (password: string): void {
  this.version++;
  this.lastPassword = password;
  const now = dayjs().unix();
  this.passwordUpdatedAt = now;
  this.updatedAt = now;
};

CredentialsSchema.methods.updateVersion = function (): void {
  this.version++;
  this.updatedAt = dayjs().unix();
};
