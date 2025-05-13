import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from '@/modules/routes/DTOs/create-route.dto';
import { SearchRouteDto } from '@/modules/routes/DTOs/search-route.dto';
import { AuthRequest } from '@/types';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/schemas/user.schema';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  //   @UseGuards(RolesGuard)
  //   @Roles(UserRole.DRIVER)
  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() createRouteDto: CreateRouteDto,
  ) {
    const userId = req.user.id;
    console.log('createRouteDto', createRouteDto);
    return this.routesService.create(userId, createRouteDto);
  }

  @Get('search')
  async search(@Query() searchRouteDto: SearchRouteDto) {
    return this.routesService.search(searchRouteDto);
  }
}
