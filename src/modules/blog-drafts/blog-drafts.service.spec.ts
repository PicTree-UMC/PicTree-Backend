import { AppException } from '../../common/exceptions/app.exception';
import { S3Service } from '../../common/s3/s3.service';
import { BlogDraftContentService } from './services/blog-draft-content.service';
import { BlogDraftResponseBuilderService } from './services/blog-draft-response-builder.service';
import { BlogDraftUsageService } from './services/blog-draft-usage.service';
import { BlogDraftsRepository } from './blog-drafts.repository';
import { BlogDraftsService } from './blog-drafts.service';
import { BlogDraftTone } from './dto/generate-blog-draft-request.dto';
import { OpenAiBlogDraftService } from './openai-blog-draft.service';

describe('BlogDraftsService', () => {
  let repository: jest.Mocked<BlogDraftsRepository>;
  let openAiService: jest.Mocked<OpenAiBlogDraftService>;
  let s3Service: jest.Mocked<S3Service>;
  let blogDraftContentService: BlogDraftContentService;
  let blogDraftUsageService: BlogDraftUsageService;
  let blogDraftResponseBuilderService: BlogDraftResponseBuilderService;
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
      findTreeImagesByIds: jest.fn(),
      countOwnedTreesByIds: jest.fn(),
      deleteDraft: jest.fn(),
    } as unknown as jest.Mocked<BlogDraftsRepository>;
    openAiService = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<OpenAiBlogDraftService>;
    s3Service = {
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;
    blogDraftContentService = new BlogDraftContentService();
    blogDraftUsageService = new BlogDraftUsageService(repository);
    blogDraftResponseBuilderService = new BlogDraftResponseBuilderService(
      repository,
      s3Service,
      blogDraftContentService,
    );
    service = new BlogDraftsService(
      repository,
      openAiService,
      blogDraftUsageService,
      blogDraftContentService,
      blogDraftResponseBuilderService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('초안 생성 장소가 20개를 초과하면 BLOG400-1 예외를 던진다', async () => {
    try {
      await service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: Array.from({ length: 21 }, (_, index) => index + 1),
        tone: BlogDraftTone.RECORD,
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

  it('초안 생성 장소가 정확히 20개면 정상적으로 생성한다', async () => {
    const treeIds = Array.from({ length: 20 }, (_, index) => index + 1);
    const trees = treeIds.map((treeId) => ({
      id: BigInt(treeId),
      name: `장소 ${treeId}`,
      description: null,
      address: null,
      mood: '😍',
      defaultImage: 'DEFAULT_1',
      createdAt: new Date('2026-03-31T10:00:00.000Z'),
      images: [],
    }));
    const items = treeIds.map((treeId) => ({
      placeName: `장소 ${treeId}`,
      content: `장소 ${treeId}에서의 기록`,
    }));

    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);
    repository.findGenerateSource.mockResolvedValue({
      trees,
      timelines: [],
    });
    openAiService.generate.mockResolvedValue({
      title: '스무 곳을 둘러본 하루',
      items,
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    const result = await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds,
      tone: BlogDraftTone.RECORD,
    });

    expect(repository.findGenerateSource).toHaveBeenCalledWith(
      1,
      new Date('2026-03-30T15:00:00.000Z'),
      new Date('2026-04-01T15:00:00.000Z'),
      treeIds,
    );
    expect(openAiService.generate).toHaveBeenCalled();
    expect(repository.consumeUsageWithinLimit).toHaveBeenCalled();
    expect(result.title).toBe('스무 곳을 둘러본 하루');
    expect(result.days[0].items).toHaveLength(20);
  });

  it('무료 사용자의 월간 생성 한도를 초과하면 예외를 던진다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(10);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
        tone: BlogDraftTone.RECORD,
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('무료 플랜의 AI 블로그 사용량을 조회한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);

    const result = await service.getUsage(1);

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-06-30T15:00:00.000Z'),
      new Date('2026-07-31T15:00:00.000Z'),
    );
    expect(result).toEqual({
      plan: 'FREE',
      limit: 10,
      usedCount: 0,
      remainingCount: 10,
      periodStartAt: '2026-07-01T00:00:00',
      periodEndAt: '2026-08-01T00:00:00',
    });
  });

  it('FREE 구독 레코드가 있어도 KST 매월 1일 기준으로 사용량을 조회한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'FREE',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);

    const result = await service.getUsage(1);

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-06-30T15:00:00.000Z'),
      new Date('2026-07-31T15:00:00.000Z'),
    );
    expect(result).toEqual({
      plan: 'FREE',
      limit: 10,
      usedCount: 0,
      remainingCount: 10,
      periodStartAt: '2026-07-01T00:00:00',
      periodEndAt: '2026-08-01T00:00:00',
    });
  });

  it('알 수 없는 플랜 코드는 FREE 플랜으로 정규화해 사용량을 조회한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'UNKNOWN',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(0);

    const result = await service.getUsage(1);

    expect(result).toEqual({
      plan: 'FREE',
      limit: 10,
      usedCount: 0,
      remainingCount: 10,
      periodStartAt: '2026-07-01T00:00:00',
      periodEndAt: '2026-08-01T00:00:00',
    });
  });

  it('유료 플랜의 AI 블로그 사용량을 결제 기간 기준으로 조회한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-10T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'PLUS',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(2);

    const result = await service.getUsage(1);

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-07-09T15:00:00.000Z'),
      new Date('2026-08-09T15:00:00.000Z'),
    );
    expect(result).toEqual({
      plan: 'PLUS',
      limit: 50,
      usedCount: 2,
      remainingCount: 48,
      periodStartAt: '2026-07-10T00:00:00',
      periodEndAt: '2026-08-10T00:00:00',
    });
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
    repository.countGeneratedDraftsInRange.mockResolvedValue(50);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
        tone: BlogDraftTone.RECORD,
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
    repository.countGeneratedDraftsInRange.mockResolvedValue(200);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
        tone: BlogDraftTone.RECORD,
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
    repository.countGeneratedDraftsInRange.mockResolvedValue(500);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
        tone: BlogDraftTone.RECORD,
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('FREE 구독 플랜은 무료 사용자 한도로 처리한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: {
        startedAt: new Date('2026-07-10T00:00:00.000Z'),
        expiresAt: new Date('2026-08-26T00:00:00.000Z'),
        subscriptionPlan: {
          code: 'FREE',
        },
      },
    });
    repository.countGeneratedDraftsInRange.mockResolvedValue(10);

    await expect(
      service.generateDraft(1, {
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        treeIds: [1],
        tone: BlogDraftTone.RECORD,
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('무료 플랜은 KST 매월 1일 기준으로 사용량을 집계한다', async () => {
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
      items: [{ placeName: '포그레인 공원', content: '본문' }],
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
      tone: BlogDraftTone.RECORD,
    });

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-06-30T15:00:00.000Z'),
      new Date('2026-07-31T15:00:00.000Z'),
    );
  });

  it('유료 플랜은 KST 결제일 기준으로 사용량을 집계한다', async () => {
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
      items: [{ placeName: '포그레인 공원', content: '본문' }],
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
      tone: BlogDraftTone.RECORD,
    });

    expect(repository.countGeneratedDraftsInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-07-09T15:00:00.000Z'),
      new Date('2026-08-09T15:00:00.000Z'),
    );
  });

  it('초안 내용을 받아 저장용 블로그 초안을 생성한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countOwnedTreesByIds.mockResolvedValue(1);
    repository.createDraft.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: JSON.stringify([
        {
          date: '2026-03-31',
          items: [{ treeId: 1, placeName: '포그레인 공원', content: '본문' }],
        },
      ]),
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    const result = await service.saveDraft(1, {
      title: '제목',
      days: [
        {
          date: '2026-03-31',
          items: [
            {
              treeId: 1,
              imageUrl: null,
              placeName: '포그레인 공원',
              content: '본문',
            },
          ],
        },
      ],
      startDate: '2026-03-31',
      endDate: '2026-04-01',
    });

    expect(repository.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: JSON.stringify([
          {
            date: '2026-03-31',
            items: [{ treeId: 1, placeName: '포그레인 공원', content: '본문' }],
          },
        ]),
        startDate: new Date('2026-03-30T15:00:00.000Z'),
        endDate: new Date('2026-03-31T15:00:00.000Z'),
      }),
    );
    expect(result).toEqual({
      draftId: 1,
    });
  });

  it('초안 저장 시 중복 treeId는 한 번만 검증하고 item은 모두 저장한다', async () => {
    repository.findUserById.mockResolvedValue({
      id: 1n,
      status: 'ACTIVE',
      currentSubscription: null,
    });
    repository.countOwnedTreesByIds.mockResolvedValue(1);
    repository.createDraft.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: '[]',
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    await service.saveDraft(1, {
      title: '제목',
      days: [
        {
          date: '2026-03-31',
          items: [
            {
              treeId: 1,
              imageUrl: null,
              placeName: '포그레인 공원',
              content: '첫 번째 본문',
            },
            {
              treeId: 1,
              imageUrl: null,
              placeName: '포그레인 공원',
              content: '두 번째 본문',
            },
          ],
        },
      ],
      startDate: '2026-03-31',
      endDate: '2026-04-01',
    });

    expect(repository.countOwnedTreesByIds).toHaveBeenCalledWith(1, [1]);
    expect(repository.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: JSON.stringify([
          {
            date: '2026-03-31',
            items: [
              {
                treeId: 1,
                placeName: '포그레인 공원',
                content: '첫 번째 본문',
              },
              {
                treeId: 1,
                placeName: '포그레인 공원',
                content: '두 번째 본문',
              },
            ],
          },
        ]),
      }),
    );
  });

  it('초안 저장 시 날짜 그룹이 요청 기간 밖이면 BLOG400-1 예외를 던진다', async () => {
    try {
      await service.saveDraft(1, {
        title: '제목',
        days: [
          {
            date: '2025-01-01',
            items: [
              {
                treeId: 1,
                imageUrl: null,
                placeName: '포그레인 공원',
                content: '본문',
              },
            ],
          },
        ],
        startDate: '2026-03-31',
        endDate: '2026-04-01',
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
    expect(repository.countOwnedTreesByIds).not.toHaveBeenCalled();
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('초안 상세 조회 시 장소별 item에 treeId를 포함한다', async () => {
    repository.findDraftByIdAndUserId.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: JSON.stringify([
        {
          date: '2026-03-31',
          items: [{ treeId: 1, placeName: '포그레인 공원', content: '본문' }],
        },
      ]),
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });
    repository.findTreeImagesByIds.mockResolvedValue([
      {
        id: 1n,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        images: [{ s3Key: 'trees/1/a.jpg' }],
      },
    ]);
    s3Service.getPresignedUrl.mockResolvedValue('https://signed/trees/1/a.jpg');

    const result = await service.getDraft(1, 1);

    expect(repository.findDraftByIdAndUserId).toHaveBeenCalledWith(1, 1);
    expect(repository.findTreeImagesByIds).toHaveBeenCalledWith(1, [1]);
    expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('trees/1/a.jpg');
    expect(result.days).toEqual([
      {
        date: '2026-03-31',
        items: [
          {
            treeId: 1,
            imageUrl: 'https://signed/trees/1/a.jpg',
            placeName: '포그레인 공원',
            content: '본문',
          },
        ],
      },
    ]);
  });

  it('초안 상세 조회 시 빈 배열 content는 fallback 본문으로 노출하지 않는다', async () => {
    repository.findDraftByIdAndUserId.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: '[]',
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    const result = await service.getDraft(1, 1);

    expect(repository.findTreeImagesByIds).not.toHaveBeenCalled();
    expect(result.days).toEqual([
      {
        date: '2026-03-31',
        items: [],
      },
    ]);
  });

  it('초안 상세 조회 시 기존 flat content는 파싱하지 않는다', async () => {
    repository.findDraftByIdAndUserId.mockResolvedValue({
      id: 1n,
      userId: 1n,
      title: '제목',
      content: JSON.stringify([
        { treeId: 1, placeName: '포그레인 공원', content: '기존 본문' },
      ]),
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    const result = await service.getDraft(1, 1);

    expect(repository.findTreeImagesByIds).not.toHaveBeenCalled();
    expect(result.days).toEqual([
      {
        date: '2026-03-31',
        items: [],
      },
    ]);
  });

  it('초안 목록 조회 시 첫 번째 장소 대표 이미지를 thumbnailUrl로 포함한다', async () => {
    repository.findSavedDraftsByUserId.mockResolvedValue([
      {
        id: 1n,
        title: '제목',
        content: JSON.stringify([
          {
            date: '2026-03-31',
            items: [{ treeId: 1, placeName: '포그레인 공원', content: '본문' }],
          },
        ]),
        startDate: new Date('2026-03-31T00:00:00.000Z'),
        endDate: new Date('2026-04-01T00:00:00.000Z'),
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
      },
    ]);
    repository.findTreeImagesByIds.mockResolvedValue([
      {
        id: 1n,
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        images: [{ s3Key: 'trees/1/a.jpg' }],
      },
    ]);
    s3Service.getPresignedUrl.mockResolvedValue('https://signed/trees/1/a.jpg');

    const result = await service.getDrafts(1);

    expect(repository.findTreeImagesByIds).toHaveBeenCalledWith(1, [1]);
    expect(result.drafts).toEqual([
      {
        draftId: 1,
        title: '제목',
        thumbnailUrl: 'https://signed/trees/1/a.jpg',
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        createdAt: '2026-04-02T19:00:00',
      },
    ]);
  });

  it('저장할 제목이 비어 있으면 BLOG400-3 예외를 던진다', async () => {
    try {
      await service.saveDraft(1, {
        title: '   ',
        days: [
          {
            date: '2026-03-31',
            items: [
              {
                treeId: 1,
                imageUrl: null,
                placeName: '포그레인 공원',
                content: '본문',
              },
            ],
          },
        ],
        startDate: '2026-03-31',
        endDate: '2026-04-01',
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
        days: [
          {
            date: '2026-03-31',
            items: [
              {
                treeId: 1,
                imageUrl: null,
                placeName: '포그레인 공원',
                content: '   ',
              },
            ],
          },
        ],
        startDate: '2026-03-31',
        endDate: '2026-04-01',
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
      items: [
        {
          placeName: '포그레인 공원',
          content: '생성된 블로그 초안 내용입니다.',
        },
      ],
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    const result = await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1],
      tone: BlogDraftTone.RECORD,
    });

    expect(repository.findGenerateSource).toHaveBeenCalledWith(
      1,
      new Date('2026-03-30T15:00:00.000Z'),
      new Date('2026-04-01T15:00:00.000Z'),
      [1],
    );
    expect(repository.consumeUsageWithinLimit).toHaveBeenCalledWith(
      1n,
      new Date('2026-06-30T15:00:00.000Z'),
      new Date('2026-07-31T15:00:00.000Z'),
      1,
    );
    expect(result).toEqual({
      title: '[여행 기록] 3월 31일 ~ 4월 1일',
      days: [
        {
          date: '2026-03-31',
          items: [
            {
              treeId: 1,
              imageUrl: null,
              placeName: '포그레인 공원',
              content: '생성된 블로그 초안 내용입니다.',
            },
          ],
        },
      ],
      startDate: '2026-03-31',
      endDate: '2026-04-01',
    });
  });

  it('초안 생성 응답 item은 placeName을 우선해 나무 정보와 매핑한다', async () => {
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
        {
          id: 2n,
          name: '피자 맛집',
          description: null,
          address: null,
          mood: '😋',
          defaultImage: 'DEFAULT_1',
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          images: [],
        },
      ],
      timelines: [],
    });
    openAiService.generate.mockResolvedValue({
      title: '제목',
      items: [
        {
          placeName: '피자 맛집',
          content: '피자를 먹었음.',
        },
        {
          placeName: '포그레인 공원',
          content: '공원을 걸었음.',
        },
      ],
    });
    repository.consumeUsageWithinLimit.mockResolvedValue();

    const result = await service.generateDraft(1, {
      startDate: '2026-03-31',
      endDate: '2026-04-01',
      treeIds: [1, 2],
      tone: BlogDraftTone.RECORD,
    });

    expect(result.days).toEqual([
      {
        date: '2026-03-31',
        items: [
          {
            treeId: 1,
            imageUrl: null,
            placeName: '포그레인 공원',
            content: '공원을 걸었음.',
          },
        ],
      },
      {
        date: '2026-04-01',
        items: [
          {
            treeId: 2,
            imageUrl: null,
            placeName: '피자 맛집',
            content: '피자를 먹었음.',
          },
        ],
      },
    ]);
  });
});
