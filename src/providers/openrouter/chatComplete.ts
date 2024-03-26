import { OPENROUTER } from "../../globals";

import {
  ChatCompletionResponse,
  ErrorResponse,
  ProviderConfig,
} from "../types";

export const OpenrouterChatCompleteConfig: ProviderConfig = {
  model: {
    param: "model",
    required: true,
    default: "openrouter/auto",
  },
  messages: {
    param: "messages",
    default: "",
  },
  max_tokens: {
    param: "max_tokens",
    default: 100,
    min: 0,
  },
  temperature: {
    param: "temperature",
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: "top_p",
    default: 1,
    min: 0,
    max: 1,
  },
  stream: {
    param: "stream",
    default: false,
  },
};

export interface OpenrouterChatCompleteResponse
  extends ChatCompletionResponse {}

export interface OpenrouterErrorResponse extends ErrorResponse {}

export interface OpenrouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

export const OpenrouterChatCompleteResponseTransform: (
  response: OpenrouterChatCompleteResponse | OpenrouterErrorResponse,
  responseStatus: number,
) => ChatCompletionResponse | ErrorResponse = (response, responseStatus) => {
  if ("error" in response && responseStatus !== 200) {
    return {
      error: {
        message: response.error.message,
        type: response.error.type,
        param: null,
        code: response.error.code?.toString() || null,
      },
      provider: OPENROUTER,
    } as ErrorResponse;
  }

  if ("choices" in response) {
    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      provider: OPENROUTER,
      choices: response.choices.map((c) => ({
        index: c.index,
        message: c.message,
        finish_reason: c.finish_reason,
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }

  return {
    error: {
      message: `Invalid response recieved from ${OPENROUTER}: ${JSON.stringify(
        response,
      )}`,
      type: null,
      param: null,
      code: null,
    },
    provider: OPENROUTER,
  } as ErrorResponse;
};

export const OpenrouterChatCompleteStreamChunkTransform: (
  response: string,
) => string = (responseChunk) => {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, "");
  chunk = chunk.trim();
  if (chunk === "[DONE]") {
    return `data: ${chunk}\n\n`;
  }

  const parsedChunk: OpenrouterStreamChunk = JSON.parse(chunk);
  return `data: ${JSON.stringify({
    id: parsedChunk.id,
    object: parsedChunk.object,
    created: parsedChunk.created,
    model: parsedChunk.model,
    provider: OPENROUTER,
    choices: [
      {
        index: parsedChunk.choices[0].index || 0,
        delta: {
          role: "assistant",
          content: parsedChunk.choices[0].delta.content,
        },
        finish_reason: parsedChunk.choices[0].finish_reason || null,
      },
    ],
  })}\n\n`;
};
