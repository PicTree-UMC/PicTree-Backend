import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { TreePagination } from '../trees.constant';

export class GetTreesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TreePagination.MIN_PAGE)
  page?: number = TreePagination.DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TreePagination.MIN_SIZE)
  @Max(TreePagination.MAX_SIZE)
  size?: number = TreePagination.DEFAULT_SIZE;
}
