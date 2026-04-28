import { Controller, Get, Param } from '@nestjs/common';
import { ClientsService } from './clients.service';

/**
 * Routes internes sans JWT pour usage service-to-service uniquement.
 * NE PAS exposer ces routes via l'API Gateway.
 */
@Controller('clients')
export class ClientsInternalController {
  constructor(private service: ClientsService) {}

  @Get('internal/:id')
  internalGetById(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get('internal-by-business/:businessId')
  internalByBusiness(@Param('businessId') businessId: string) {
    return this.service.listByBusiness(businessId);
  }
}
