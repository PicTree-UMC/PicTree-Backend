import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersRepository } from './users.repository';
import { UserRecord } from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  getMe = async (userId: number): Promise<UserResponseDto> => {
    const user = await this.getUserOrThrow(userId);

    this.validateAvailableUser(user);

    return this.toUserResponseDto(user);
  };

  updateMe = async (
    userId: number,
    updateUserRequestDto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> => {
    const user = await this.getUserOrThrow(userId);

    this.validateAvailableUser(user);
    this.validateUpdateRequest(updateUserRequestDto);

    const updatedUser = await this.usersRepository.updateUser(
      userId,
      updateUserRequestDto,
    );

    return this.toUserResponseDto(updatedUser);
  };

  withdrawMe = async (userId: number): Promise<null> => {
    const user = await this.getUserOrThrow(userId);

    if (user.status === 'WITHDRAWN') {
      throw new AppException(ErrorCode.USER_ALREADY_WITHDRAWN);
    }

    this.validateAvailableUser(user);
    await this.usersRepository.withdrawUser(userId, new Date());

    return null;
  };

  private getUserOrThrow = async (userId: number): Promise<UserRecord> => {
    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    return user;
  };

  private validateAvailableUser = (user: UserRecord): void => {
    if (user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.USER_UNAVAILABLE);
    }
  };

  private validateUpdateRequest = (
    updateUserRequestDto: UpdateUserRequestDto,
  ): void => {
    const hasUpdateValue = Object.values(updateUserRequestDto).some(
      (value) => value !== undefined,
    );

    if (!hasUpdateValue) {
      throw new AppException(ErrorCode.USER_INVALID_UPDATE_REQUEST);
    }
  };

  private toUserResponseDto = (user: UserRecord): UserResponseDto => ({
    id: Number(user.id),
    email: user.email,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    status: user.status,
    currentPlan: user.currentSubscription?.subscriptionPlan.code ?? 'FREE',
    notification: user.notification,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}
