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
                '응답은 반드시 JSON 하나만 반환한다.',
                '형식: {"title":"문자열","content":"문자열"}',
                'content는 읽기 쉬운 블로그 초안 본문으로 작성한다.',
                '장소의 mood 값은 사용자가 직접 남긴 감정 이모지다. 이 이모지를 자연스러운 감정 표현의 단서로만 활용한다.',
                '사진이 있다면 사진 속 장면을 단정하지 말고, 장소/기록 문맥을 바탕으로 자연스럽게 서술한다.',
                '각 장소 이미지는 장소당 1장만 제공될 수 있다. 이미지가 없어도 다른 장소/기록 정보만으로 자연스럽게 작성한다.',
                '과도한 꾸밈말, 해시태그, 마크다운 코드블록은 금지한다.',
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

    return this.parseGeneratedDraft(outputText, startDate, endDate);
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

  private parseGeneratedDraft = (
    text: string,
    startDate: string,
    endDate: string,
  ): OpenAiGeneratedDraft => {
    const jsonText = this.extractJsonText(text);

    try {
      const parsed = JSON.parse(jsonText) as Partial<OpenAiGeneratedDraft>;

      if (
        typeof parsed.title !== 'string' ||
        !parsed.title.trim() ||
        typeof parsed.content !== 'string' ||
        !parsed.content.trim()
      ) {
        throw new Error('invalid response');
      }

      return {
        title: this.normalizeTitle(parsed.title),
        content: parsed.content.trim(),
      };
    } catch {
      return {
        title: this.normalizeTitle(`[여행기록] ${startDate} ~ ${endDate}`),
        content: text.trim(),
      };
    }
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
  ): string => {
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

    const timelineLines = source.timelines.map((timeline, index) =>
      [
        `${index + 1}. 제목: ${timeline.title}`,
        `- 방문시각: ${timeline.visitedAt.toISOString()}`,
        `- 카테고리: ${timeline.category}`,
        timeline.tree ? `- 관련 장소: ${timeline.tree.name}` : null,
        timeline.content ? `- 내용: ${timeline.content}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );

    const imageLines = images.map(
      (image, index) => `${index + 1}. ${image.caption}`,
    );

    return [
      `작성 대상 기간: ${startDate} ~ ${endDate}`,
      '',
      '장소 데이터:',
      treeLines.length > 0 ? treeLines.join('\n\n') : '- 없음',
      '',
      '기록 데이터:',
      timelineLines.length > 0 ? timelineLines.join('\n\n') : '- 없음',
      '',
      '사진 요약:',
      imageLines.length > 0 ? imageLines.join('\n') : '- 없음',
      '',
      '요구사항:',
      '- 제목은 기간이 드러나는 자연스러운 한국어 제목으로 작성한다.',
      '- 본문은 여행 후기/기록 형태로 작성한다.',
      '- 장소가 여러 개면 소제목 또는 번호를 사용해 구분한다.',
      '- 장소별 감정 이모지는 분위기와 감정선을 보조하는 힌트로만 반영하고, 이모지 이름을 그대로 노출하지 않는다.',
      '- 제공된 장소 이미지는 장소당 1장일 수 있으므로, 사진이 적더라도 나머지 장소/기록 정보와 함께 균형 있게 서술한다.',
      '- 제공된 정보만 바탕으로 작성하고, 확인되지 않은 사실은 단정하지 않는다.',
    ].join('\n');
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
    return date.toISOString().slice(0, 10);
  };
}
