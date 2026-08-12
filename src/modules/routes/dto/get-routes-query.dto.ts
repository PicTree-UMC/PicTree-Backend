import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { RoutePagination } from '../routes.constant';

export class GetRoutesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RoutePagination.MIN_PAGE)
  page?: number = RoutePagination.DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RoutePagination.MIN_SIZE)
  @Max(RoutePagination.MAX_SIZE)
  size?: number = RoutePagination.DEFAULT_SIZE;
}
