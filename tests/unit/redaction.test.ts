import { describe, expect, it } from "vitest";
import { redactSensitive } from "@/lib/security/redaction";

describe("diagnostic redaction", () => {
  it("removes secrets and internal filesystem paths", () => {
    const fakeOpenAIKey = ["sk", "examplevalue123"].join("-");
    const redacted = redactSensitive(new Error(`OpenAI ${fakeOpenAIKey} failed while opening /app/data/specsentry.sqlite`));
    expect(redacted).not.toContain(fakeOpenAIKey);
    expect(redacted).not.toContain("/app/data/specsentry.sqlite");
    expect(redacted).toContain("[REDACTED_OPENAI_KEY]");
    expect(redacted).toContain("[REDACTED_PATH]");
  });
});
