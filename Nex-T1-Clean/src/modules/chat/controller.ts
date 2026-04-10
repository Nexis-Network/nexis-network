import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { getErrorMessage } from "@/lib/utils/error";
import { SecurityViolationError } from "@/server/services/superagent/types";

import { createErrorResponse } from "./controller/error-responses";
import { prepareChatStreamRequest } from "./controller/request-preparation";
import { parseChatUIRequest } from "./controller/request-parser";
import { executeChatStream } from "./controller/stream-execution";

export type ChatControllerStreamParams = {
  request: Request;
  cookies: ReadonlyRequestCookies;
};

export class ChatController {
  async streamResponse({
    request,
    cookies,
  }: ChatControllerStreamParams): Promise<Response> {
    const parsedUiRequest = await parseChatUIRequest(request);
    if (!parsedUiRequest.ok) {
      return createErrorResponse(400, parsedUiRequest.error);
    }

    const preparedRequest = await prepareChatStreamRequest({
      cookies,
      parsedUiRequest: parsedUiRequest.value,
      request,
    });
    if (preparedRequest instanceof Response) {
      return preparedRequest;
    }

    try {
      return await executeChatStream(preparedRequest);
    } catch (error) {
      if (error instanceof SecurityViolationError) {
        return createErrorResponse(
          422,
          "Your request was blocked due to security concerns.",
        );
      }

      return createErrorResponse(
        500,
        getErrorMessage(error, "chat_stream_failed"),
      );
    }
  }
}

export const chatController = new ChatController();
