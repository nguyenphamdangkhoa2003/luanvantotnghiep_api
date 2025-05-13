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
import { AdvancedSearchRouteDto } from '@/modules/routes/DTOs/advanced-search-route.dto';
import { RequestRouteDto } from '@/modules/routes/DTOs/request-route.dto';
import { HandleRequestDto } from '@/modules/routes/DTOs/handle-request.dto';

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

  @Get('advanced-search')
  async advancedSearch(
    @Query() advancedSearchRouteDto: AdvancedSearchRouteDto,
  ) {
    return this.routesService.advancedSearch(advancedSearchRouteDto);
  }

  @Post('request')
  async requestRoute(
    @Body() requestRouteDto: RequestRouteDto,
    @Req() req: AuthRequest,
  ) {
    const user = req.user;
    return this.routesService.requestRoute(user, requestRouteDto);
  }

  @Post('handle-request')
  async handleRequest(
    @Body() handleRequestDto: HandleRequestDto,
    @Req() req: AuthRequest,
  ) {
    const user = req.user;
    return this.routesService.handleRequest(user, handleRequestDto);
  }
}
