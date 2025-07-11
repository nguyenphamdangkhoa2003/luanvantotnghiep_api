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
  Delete,
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
import { CancelRequestDto } from '@/modules/routes/DTOs/cancel-request.dto';
import { UpdateRouteDto } from '@/modules/routes/DTOs/update-route.dto';

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

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Patch(':id/complete')
  async completeTrip(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.routesService.completeTrip(id, req.user._id);
  }

  @Get('driver/:userId')
  async getRoutesByDriver(@Param('userId') userId: string) {
    return this.routesService.getRoutesByDriver(userId);
  }

  @Get('requests/driver/:driverId')
  async getRequestsByDriverId(@Param('driverId') driverId: string) {
    return this.routesService.getRequestsByDriverId(driverId);
  }

  @Post('cancel')
  async cancelBooking(
    @Body() cancelBookingDto: CancelRequestDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user._id;
    return this.routesService.cancelBooking(userId, cancelBookingDto);
  }

  @Get('passenger/:userId')
  async getRoutesByPassenger(@Param('userId') userId: string) {
    return this.routesService.getRoutesByPassenger(userId);
  }

  // routes.controller.ts
  @Get('requests/user/:userId')
  async getRequestsByUserId(@Param('userId') userId: string) {
    return this.routesService.getRequestsByUserId(userId);
  }

  @Get('history/booking')
  async getBookingHistory(@Req() req: AuthRequest) {
    const userId = req.user._id;
    return this, this.routesService.getBookinHistory(userId);
  }

  @Patch(':id')
  updateRoute(
    @Req() req: AuthRequest,
    @Param('id') routeId: string,
    @Body() dto: UpdateRouteDto,
  ) {
    const user = req.user;
    return this.routesService.updateRoute(user._id.toString(), routeId, dto);
  }

  @Delete(':id')
  deleteRoute(@Req() req: AuthRequest, @Param('id') routeId: string) {
    const user = req.user;
    return this.routesService.deleteRoute(user._id.toString(), routeId);
  }
}
