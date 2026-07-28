import { AppException } from '../../common/exceptions/app.exception';
import { BlogDraftsRepository } from './blog-drafts.repository';
import { BlogDraftsService } from './blog-drafts.service';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

describe('BlogDraftsService', () => {
  let repository: jest.Mocked<BlogDraftsRepository>;
  let openAiService: jest.Mocked<OpenAiBlogDraftService>;
  let service: BlogDraftsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-26T00:00:00.000Z'));

    repository = {
      findUserById: jest.fn(),
      countGeneratedDraftsInRange: jest.fn(),
      findGenerateSource: jest.fn(),
      consumeUsageWithinLimit: jest.fn(),
      createDraft: jest.fn(),
      findSavedDraftsByUserId: jest.fn(),
      findDraftByIdAndUserId: jest.fn(),
      deleteDraft: jest.fn(),
    } as unknown as jest.Mocked<BlogDraftsRepository>;
    openAiService = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<OpenAiBlogDraftService>;
    service = new BlogDraftsService(repository, openAiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('초안 생성 장소가 15개를 초과하면 BLOG400-1 예외를 던진다', async () => {
    try {
      await service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: Array.from({ length: 16 }, (_, index) => index + 1),
      });
      throw new Error('Expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({
        code: 'BLOG400-1',
      });
    }

    expect(repository.findUserById).not.toHaveBeenCalled();
    expect(repository.findGenerateSource).not.toHaveBeenCalled();
    expect(openAiService.generate).not.toHaveBeenCalled();
  });

  it('무료 사용자의 월간 생성 한도를 초과하면 예외를 던진다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(1);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('plus 사용자의 월간 생성 한도를 초과하면 예외를 던진다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'PLUS',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(5);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('pro 사용자의 월간 생성 한도를 초과하면 예외를 던진다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'PRO',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(20);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('max 사용자의 월간 생성 한도를 초과하면 예외를 던진다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'MAX',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(50);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('무료 플랜은 매월 1일 기준으로 사용량을 집계한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);
    repository.findGenerateSource.mockResolvedValue({
      trees: [
        {
          id: 1n,
          name: '포그레인 공원',
          description: null,
          address: null,
          mood: '😍',
          defaultImage: 'DEFAULT_1',
          createdAt: new Date('2026-03-31T10:00:00.000Z'),
          images: [],
        },
      ],
      timelines: [],
    });
    openAiService.generate.mockResolvedValue({
      title: '제목',
      content: '본문',
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
    });

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
    );
  });

  it('유료 플랜은 결제일 기준으로 사용량을 집계한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'PLUS',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);
    repository.findGenerateSource.mockResolvedValue({
      trees: [
        {
          id: 1n,
          name: '포그레인 공원',
          description: null,
          address: null,
          mood: '😍',
          defaultImage: 'DEFAULT_1',
          createdAt: new Date('2026-03-31T10:00:00.000Z'),
          images: [],
        },
      ],
      timelines: [],
    });
    openAiService.generate.mockResolvedValue({
      title: '제목',
      content: '본문',
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
    });

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-07-10T00:00:00.000Z'),
      new Date('2026-08-10T00:00:00.000Z'),
    );
  });

  it('초안 내용을 받아 저장용 블로그 초안을 생성한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.findGenerateSource.mockResolvedValue({
      trees: [
        {
          id: 1n,
          name: '포그레인 공원',
          description: null,
          address: null,
          mood: '😍',
          defaultImage: 'DEFAULT_1',
          createdAt: new Date('2026-03-31T10:00:00.000Z'),
          images: [],
        },
      ],
      timelines: [],
    });
    repository.createDraft.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: '본문',
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    const result = await service.saveDraft(1, {
      title: '제목',
      content: '본문',
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
    });

    expect(repository.createDraft).toHaveBeenCalled();
    expect(result).toEqual({
      draftId: 1,
    });
  });

  it('저장할 제목이 비어 있으면 BLOG400-3 예외를 던진다', async () => {
    try {
      await service.saveDraft(1, {
        title: '   ',
        content: '본문',
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      });
      throw new Error('Expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({
        code: 'BLOG400-3',
      });
    }

    expect(repository.findUserById).not.toHaveBeenCalled();
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('저장할 본문이 비어 있으면 BLOG400-3 예외를 던진다', async () => {
    try {
      await service.saveDraft(1, {
        title: '제목',
        content: '   ',
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
      });
      throw new Error('Expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({
        code: 'BLOG400-3',
      });
    }

    expect(repository.findUserById).not.toHaveBeenCalled();
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('초안 생성 시 사용자 선택 종료일을 그대로 응답한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);
    repository.findGenerateSource.mockResolvedValue({
      trees: [
        {
          id: 1n,
          name: '포그레인 공원',
          description: null,
          address: null,
          mood: '😍',
          defaultImage: 'DEFAULT_1',
          createdAt: new Date('2026-03-31T10:00:00.000Z'),
          images: [],
        },
      ],
      timelines: [],
    });
    openAiService.generate.mockResolvedValue({
      title: '[여행 기록] 3월 31일 ~ 4월 1일',
      content: '생성된 블로그 초안 내용입니다.',
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    const result = await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
    });

    expect(repository.findGenerateSource).toHaveBeenCalledWith(
      1,
      new Date('2026-03-31T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
      [1],
    );
    expect(repository.consumeUsageWithinLimit).toHaveBeenCalledWith(
      1n,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
      1,
    );
    expect(result).toEqual({
      title: '[여행 기록] 3월 31일 ~ 4월 1일',
      content: '생성된 블로그 초안 내용입니다.',
      startDate: '2026-03-31',
      endDate: '2026-04-01',
    });
  });
});
