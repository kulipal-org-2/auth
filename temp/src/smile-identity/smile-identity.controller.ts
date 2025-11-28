import { Controller } from '@nestjs/common';
import { SmileIdentityService } from './smile-identity.service';

@Controller()
export class SmileIdentityController {
  constructor(private readonly smileIdentityService: SmileIdentityService) {}
}
