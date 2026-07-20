import OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { OPENAI_REQUEST_OPTIONS, OpenAIProvider } from "@/lib/ai/openai-provider";
import type { NewTestInput } from "@/lib/schemas";

const input: NewTestInput = {
  stagingUrl: "https://staging.example.com/demo",
  allowedHostname: "staging.example.com",
  userStory: "As a guest shopper, I can see the full price before payment.",
  acceptanceCriteria: "Given an item in my basket, delivery and total are visible on review.",
  startingInstructions: "Stop on review.",
};

afterEach(() => vi.restoreAllMocks());

describe("OpenAI Responses adapter", () => {
  it("passes bounded request options as the second SDK argument", async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(demoPlan), output: [], id: "response", usage: { input_tokens: 12, input_tokens_details: { cached_tokens: 4 }, output_tokens: 5, total_tokens: 17 } });
    const client = { responses: { create } } as unknown as OpenAI;

    const result = await new OpenAIProvider(client).plan(input, 0);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: expect.any(String), text: expect.any(Object) }),
      OPENAI_REQUEST_OPTIONS,
    );
    expect(create.mock.calls[0][0].instructions).toContain("The executor loads stagingUrl before step 1");
    expect(create.mock.calls[0][0]).not.toHaveProperty("timeout");
    expect(create.mock.calls[0][0]).not.toHaveProperty("maxRetries");
    expect(result.usage).toEqual({ inputTokens: 12, cachedInputTokens: 4, outputTokens: 5, totalTokens: 17 });
  });

  it("keeps the computer continuation in the Responses API call shape", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "response-2",
      output_text: "Continue editing the field.",
      output: [{
        id: "item-1",
        type: "computer_call",
        call_id: "call-2",
        status: "completed",
        pending_safety_checks: [],
        actions: [{ type: "keypress", keys: ["CTRL", "A"] }],
      }],
      usage: { input_tokens: 20, input_tokens_details: { cached_tokens: 8 }, output_tokens: 3, total_tokens: 23 },
    });
    const client = { responses: { create } } as unknown as OpenAI;

    const turn = await new OpenAIProvider(client).computer({
      step: demoPlan.steps[0],
      approvedHostname: "staging.example.com",
      screenshotDataUrl: "data:image/png;base64,AA==",
      previousResponseId: "response-1",
      previousCallId: "call-1",
    });

    expect(turn.actions).toEqual([{ type: "keypress", keys: ["CTRL", "A"] }]);
    expect(turn.usage.cachedInputTokens).toBe(8);
    expect(create.mock.calls[0][0].instructions).toContain("Never use the address bar");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_response_id: "response-1",
        tools: [{ type: "computer" }],
        input: [{
          type: "computer_call_output",
          call_id: "call-1",
          output: { type: "computer_screenshot", image_url: "data:image/png;base64,AA==" },
        }],
      }),
      OPENAI_REQUEST_OPTIONS,
    );
  });
});
