import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
  Param,
  Patch,
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
import { GetPassengersDto } from '@/modules/routes/DTOs/get-passengers.dto';
import { Public } from '@/modules/auth/decorators/public.decorators';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() createRouteDto: CreateRouteDto,
  ) {
    const userId = req.user.id;
    console.log('createRouteDto', createRouteDto);
    return this.routesService.create(userId, createRouteDto);
  }

  @Public()
  @Post('search')
  async search(@Body() searchRouteDto: SearchRouteDto) {
    return this.routesService.search(searchRouteDto);
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

  @Post('passengers')
  async getPassengers(
    @Body() getPassengersDto: GetPassengersDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.routesService.getPassengers(userId, getPassengersDto);
  }

  @Public()
  @Get(':routeId')
  async getRouteById(@Param('routeId') routeId: string) {
    const route = this.routesService.getRouteById(routeId);
    return route;
  }

  @Patch(':id/complete')
  async completeTrip(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.routesService.completeTrip(id, req.user._id);
  }

  @Get('driver/:userId')
  async getRoutesByDriver(@Param('userId') userId: string) {
    return this.routesService.getRoutesByDriver(userId);
  }

  // @Post('generate')
  // async generateRoutes() {
  //   return this.routesService.generateRoutes(1000);
  // }
}
