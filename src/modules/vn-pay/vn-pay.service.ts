import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';

@Injectable()
export class VnPayService {
  private readonly vnpUrl =
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly vnpTmnCode;
  private readonly vnpHashSecret;
  private readonly vnpReturnUrl;

  constructor(private configService: ConfigService) {
    this.vnpTmnCode = this.configService.get<string>('vnpay.tmn_code');
    this.vnpHashSecret = this.configService.get<string>('vnpay.hash_secret');
    this.vnpReturnUrl =
      this.configService.get<string>('vnpay.return_url') ||
      'http://localhost:3000/membership/vnpay-callback';
  }

  async createPaymentUrl(data: {
    amount: number;
    orderId: string;
    orderInfo: string;
    userId: string;
  }) {
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );
    const expire = new Date(now.getTime() + 15 * 60 * 1000); // Hết hạn sau 15 phút

    const vnpParams: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: data.amount * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: data.orderId,
      vnp_OrderInfo: data.orderInfo,
      vnp_OrderType: 'billpayment',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_IpAddr: '127.0.0.1', // Thay bằng IP thực tế nếu deploy
      vnp_CreateDate: this.formatDate(now),
      vnp_ExpireDate: this.formatDate(expire),
    };

    console.log('vnpParams:', vnpParams); // Debug

    const sortedParams = this.sortObject(vnpParams);
    const queryString = new URLSearchParams(sortedParams).toString();
    const secureHash = crypto
      .createHmac('sha512', this.vnpHashSecret)
      .update(queryString)
      .digest('hex');
    vnpParams.vnp_SecureHash = secureHash;

    return `${vnpUrl}?${new URLSearchParams(vnpParams).toString()}`;
  }

  async verifyCallback(data: any) {
    console.log('Callback data:', data);
    const secureHash = data.vnp_SecureHash;
    delete data.vnp_SecureHash;

    // Decode các tham số như vnp_OrderInfo
    const decodedParams: any = {};
    for (const key in data) {
      decodedParams[key] = decodeURIComponent(data[key]);
    }

    const sortedParams = this.sortObject(decodedParams);
    const queryString = new URLSearchParams(sortedParams).toString();
    const calculatedHash = crypto
      .createHmac('sha512', this.vnpHashSecret)
      .update(queryString)
      .digest('hex');

    console.log('Calculated hash:', calculatedHash);
    console.log('Received hash:', secureHash);

    return secureHash === calculatedHash && data.vnp_ResponseCode === '00';
  }

  private createSecureHash(data: string): string {
    return crypto
      .createHmac('sha512', this.vnpHashSecret)
      .update(data)
      .digest('hex');
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }
}
