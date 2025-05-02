import { User } from "@/modules/users/schemas/user.schema";

export interface ApiResponse<T = unknown> {
  message: string;
  code: number;
  data: T;
}
export interface AuthRequest extends Request {
  user: User;
}
