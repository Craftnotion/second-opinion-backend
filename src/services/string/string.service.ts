import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class StringService {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * Generate a random string.
   * @param {number} length Lenght of the string to generate
   * @param {string} just_numeric If true, the generated string will only contain numbers
   * @returns {string} A random string of the specified length
   */
  public getString = function (length: number, just_numeric: boolean = false) {
    let chars = just_numeric
      ? '0123456789'
      : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  /**
   * Format message
   * @param message message to format
   * @param data meta data
   * @returns {string} formatted message
   */
  public formatMessage(message: string, data?: any): string {
    message = this.i18nService.translate(message, { lang: 'en' });

    data &&
      Object.keys(data).map(
        (key) => (message = message.replace(`{${key}}`, data[key])),
      );
    return message;
  }
}
