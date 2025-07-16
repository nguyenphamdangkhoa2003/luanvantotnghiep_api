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
 * Trả về mảng từ chuỗi hoặc mảng chuỗi, dùng để chuẩn hóa đầu vào.
 */
function normalizeToArray(input: string | string[]): string[] {
  return Array.isArray(input) ? input : [input];
}

/**
 * Trả về object CookieOptions chuẩn với các giá trị mặc định bảo mật cao.
 */
function getDefaultCookieOptions(overrides?: CookieOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...overrides,
  };
}

/**
 * Thiết lập một hoặc nhiều HTTP-only cookies vào response với cấu hình bảo mật mặc định.
 *
 * @param res - Đối tượng Response từ Express
 * @param cookies - Danh sách cookie cần thiết lập
 */
export function setCookies(res: Response, cookies: ICookieData[]): void {
  cookies.forEach(({ name, value, options }) => {
    const cookieOptions = getDefaultCookieOptions(options);
    res.cookie(name, value, cookieOptions);
  });
}

/**
 * Trích xuất giá trị của một hoặc nhiều cookies từ request.
 *
 * @param req - Đối tượng Request từ Express
 * @param cookieNames - Tên hoặc danh sách tên cookies cần lấy
 * @param required - Nếu true, sẽ ném lỗi nếu thiếu cookie nào
 * @returns Giá trị cookie (string) nếu chỉ một tên được truyền vào, hoặc object nếu nhiều tên
 * @throws BadRequestException nếu cookie yêu cầu không tồn tại
 */
export function getCookies(
  req: Request,
  cookieNames: string | string[],
  required = false,
): CookieResult | string {
  const names = normalizeToArray(cookieNames);
  const result: CookieResult = {};

  if (!req.cookies) {
    throw new BadRequestException(
      'Không tìm thấy cookies trong request. Đảm bảo middleware cookie-parser đã được cấu hình.',
    );
  }

  for (const name of names) {
    const value = req.cookies[name];
    if (required && !value) {
      throw new BadRequestException(`Cookie '${name}' không tồn tại`);
    }
    result[name] = value;
  }

  // Trả về giá trị trực tiếp nếu chỉ yêu cầu một cookie
  if (!Array.isArray(cookieNames)) {
    const singleValue = result[cookieNames];
    if (singleValue === undefined) {
      throw new BadRequestException(`Cookie '${cookieNames}' không tồn tại`);
    }
    return singleValue;
  }

  return result;
}

/**
 * Xóa một hoặc nhiều cookies khỏi response bằng cách set thời hạn đã hết hạn.
 *
 * @param res - Đối tượng Response từ Express
 * @param cookieNames - Tên hoặc danh sách tên cookies cần xóa
 * @param options - Các tùy chọn cookie (phải trùng với khi set để xóa đúng)
 */
export function clearCookies(
  res: Response,
  cookieNames: string | string[],
  options?: CookieOptions,
): void {
  const names = normalizeToArray(cookieNames);
  const cookieOptions = getDefaultCookieOptions(options);

  names.forEach((name) => {
    res.clearCookie(name, cookieOptions);
  });
}
