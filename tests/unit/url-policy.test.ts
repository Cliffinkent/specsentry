import { describe, expect, it } from "vitest";
import { assertApprovedUrl, isPrivateAddress, UrlPolicyError } from "@/lib/security/url-policy";

describe("URL and hostname restrictions", () => {
  it("accepts an exact public hostname", () => {
    expect(assertApprovedUrl("https://staging.example.com/review", "staging.example.com").hostname).toBe("staging.example.com");
  });

  it("rejects subdomains and suffix tricks", () => {
    expect(() => assertApprovedUrl("https://evil.staging.example.com", "staging.example.com")).toThrow(UrlPolicyError);
    expect(() => assertApprovedUrl("https://staging.example.com.evil.test", "staging.example.com")).toThrow(UrlPolicyError);
  });

  it("blocks file URLs, embedded credentials and private addresses", () => {
    expect(() => assertApprovedUrl("file:///tmp/demo", "localhost", { allowDevelopmentLocalhost: true })).toThrow(/HTTP and HTTPS/);
    expect(() => assertApprovedUrl("https://user:secret@example.com", "example.com")).toThrow(/Credentials/);
    expect(() => assertApprovedUrl("http://192.168.1.20", "192.168.1.20")).toThrow(/Private-network/);
  });

  it("permits localhost only behind the explicit development switch", () => {
    expect(() => assertApprovedUrl("http://127.0.0.1:3100/demo", "127.0.0.1")).toThrow(/development-only/);
    expect(assertApprovedUrl("http://127.0.0.1:3100/demo", "127.0.0.1", { allowDevelopmentLocalhost: true }).port).toBe("3100");
  });

  it("recognizes representative private IPv4 and IPv6 targets", () => {
    expect(isPrivateAddress("10.1.2.3")).toBe(true);
    expect(isPrivateAddress("172.31.255.1")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});
