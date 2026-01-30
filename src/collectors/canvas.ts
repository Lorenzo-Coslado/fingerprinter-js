/**
 * Canvas and WebGL Collectors
 * Graphics-based fingerprinting
 */

import { CollectorMetadata, WebGLData } from "../types";
import { BaseCollector } from "./base";

/**
 * Canvas Collector
 * Creates a unique canvas fingerprint based on rendering differences
 */
export class CanvasCollector extends BaseCollector<string> {
  readonly name = "canvas";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "canvas",
    {
      weight: 9,
      entropy: 12,
      stable: true,
      category: "graphics",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      typeof document !== "undefined" &&
      typeof HTMLCanvasElement !== "undefined"
    );
  }

  collect(): string {
    return this.safeCollect(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return "no-canvas-context";

      // Set canvas size
      canvas.width = 200;
      canvas.height = 50;

      // Draw text with various styles
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);

      ctx.fillStyle = "#069";
      ctx.fillText("Canvas fingerprint 🎨", 2, 15);

      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Canvas fingerprint 🎨", 4, 17);

      // Draw some shapes
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgb(255,0,255)";
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(0,255,255)";
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(255,255,0)";
      ctx.beginPath();
      ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    }, "no-canvas");
  }
}

/**
 * WebGL Collector
 * Collects WebGL rendering context information
 */
export class WebGLCollector extends BaseCollector<WebGLData> {
  readonly name = "webgl";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata("webgl", {
    weight: 9,
    entropy: 15,
    stable: true,
    category: "graphics",
  });

  isSupported(): boolean {
    return (
      super.isSupported() &&
      typeof document !== "undefined" &&
      typeof HTMLCanvasElement !== "undefined"
    );
  }

  collect(): WebGLData {
    return this.safeCollect(
      () => {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

        if (!gl) return { error: "no-webgl-context" } as WebGLData;

        const result: Partial<WebGLData> = {};

        // Get basic WebGL info
        result.vendor = gl.getParameter(gl.VENDOR) as string;
        result.renderer = gl.getParameter(gl.RENDERER) as string;
        result.version = gl.getParameter(gl.VERSION) as string;
        result.shadingLanguageVersion = gl.getParameter(
          gl.SHADING_LANGUAGE_VERSION
        ) as string;

        // Get supported extensions
        const extensions = gl.getSupportedExtensions();
        result.extensions = extensions ? extensions.sort() : [];

        // Get additional parameters
        result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        result.maxViewportDims = Array.from(
          gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
        );
        result.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
        result.maxVertexUniformVectors = gl.getParameter(
          gl.MAX_VERTEX_UNIFORM_VECTORS
        ) as number;
        result.maxFragmentUniformVectors = gl.getParameter(
          gl.MAX_FRAGMENT_UNIFORM_VECTORS
        ) as number;
        result.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS) as number;

        // Get unmasked info if available
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          result.unmaskedVendor = gl.getParameter(
            debugInfo.UNMASKED_VENDOR_WEBGL
          ) as string;
          result.unmaskedRenderer = gl.getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          ) as string;
        }

        return result as WebGLData;
      },
      { error: "webgl-not-available" } as WebGLData
    );
  }
}
