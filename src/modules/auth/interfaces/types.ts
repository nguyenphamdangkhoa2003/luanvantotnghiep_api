export interface JwtPayload {
  sub: string;
  username: string;
}
export interface AuthRequest extends Request {
  user?: JwtPayload;
}
