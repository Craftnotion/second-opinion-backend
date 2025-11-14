import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nContext } from 'nestjs-i18n';

// Interface for the expected response format
interface ResponseData<T> {
  success: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((response: ResponseData<any>) => {
        // Translate the message using nest-i18n
        try {
          response.message =
            I18nContext.current()?.t(response.message, {
              args: response.data,
            }) || response.message;
        } catch (e) {
          // Translation error occurred
        }

        // Ensure the response format is { success, message, data }
        return response;
      }),
    );
  }
}
