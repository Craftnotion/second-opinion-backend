import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('contact')
@ApiTags('Contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({ summary: 'Submit contact form' })
  @ApiBody({ type: ContactDto })
  @ApiConsumes('application/x-www-form-urlencoded')
  @Post('submit')
  async submitContact(@Body() body: ContactDto) {
    return await this.contactService.submitContactForm(body);
  }
}



