import { BadRequestException } from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';


interface CookieResult {
  [key: string]: string | undefined;
}

interface ICookieData {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Hàm để set HTTP-only cookie với cấu hình bảo mật
 * @param res Response object từ Express
 * @param cookies Mảng các cookie cần set
 */
export function setCookies(res: Response, cookies: ICookieData[]): void {
  cookies.forEach(({ name, value, options }) => {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      ...options,
    };

    res.cookie(name, value, defaultOptions);
  });
}

export function getCookies(
  req: Request,
  cookieNames: string | string[],
  required: boolean = false,
): CookieResult | string {
  const result: CookieResult = {};

  const names = Array.isArray(cookieNames) ? cookieNames : [cookieNames];

  for (const name of names) {
    const value = req.cookies?.[name];
    if (required && !value) {
      throw new BadRequestException(`Cookie '${name}' không tồn tại`);
    }
    result[name] = value;
  }

  if (!Array.isArray(cookieNames)) {
    const value = result[cookieNames];
    if (value === undefined) {
      throw new BadRequestException(`Cookie '${cookieNames}' không tồn tại`);
    }
    return value;
  }

  return result;
}

/**
 * Hàm để xóa HTTP-only cookies
 * @param res Response object từ Express
 * @param cookieNames Tên hoặc mảng tên các cookie cần xóa
 * @param options Tùy chọn cấu hình (phải khớp với khi set cookie)
 */
export function clearCookies(
  res: Response,
  cookieNames: string | string[],
  options?: CookieOptions,
): void {
  const names = Array.isArray(cookieNames) ? cookieNames : [cookieNames];

  const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...options,
  };

  names.forEach((name) => {
    res.clearCookie(name, defaultOptions);
  });
}