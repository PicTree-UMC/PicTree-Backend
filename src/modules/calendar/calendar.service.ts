import { Injectable } from '@nestjs/common';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import {
  CalendarDayResponseDto,
  CalendarResponseDto,
} from './dto/calendar-response.dto';
import {
  createKstMonthStart,
  formatKstDate,
} from '../../common/utils/kst-date.util';
import { CalendarRepository } from './calendar.repository';

@Injectable()
export class CalendarService {
  constructor(private readonly calendarRepository: CalendarRepository) {}

  getCalendar = async (
    userId: number,
    query: CalendarQueryDto,
  ): Promise<CalendarResponseDto> => {
    const start = createKstMonthStart(query.year, query.month);
    const end = createKstMonthStart(query.year, query.month + 1);
    const trees = await this.calendarRepository.findCreatedDatesByUserAndRange(
      userId,
      start,
      end,
    );
    const countByDate = trees.reduce<Map<string, number>>((map, tree) => {
      const date = formatKstDate(tree.createdAt);
      map.set(date, (map.get(date) ?? 0) + 1);
      return map;
    }, new Map());

    return {
      year: query.year,
      month: query.month,
      days: this.buildDays(query.year, query.month, countByDate),
    };
  };

  private buildDays = (
    year: number,
    month: number,
    countByDate: Map<string, number>,
  ): CalendarDayResponseDto[] => {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = this.formatDate(year, month, day);
      const count = countByDate.get(date) ?? 0;

      return {
        date,
        count,
        level: this.resolveLevel(count),
      };
    });
  };

  private resolveLevel = (treeCount: number): number => {
    if (treeCount >= 5) {
      return 4;
    }

    if (treeCount >= 3) {
      return 3;
    }

    return treeCount;
  };

  private formatDate = (year: number, month: number, day: number): string => {
    const monthText = String(month).padStart(2, '0');
    const dayText = String(day).padStart(2, '0');

    return `${year}-${monthText}-${dayText}`;
  };
}
