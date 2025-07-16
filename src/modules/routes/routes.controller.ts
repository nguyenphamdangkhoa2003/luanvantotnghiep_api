import { Public } from '@/modules/auth/decorators/public.decorators';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CancelRequestDto } from '@/modules/routes/DTOs/cancel-request.dto';
import { CreateRouteDto } from '@/modules/routes/DTOs/create-route.dto';
import { GetPassengersDto } from '@/modules/routes/DTOs/get-passengers.dto';
import { HandleRequestDto } from '@/modules/routes/DTOs/handle-request.dto';
import { RequestRouteDto } from '@/modules/routes/DTOs/request-route.dto';
import { SearchRouteDto } from '@/modules/routes/DTOs/search-route.dto';
import { UpdateRouteDto } from '@/modules/routes/DTOs/update-route.dto';
import { UserRole } from '@/modules/users/schemas/user.schema';
import { AuthRequest } from '@/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  /**
   * Tài xế tạo tuyến đường mới
   */
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post()
  async createRoute(
    @Req() req: AuthRequest,
    @Body() createRouteDto: CreateRouteDto,
  ) {
    return this.routesService.create(req.user.id, createRouteDto);
  }

  /**
   * Công khai: Tìm kiếm tuyến theo điểm đi/điểm đến
   */
  @Public()
  @Post('search')
  async searchRoutes(@Body() searchRouteDto: SearchRouteDto) {
    return this.routesService.search(searchRouteDto);
  }

  /**
   * Hành khách gửi yêu cầu đặt tuyến
   */
  @Post('request')
  async requestRoute(@Req() req: AuthRequest, @Body() dto: RequestRouteDto) {
    return this.routesService.requestRoute(req.user, dto);
  }

  /**
   * Tài xế xử lý yêu cầu đặt chỗ (chấp nhận / từ chối)
   */
  @Post('handle-request')
  async handleRequest(@Req() req: AuthRequest, @Body() dto: HandleRequestDto) {
    return this.routesService.handleRequest(req.user, dto);
  }

  /**
   * Tài xế lấy danh sách hành khách trong tuyến
   */
  @Post('passengers')
  async getPassengers(@Req() req: AuthRequest, @Body() dto: GetPassengersDto) {
    return this.routesService.getPassengers(req.user._id, dto);
  }

  /**
   * Công khai: Lấy chi tiết tuyến theo ID
   */
  @Public()
  @Get(':routeId')
  async getRouteById(@Param('routeId') routeId: string) {
    return this.routesService.getRouteById(routeId);
  }

  /**
   * Tài xế hoàn thành chuyến đi
   */
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Patch(':id/complete')
  async completeTrip(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.routesService.completeTrip(id, req.user._id);
  }

  /**
   * Lấy các tuyến được tạo bởi tài xế
   */
  @Get('driver/:userId')
  async getRoutesByDriver(@Param('userId') userId: string) {
    return this.routesService.getRoutesByDriver(userId);
  }

  /**
   * Lấy các yêu cầu đặt chỗ theo tài xế
   */
  @Get('requests/driver/:driverId')
  async getRequestsByDriver(@Param('driverId') driverId: string) {
    return this.routesService.getRequestsByDriverId(driverId);
  }

  /**
   * Hành khách hủy yêu cầu đặt chỗ
   */
  @Post('cancel')
  async cancelBooking(@Req() req: AuthRequest, @Body() dto: CancelRequestDto) {
    return this.routesService.cancelBooking(req.user._id, dto);
  }

  /**
   * Lấy các tuyến mà hành khách đã đặt
   */
  @Get('passenger/:userId')
  async getRoutesByPassenger(@Param('userId') userId: string) {
    return this.routesService.getRoutesByPassenger(userId);
  }

  /**
   * Lấy các yêu cầu đã gửi theo người dùng
   */
  @Get('requests/user/:userId')
  async getRequestsByUser(@Param('userId') userId: string) {
    return this.routesService.getRequestsByUserId(userId);
  }

  /**
   * Lịch sử đặt tuyến của người dùng
   */
  @Get('history/booking')
  async getBookingHistory(@Req() req: AuthRequest) {
    return this.routesService.getBookinHistory(req.user._id);
  }

  /**
   * Tài xế cập nhật thông tin tuyến
   */
  @Patch(':id')
  async updateRoute(
    @Req() req: AuthRequest,
    @Param('id') routeId: string,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.routesService.updateRoute(
      req.user._id.toString(),
      routeId,
      dto,
    );
  }

  /**
   * Tài xế xóa tuyến
   */
  @Delete(':id')
  async deleteRoute(@Req() req: AuthRequest, @Param('id') routeId: string) {
    return this.routesService.deleteRoute(req.user._id.toString(), routeId);
  }
}
