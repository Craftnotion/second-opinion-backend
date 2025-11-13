export type organisationStatus = 'pending' | 'active' | 'expired' | 'blocked';

export type user_identity_type = 'email' | 'phone' | 'username';

export type authentication_mode = 'otp' | 'link';

export type action_type = 'accept' | 'reject';
export type status = 'active' | 'inactive';
export type ImageMimeTypes =
  | 'image/*'
  | 'image/avif'
  | 'image/apng'
  | 'image/jpg'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/bmp'
  | 'image/tiff'
  | 'image/svg+xml';
export type OtherMimeTypes =
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'text/csv'
  | 'application/pdf';
export type AllowedMimeTypes = ImageMimeTypes | OtherMimeTypes;

export interface VerificationToken {
  user_identity: string;
  token: string;
  expiresAt: Date;
  user_identity_type: user_identity_type;
}

export interface saveFileOptions {
  isPrivate?: boolean;
}

export type HttpResponse<T> = {
  success: number;
  message: string;
  data?: T;
  [key: string]: any;
};

export type awsConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket_name: string;
};
export type configObject = { [key: string]: string };

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export type TransactionType = 'added' | 'used' | 'refunded';

export type TestimonialType = 'sme' | 'expert';

export type ActivityType = 'project' | 'network';

export type ActivityKey =
  | 'new-application'
  | 'application-shortlisted'
  | 'application-accepted'
  | 'application-rejected'
  | 'new-message';

export type PermissionType = string[];

export type status = 'active' | 'inactive';

export interface text_data {
  smsContent: string;
}

export type JobType = Array<'email' | 'push_notification' | 'text'>;

export interface mail_data {
  subject: string;
  body: string;
  greet: string;
  logo: string;
  app_name: string;
  app_background: string;
  app_color: string;
  button?: object;
}