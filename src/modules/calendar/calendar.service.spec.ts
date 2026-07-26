import { CalendarRepository } from './calendar.repository';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  let repository: jest.Mocked<CalendarRepository>;
  let service: CalendarService;

  beforeEach(() => {
    repository = {
      findCreatedDatesByUserAndRange: jest.fn(),
    } as unknown as jest.Mocked<CalendarRepository>;

    service = new CalendarService(repository);
  });

  it('월 전체 날짜를 채우고 날짜별 나무 개수로 level을 계산한다', async () => {
    repository.findCreatedDatesByUserAndRange.mockResolvedValue([
      { createdAt: new Date('2026-04-01T09:00:00.000Z') },
      { createdAt: new Date('2026-04-01T10:00:00.000Z') },
      { createdAt: new Date('2026-04-01T11:00:00.000Z') },
      { createdAt: new Date('2026-04-01T12:00:00.000Z') },
      { createdAt: new Date('2026-04-02T09:00:00.000Z') },
      { createdAt: new Date('2026-04-02T10:00:00.000Z') },
      { createdAt: new Date('2026-04-03T09:00:00.000Z') },
      { createdAt: new Date('2026-04-04T09:00:00.000Z') },
      { createdAt: new Date('2026-04-04T10:00:00.000Z') },
      { createdAt: new Date('2026-04-04T11:00:00.000Z') },
      { createdAt: new Date('2026-04-04T12:00:00.000Z') },
      { createdAt: new Date('2026-04-04T13:00:00.000Z') },
    ]);

    const result = await service.getCalendar(1, { year: 2026, month: 4 });

    expect(repository.findCreatedDatesByUserAndRange).toHaveBeenCalledWith(
      1,
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-05-01T00:00:00.000Z'),
    );
    expect(result.year).toBe(2026);
    expect(result.month).toBe(4);
    expect(result.days).toHaveLength(30);
    expect(result.days[0]).toEqual({ date: '2026-04-01', level: 3 });
    expect(result.days[1]).toEqual({ date: '2026-04-02', level: 2 });
    expect(result.days[2]).toEqual({ date: '2026-04-03', level: 1 });
    expect(result.days[3]).toEqual({ date: '2026-04-04', level: 4 });
    expect(result.days[4]).toEqual({ date: '2026-04-05', level: 0 });
  });
});
