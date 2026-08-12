import { Prisma } from '@prisma/client';
import { TreesRepository } from './trees.repository';
import { TreesService } from './trees.service';

describe('TreesService.getNearbyTrees', () => {
  it('근처 나무를 거리 응답으로 변환한다', async () => {
    const repository = {
      findNearbyTrees: jest.fn().mockResolvedValue([
        {
          id: 1n,
          name: '우리 동네 벚나무',
          latitude: new Prisma.Decimal(37.5665),
          longitude: new Prisma.Decimal(126.978),
          mood: 'HAPPY',
          defaultImage: 'DEFAULT_1',
          distanceM: 41.6,
        },
      ]),
    } as unknown as jest.Mocked<TreesRepository>;
    const service = new TreesService(repository);

    const result = await service.getNearbyTrees(10, {
      lat: 37.5665,
      lng: 126.978,
    });

    expect(repository.findNearbyTrees).toHaveBeenCalledWith(
      10,
      37.5665,
      126.978,
      100,
    );
    expect(result).toEqual([
      expect.objectContaining({ treeId: 1, distanceM: 42 }),
    ]);
  });
});
