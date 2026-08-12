import { AppException } from '../../common/exceptions/app.exception';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserRecord } from './users.types';

describe('UsersService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let usersService: UsersService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-08T10:00:00.000Z'));
    usersRepository = {
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      withdrawUser: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    usersService = new UsersService(usersRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('회원 탈퇴 시 30일 뒤를 최종 삭제 예정일로 저장한다', async () => {
    usersRepository.withdrawUser.mockResolvedValue({
      user: createUser({ status: 'WITHDRAWN', tokenVersion: 1 }),
      withdrawn: true,
    });

    const result = await usersService.withdrawMe(1);

    expect(usersRepository.withdrawUser).toHaveBeenCalledWith(
      1,
      new Date('2026-08-08T10:00:00.000Z'),
      new Date('2026-09-07T10:00:00.000Z'),
    );
    expect(result.recoverableUntil).toEqual(
      new Date('2026-09-07T10:00:00.000Z'),
    );
  });

  it('이미 탈퇴한 회원은 다시 탈퇴할 수 없다', async () => {
    usersRepository.withdrawUser.mockResolvedValue({
      user: createUser({ status: 'WITHDRAWN' }),
      withdrawn: false,
    });

    await expect(usersService.withdrawMe(1)).rejects.toBeInstanceOf(
      AppException,
    );
  });
});

const createUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 1n,
  email: 'user@example.com',
  nickname: '사용자',
  profileImageUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  tokenVersion: 0,
  notification: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  deletedAt: null,
  scheduledDeletionAt: null,
  currentSubscription: null,
  ...overrides,
});
