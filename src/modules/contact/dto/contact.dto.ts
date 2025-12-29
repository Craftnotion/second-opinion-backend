import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ContactDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @ApiProperty({ description: 'Full name of the contact' })
  name: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  @ApiProperty({ description: 'Email address of the contact' })
  email: string;

  @IsString()
  @Matches(/^[6-9]{1}[0-9]{9}$/, {
    message: 'Please enter a valid 10-digit mobile number (e.g., 9876543210)',
  })
  @ApiProperty({ description: 'Mobile number of the contact' })
  phone: string;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  @ApiProperty({ description: 'Message from the contact' })
  message: string;
}



