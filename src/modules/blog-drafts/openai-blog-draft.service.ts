import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code';
import { S3Service } from '../../common/s3/s3.service';
import {
  BLOG_DRAFT_MAX_IMAGE_COUNT,
  BLOG_DRAFT_MODEL,
} from './blog-drafts.constant';
import {
  BlogDraftGenerateSource,
  BlogDraftImagePart,
  BlogDraftSourceImageForPrompt,
  OpenAiGeneratedDraft,
} from './blog-drafts.types';
import { BlogDraftTone } from './dto/generate-blog-draft-request.dto';

type OpenAiResponseOutputText = {
  type: 'output_text';
  text: string;
};

type OpenAiResponseContent = OpenAiResponseOutputText | { type: string };

type OpenAiResponseItem = {
  type: string;
  content?: OpenAiResponseContent[];
};

type OpenAiResponsesApiResponse = {
  output?: OpenAiResponseItem[];
};

const OPENAI_REQUEST_TIMEOUT_MS = 20_000;
const BLOG_DRAFT_TITLE_MAX_LENGTH = 50;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

@Injectable()
export class OpenAiBlogDraftService {
  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  generate = async (
    source: BlogDraftGenerateSource,
    startDate: string,
    endDate: string,
    tone: BlogDraftTone,
  ): Promise<OpenAiGeneratedDraft> => {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new AppException(ErrorCode.BLOG_DRAFT_OPENAI_CONFIG_MISSING);
    }

