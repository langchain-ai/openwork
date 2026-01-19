import {
  ChatOpenAICompletions,
  completionsApiContentBlockConverter,
  convertStandardContentMessageToCompletionsMessage,
  messageToOpenAIRole
} from '@langchain/openai'
import {
  AIMessage,
  BaseMessage,
  ToolMessage,
  convertToProviderContentBlock,
  isDataContentBlock
} from '@langchain/core/messages'
import { convertLangChainToolCallToOpenAI } from '@langchain/core/output_parsers/openai_tools'
import type OpenAI from 'openai'

type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam

function convertMessagesToCompletionsMessageParamsWithReasoning({
  messages
}: {
  messages: BaseMessage[]
}): ChatCompletionMessageParam[] {
  return messages.flatMap((message) => {
    if (
      'response_metadata' in message &&
      message.response_metadata &&
      'output_version' in message.response_metadata &&
      message.response_metadata.output_version === 'v1'
    ) {
      return convertStandardContentMessageToCompletionsMessage({
        message: message as Parameters<typeof convertStandardContentMessageToCompletionsMessage>[0]['message']
      })
    }

    let role = messageToOpenAIRole(message as Parameters<typeof messageToOpenAIRole>[0])
    const rawContent = (message as AIMessage).content
    const content = Array.isArray(rawContent)
      ? rawContent.map((block) => {
          if (isDataContentBlock(block)) {
            return convertToProviderContentBlock(block, completionsApiContentBlockConverter)
          }
          return block
        })
      : rawContent

    const completionParam: Record<string, unknown> = { role, content }

    if ('name' in message && message.name != null) completionParam.name = message.name

    if (
      'additional_kwargs' in message &&
      message.additional_kwargs &&
      'function_call' in message.additional_kwargs &&
      message.additional_kwargs.function_call != null
    ) {
      completionParam.function_call = message.additional_kwargs.function_call
    }

    if (AIMessage.isInstance(message) && message.tool_calls?.length) {
      completionParam.tool_calls = message.tool_calls.map(convertLangChainToolCallToOpenAI)
    } else {
      if (
        'additional_kwargs' in message &&
        message.additional_kwargs &&
        'tool_calls' in message.additional_kwargs &&
        message.additional_kwargs.tool_calls != null
      ) {
        completionParam.tool_calls = message.additional_kwargs.tool_calls
      }
      if (ToolMessage.isInstance(message) && message.tool_call_id != null) {
        completionParam.tool_call_id = message.tool_call_id
      }
    }

    const reasoningContent =
      'additional_kwargs' in message ? (message.additional_kwargs?.reasoning_content as unknown) : undefined
    if (reasoningContent !== undefined) {
      completionParam.reasoning_content = reasoningContent
    }

    if (
      'additional_kwargs' in message &&
      message.additional_kwargs &&
      message.additional_kwargs.audio &&
      typeof message.additional_kwargs.audio === 'object' &&
      'id' in message.additional_kwargs.audio
    ) {
      const audioMessage = {
        role: 'assistant' as const,
        audio: { id: String(message.additional_kwargs.audio.id) }
      }
      return [
        completionParam as unknown as ChatCompletionMessageParam,
        audioMessage as unknown as ChatCompletionMessageParam
      ]
    }

    return completionParam as unknown as ChatCompletionMessageParam
  })
}

export class DeepSeekChatOpenAI extends ChatOpenAICompletions {
  protected _convertCompletionsMessageToBaseMessage(
    message: OpenAI.Chat.Completions.ChatCompletionMessage,
    rawResponse: OpenAI.Chat.Completions.ChatCompletion
  ) {
    const baseMessage = super._convertCompletionsMessageToBaseMessage(message, rawResponse)
    const reasoningContent = (message as { reasoning_content?: unknown }).reasoning_content
    if (AIMessage.isInstance(baseMessage) && reasoningContent != null) {
      baseMessage.additional_kwargs = {
        ...baseMessage.additional_kwargs,
        reasoning_content: reasoningContent
      }
    }
    return baseMessage
  }

  public async _generate(
    messages: Parameters<ChatOpenAICompletions['_generate']>[0],
    options: Parameters<ChatOpenAICompletions['_generate']>[1],
    _runManager: Parameters<ChatOpenAICompletions['_generate']>[2]
  ) {
    const usageMetadata: Record<string, number | undefined> = {}
    const params = this.invocationParams(options)

    if (params.stream) {
      throw new Error('DeepSeek streaming is disabled to preserve reasoning_content.')
    }

    const messagesMapped = convertMessagesToCompletionsMessageParamsWithReasoning({ messages })

    const data = await this.completionWithRetry(
      {
        ...params,
        stream: false,
        messages: messagesMapped
      },
      {
        signal: options?.signal,
        ...options?.options
      }
    )

    const usage = data?.usage
    if (usage?.completion_tokens) usageMetadata.output_tokens = usage.completion_tokens
    if (usage?.prompt_tokens) usageMetadata.input_tokens = usage.prompt_tokens
    if (usage?.total_tokens) usageMetadata.total_tokens = usage.total_tokens

    const generations: Array<{
      text: string
      message: AIMessage
      generationInfo?: Record<string, unknown>
    }> = []
    for (const part of data?.choices ?? []) {
      const text = part.message?.content ?? ''
      const generation: {
        text: string
        message: AIMessage
        generationInfo?: Record<string, unknown>
      } = {
        text,
        message: this._convertCompletionsMessageToBaseMessage(
          part.message ?? { role: 'assistant' },
          data
        ) as AIMessage
      }
      generation.generationInfo = {
        ...(part.finish_reason ? { finish_reason: part.finish_reason } : {}),
        ...(part.logprobs ? { logprobs: part.logprobs } : {})
      }
      if (AIMessage.isInstance(generation.message)) {
        generation.message.usage_metadata = usageMetadata as unknown as AIMessage['usage_metadata']
      }
      generation.message = new AIMessage(
        Object.fromEntries(Object.entries(generation.message).filter(([key]) => !key.startsWith('lc_')))
      )
      generations.push(generation)
    }

    return {
      generations,
      llmOutput: {
        tokenUsage: {
          promptTokens: usageMetadata.input_tokens,
          completionTokens: usageMetadata.output_tokens,
          totalTokens: usageMetadata.total_tokens
        }
      }
    }
  }
}
