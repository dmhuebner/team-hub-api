import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('health')
export class HealthController {

  @Get('')
  @HttpCode(200)
  rootHealh(): string {
    return 'team-hub-api is up and running!';
  }
}
