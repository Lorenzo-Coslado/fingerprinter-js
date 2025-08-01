import { safeGet, safeStringify, sha256, simpleHash } from "../utils";

describe("Utils", () => {
  describe("simpleHash", () => {
    it("should generate consistent hash for same input", () => {
      const input = "test string";
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("number");
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = simpleHash("string1");
      const hash2 = simpleHash("string2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = simpleHash("");
      expect(hash).toBe(0);
    });
  });

  describe("sha256", () => {
    it("should generate hash string", async () => {
      const hash = await sha256("test");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate consistent hash for same input", async () => {
      const input = "consistent test";
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);

      expect(hash1).toBe(hash2);
    });
  });

  describe("safeStringify", () => {
    it("should stringify regular objects", () => {
      const obj = { a: 1, b: "test" };
      const result = safeStringify(obj);

      expect(result).toBe('{"a":1,"b":"test"}');
    });

    it("should handle circular references", () => {
      const obj: any = { a: 1 };
      obj.circular = obj;

      const result = safeStringify(obj);
      expect(result).toContain("[Circular]");
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3];
      const result = safeStringify(arr);

      expect(result).toBe("[1,2,3]");
    });
  });

  describe("safeGet", () => {
    it("should return result when function succeeds", () => {
      const result = safeGet(() => "success", "default");
      expect(result).toBe("success");
    });

    it("should return default when function throws", () => {
      const result = safeGet(() => {
        throw new Error("test error");
      }, "default");
      expect(result).toBe("default");
    });

    it("should work with complex operations", () => {
      const result = safeGet(() => {
        const obj = { nested: { value: 42 } };
        return obj.nested.value * 2;
      }, 0);
      expect(result).toBe(84);
    });
  });
});
