export interface JwtPayload {
  sub: string;
  email: string;
}

export interface UserQuery {
  [key: string]: any;
}