    const sourceImages = await this.toPromptImages(source);
    const response = await this.requestOpenAi(apiKey, {
      model: this.configService.get<string>('OPENAI_MODEL') ?? BLOG_DRAFT_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                '너는 여행/장소 기록을 바탕으로 한국어 블로그 초안을 작성하는 도우미다.',
                '응답은 반드시 유효한 JSON 객체 하나만 반환한다.',
                '형식: {"title":"문자열","items":[{"placeName":"장소명","content":"장소별 본문"}]}',
                'JSON 외의 설명, 인사말, 마크다운, 코드블록, 주석은 절대 포함하지 않는다.',
                '최상위 필드는 title, items만 허용한다.',
                'items는 장소별 블로그 초안 본문 배열로 작성한다.',
                '각 item은 placeName과 content를 반드시 포함한다.',
                '각 item의 필드는 placeName, content만 허용한다.',
                'title, placeName, content는 빈 문자열이면 안 된다.',
                '한국인이 직접 쓴 여행 블로그처럼, 정보 나열보다 경험을 이야기하듯 작성한다.',
                '이 글은 AI가 작성한 안내문이 아니라, 실제 20대 한국인이 하루를 기록한 개인 블로그처럼 작성한다.',
                '너무 완벽하게 정리된 문장보다, 약간의 여운이 있는 자연스러운 문장을 선호한다.',
                '단, 사용자가 선택한 어체의 문장 종결 규칙은 반드시 지킨다.',
                'AI가 작성한 것처럼 모든 문장을 지나치게 매끄럽고 비슷한 길이로 쓰지 않는다.',
                '장소의 mood 값은 사용자가 직접 남긴 감정 이모지다. 이 이모지를 자연스러운 감정 표현의 단서로만 활용한다.',
                '사진이 있다면 사진 속 장면을 단정하지 말고, 장소/기록 문맥을 바탕으로 자연스럽게 서술한다.',
                '각 장소 이미지는 장소당 1장만 제공될 수 있다. 이미지가 없어도 다른 장소/기록 정보만으로 자연스럽게 작성한다.',
                '광고성 문구, 과도한 꾸밈말, 해시태그, 마크다운 코드블록은 금지한다.',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: this.buildPromptText(
                source,
                sourceImages,
                startDate,
                endDate,
                tone,
              ),
            },
            ...sourceImages.map<BlogDraftImagePart>((image) => ({
              type: 'input_image',
              image_url: image.imageUrl,
            })),
          ],
        },
      ],
    });

    const outputText = this.extractOutputText(response);

    return this.parseGeneratedDraft(outputText);
  };

  private requestOpenAi = async (
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<OpenAiResponsesApiResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      OPENAI_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new AppException(ErrorCode.BLOG_DRAFT_GENERATION_FAILED);
      }

      return (await response.json()) as OpenAiResponsesApiResponse;
    } catch {
      throw new AppException(ErrorCode.BLOG_DRAFT_GENERATION_FAILED);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  private extractOutputText = (
    response: OpenAiResponsesApiResponse,
  ): string => {
    const content = response.output
      ?.flatMap((item) => item.content ?? [])
      .filter(
        (item): item is OpenAiResponseOutputText => item.type === 'output_text',
      )
      .map((item) => item.text)
      .join('\n')
      .trim();

    if (!content) {
      throw new AppException(ErrorCode.BLOG_DRAFT_GENERATION_FAILED);
    }

    return content;
  };

  private parseGeneratedDraft = (text: string): OpenAiGeneratedDraft => {
    const jsonText = this.extractJsonText(text);

    try {
      const parsed = JSON.parse(jsonText) as Partial<OpenAiGeneratedDraft>;
      const items = this.normalizeGeneratedItems(parsed.items);

      if (
        typeof parsed.title !== 'string' ||
        !parsed.title.trim() ||
        items.length === 0
      ) {
        throw new Error('invalid response');
      }

      return {
        title: this.normalizeTitle(parsed.title),
        items,
      };
    } catch {
      throw new AppException(ErrorCode.BLOG_DRAFT_GENERATION_FAILED);
    }
  };

  private normalizeGeneratedItems = (
    items: OpenAiGeneratedDraft['items'] | undefined,
  ): OpenAiGeneratedDraft['items'] => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => {
        if (
          typeof item?.placeName !== 'string' ||
          typeof item?.content !== 'string'
        ) {
          return null;
        }

        const placeName = item.placeName.trim();
        const content = item.content.trim();

        if (!placeName || !content) {
          return null;
        }

        return { placeName, content };
      })
      .filter((item): item is OpenAiGeneratedDraft['items'][number] => {
        return item !== null;
      });
  };

  private normalizeTitle = (title: string): string => {
    return title.trim().slice(0, BLOG_DRAFT_TITLE_MAX_LENGTH);
  };

  private extractJsonText = (text: string): string => {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);

    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      return text.slice(startIndex, endIndex + 1);
    }

    return text;
  };

  private buildPromptText = (
    source: BlogDraftGenerateSource,
    images: BlogDraftSourceImageForPrompt[],
    startDate: string,
    endDate: string,
    tone: BlogDraftTone,
  ): string => {
    return [
      `작성 대상 기간: ${startDate} ~ ${endDate}`,
      '',
      this.buildTreeSection(source),
      '',
      this.buildTimelineSection(source),
      '',
      this.buildImageSection(images),
      '',
      this.buildToneSection(tone),
      '',
      '요구사항:',
      this.buildTitleInstruction(),
      this.buildContentInstruction(),
      this.buildConstraintInstruction(),
    ].join('\n');
  };

  private buildTreeSection = (source: BlogDraftGenerateSource): string => {
    const treeLines = source.trees.map((tree, index) => {
      return [
        `${index + 1}. 장소명: ${tree.name}`,
        `- 생성일: ${this.formatDate(tree.createdAt)}`,
        tree.description ? `- 메모: ${tree.description}` : null,
        tree.address ? `- 주소: ${tree.address}` : null,
        `- 감정 이모지: ${tree.mood}`,
        `- 장소 이미지 제공 여부: ${tree.images.length > 0 ? '있음' : '없음'}`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n');
    });

    return [
      '장소 데이터:',
      treeLines.length > 0 ? treeLines.join('\n\n') : '- 없음',
    ].join('\n');
  };

  private buildTimelineSection = (source: BlogDraftGenerateSource): string => {
    const timelineLines = source.timelines.map((timeline, index) =>
      [
        `${index + 1}. 제목: ${timeline.title}`,
        `- 방문시각: ${this.formatDateTime(timeline.visitedAt)}`,
        `- 카테고리: ${timeline.category}`,
        timeline.tree ? `- 관련 장소: ${timeline.tree.name}` : null,
        timeline.content ? `- 내용: ${timeline.content}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );

    return [
      '기록 데이터:',
      timelineLines.length > 0 ? timelineLines.join('\n\n') : '- 없음',
    ].join('\n');
  };

  private buildImageSection = (
    images: BlogDraftSourceImageForPrompt[],
  ): string => {
    const imageLines = images.map(
      (image, index) => `${index + 1}. ${image.caption}`,
    );

    return [
      '사진 요약:',
      imageLines.length > 0 ? imageLines.join('\n') : '- 없음',
    ].join('\n');
  };

  private buildToneSection = (tone: BlogDraftTone): string => {
    return [
      '선택한 어체:',
      this.getToneInstruction(tone),
      '- 위 선택 어체의 문장 종결 규칙은 본문 전체에서 최우선으로 적용한다.',
      '- 문장부호, 감탄사, ㅋㅋ, ㅎㅎ 사용 여부는 선택 어체 규칙을 따른다.',
    ].join('\n');
  };

  private buildTitleInstruction = (): string => {
    return [
      '- 제목은 내용을 요약하는 문장이 아니라 실제 한국인이 블로그에 붙일 법한 제목으로 작성한다.',
      '- 제목은 완성된 문장이 아니라 짧은 어구나 명사구 형태로 작성한다.',
      '- 제목은 "~했다", "~했음", "~했어요", "~이다"처럼 서술형 문장으로 끝내지 않는다.',
      '- 제목에는 날짜, 장소, 함께한 사람, 핵심 추억 등을 자연스럽게 활용할 수 있다.',
      '- 제목에서 모든 장소를 나열하거나 하루 전체를 요약하려고 하지 않는다.',
      '- 제목은 10~25자 정도를 권장한다.',
      '- 제목에는 필요하다면 ㅎㅎ, !, ~ 정도를 자연스럽게 사용할 수 있다. 이모지는 사용하지 않는다.',
      '- 좋은 제목 예시: 수빈이랑 서울 데이트 / 오랜만에 수빈이랑 힐링! / 오늘도 추억 하나 추가 :) / 귀여운 것만 잔뜩 보고 온 하루 / 수빈이랑 하루종일 힐링한 날',
    ].join('\n');
  };

  private buildContentInstruction = (): string => {
    return [
      '- 본문은 한국인이 실제 네이버 블로그나 개인 블로그에 남긴 여행 후기처럼 작성한다.',
      '- 정보 나열이 아니라 실제 사람이 하루를 회상하며 적는 느낌을 유지한다.',
      '- items 배열은 장소 데이터의 각 장소마다 정확히 하나의 item으로 작성한다.',
      '- items 배열의 순서는 장소 데이터의 순서와 반드시 일치해야 한다.',
      '- items 개수는 장소 데이터 개수와 반드시 일치해야 하며, 장소 데이터에 없는 장소를 새로 만들지 않는다.',
      '- 각 item은 placeName과 content 필드만 가진다.',
      '- 각 item의 placeName은 장소 데이터의 장소명을 글자 그대로 사용한다.',
      '- 각 item의 content에는 장소 번호나 장소명을 다시 쓰지 않고, 해당 장소 설명만 작성한다.',
      '- 각 item의 content는 빈 문자열이면 안 된다.',
      '- 관련 장소가 있는 기록 데이터는 해당 장소 item의 content에 자연스럽게 반영한다.',
      '- 관련 장소가 없는 기록 데이터는 가장 자연스럽게 연결되는 장소 item에 보조 정보로만 반영한다.',
      '- 각 item.content는 가능하면 "어디를 갔는지 → 그곳에서 무엇을 했는지 → 그래서 어떤 기분이나 기억이 남았는지"의 흐름이 보이도록 작성한다.',
      '- 단, 제공된 데이터에 특정 단계의 정보가 없으면 억지로 지어내지 말고 자연스럽게 생략한다.',
      '- 장소 메모, 기록 데이터, 이미지 정보 중 실제로 제공된 단서만 사용해 장소별 경험을 구성한다.',
      '- 장소별 감정 이모지는 감정선과 분위기를 파악하는 힌트로만 사용한다.',
      '- 입력된 감정 이모지를 item.content에 그대로 복사하지 않는다.',
      '- 감정 이모지를 장소 설명의 주제처럼 직접 설명하지 않는다.',
      '- 문장 길이는 자연스럽게 조절하되, 문장 종결 방식은 선택한 어체 규칙을 따른다.',
      '- "특히", "또한", "한편", "무엇보다" 같은 연결어를 반복해서 사용하지 않는다.',
      '- 약간의 여운이나 담백한 표현을 사용할 수 있다.',
      '- 각 item.content는 너무 짧은 요약이 아니라 2~4문장 정도의 자연스러운 장소별 후기처럼 작성한다.',
      '- 제공된 장소 메모와 기록 데이터를 바탕으로, 사용자가 실제로 느꼈을 법한 감정이나 여운은 자연스럽게 확장해도 된다.',
      '- 단, 새로운 사건, 동행자, 구매 물품, 음식, 장소처럼 사실 정보는 새로 만들지 않는다.',
      '- 장소별 경험이 단순 요약처럼 보이지 않도록, 행동 이후의 감정이나 기억을 한 문장 이상 덧붙인다.',
    ].join('\n');
  };

  private buildConstraintInstruction = (): string => {
    return [
      '- 광고성 문구나 홍보 문구처럼 보이는 표현은 사용하지 않는다.',
      '- 제공된 장소 이미지는 장소당 1장이므로, 장소 메모와 기록 데이터를 보조하는 단서로만 사용한다.',
      '- 사진 속 내용을 확신하듯 단정하지 않는다.',
      '- 장소 이미지 제공 여부가 "없음"인 장소에서는 사진이나 이미지에 대해 언급하지 않는다.',
      '- 이미지 정보가 장소 메모나 기록 데이터보다 우선하지 않도록 한다.',
      '- 제공된 정보만 바탕으로 작성하고, 확인되지 않은 사실은 절대 단정하지 않는다.',
    ].join('\n');
  };

  private getToneInstruction = (tone: BlogDraftTone): string => {
    switch (tone) {
      case BlogDraftTone.CALM:
        return [
          '- 차분한 "~했다"체로 작성한다.',
          '- 모든 문장은 원칙적으로 "~했다", "~였다", "~하였다", "~되었다"처럼 다체로 끝낸다.',
          '- "~했음", "~했어요", "~야지", "~다!" 같은 다른 어체의 종결은 사용하지 않는다.',
          '- ㅋㅋ, ㅎㅎ, 과한 감탄사, 과한 문장부호는 사용하지 않는다.',
          '- 입력된 mood와 유사한 이모지나 감탄 표현도 사용하지 않는다.',
          '- 문장을 정돈된 회고처럼 마무리하되, 지나치게 딱딱한 보고서 문체는 피한다.',
          '- 예시: "해 질 무렵 골목을 걸으며 하루를 정리하였다."',
        ].join('\n');
      case BlogDraftTone.SIMPLE:
        return [
          '- 담백한 "~했어요"체로 작성한다.',
          '- 모든 문장은 원칙적으로 "~했어요", "~였어요", "~좋았어요", "~같았어요"처럼 요체로 끝낸다.',
          '- "~했음", "~했다", "~야지", "~다!" 같은 다른 어체의 종결은 사용하지 않는다.',
          '- ㅋㅋ, ㅎㅎ, 과한 감탄사, 과한 문장부호는 사용하지 않는다.',
          '- 입력된 mood와 유사한 이모지나 감탄 표현도 사용하지 않는다.',
          '- 과한 감정 표현이나 꾸밈말은 줄이고, 방문한 장소와 느낀 점을 편안하게 정리한다.',
          '- 예시: "저녁에 골목을 걸었어요. 조용하고 좋았어요."',
        ].join('\n');
      case BlogDraftTone.WITTY:
        return [
          '- SNS에 편하게 기록하듯 유쾌한 문체로 작성한다.',
          '- 사람에게 직접 말을 거는 "~했어"체가 아니라, "~했음"체와 "~했다"체를 자연스럽게 섞어 쓴다.',
          '- 감탄사나 문장부호(!, ~, …), ㅋㅋ, ㅎㅎ 같은 표현을 자연스럽게 붙여 생동감 있게 쓴다.',
          '- !!!, ~~~, ㅎㅎㅎ처럼 과한 반복 표현은 사용하지 않는다.',
          '- "와", "미쳤다", "졸귀", "짱" 같은 가벼운 감탄 표현은 상황에 맞으면 사용할 수 있다.',
          '- 입력된 mood 이모지는 그대로 복사하지 않되, 분위기가 맞으면 유사한 감탄 표현으로 바꿔서 사용할 수 있다.',
          '- 예시: "와 이 골목 미쳤다! 노을 보면서 걷는데 분위기 짱 좋았음 ㅋㅋ"',
        ].join('\n');
      case BlogDraftTone.RECORD:
      default:
        return [
          '- 기록 중심의 "~했음"체로 작성한다.',
          '- 모든 문장은 원칙적으로 "~했음", "~였음", "~좋았음", "~같았음"처럼 음체로 끝낸다.',
          '- "~했어요", "~했다", "~야지", "~다!" 같은 다른 어체의 종결은 사용하지 않는다.',
          '- ㅋㅋ, ㅎㅎ, 과한 감탄사, 과한 문장부호는 사용하지 않는다.',
          '- 입력된 mood와 유사한 이모지나 감탄 표현도 사용하지 않는다.',
          '- 어디를 갔고, 무엇을 했고, 어떤 기억이 남았는지의 흐름이 잘 보이게 쓴다.',
          '- 예시: "해 질 무렵 골목을 걸었음. 조용해서 산책하기 좋았음."',
        ].join('\n');
    }
  };

  private toPromptImages = async (
    source: BlogDraftGenerateSource,
  ): Promise<BlogDraftSourceImageForPrompt[]> => {
    const images = source.trees.flatMap((tree) =>
      tree.images.map((image) => ({
        s3Key: image.s3Key,
        caption: `${tree.name} 장소 이미지`,
      })),
    );

    const selected = images.slice(0, BLOG_DRAFT_MAX_IMAGE_COUNT);

    return Promise.all(
      selected.map(async (image) => ({
        imageUrl: await this.s3Service.getPresignedUrl(image.s3Key),
        caption: image.caption,
      })),
    );
  };

  private formatDate = (date: Date): string => {
    const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

    return kstDate.toISOString().slice(0, 10);
  };

  private formatDateTime = (date: Date): string => {
    const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

    return kstDate.toISOString().slice(0, 19);
  };
}
