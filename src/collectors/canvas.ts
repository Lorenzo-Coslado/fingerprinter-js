import { ComponentCollector } from "../types";
import { safeGet } from "../utils";

export class CanvasCollector implements ComponentCollector {
  name = "canvas";

  collect(): string {
    return safeGet(() => {
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

export class WebGLCollector implements ComponentCollector {
  name = "webgl";

  collect(): object {
    return safeGet(
      () => {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          (canvas.getContext(
            "experimental-webgl"
          ) as WebGLRenderingContext | null);

        if (!gl) return { error: "no-webgl-context" };

        const result: Record<string, any> = {};

        // Get basic WebGL info
        result.vendor = gl.getParameter(gl.VENDOR);
        result.renderer = gl.getParameter(gl.RENDERER);
        result.version = gl.getParameter(gl.VERSION);
        result.shadingLanguageVersion = gl.getParameter(
          gl.SHADING_LANGUAGE_VERSION
        );

        // Get supported extensions
        const extensions = gl.getSupportedExtensions();
        result.extensions = extensions ? extensions.sort() : [];

        // Get additional parameters
        result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        result.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        result.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        result.maxVertexUniformVectors = gl.getParameter(
          gl.MAX_VERTEX_UNIFORM_VECTORS
        );
        result.maxFragmentUniformVectors = gl.getParameter(
          gl.MAX_FRAGMENT_UNIFORM_VECTORS
        );
        result.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);

        // Get unmasked info if available
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          result.unmaskedVendor = gl.getParameter(
            debugInfo.UNMASKED_VENDOR_WEBGL
          );
          result.unmaskedRenderer = gl.getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          );
        }

        return result;
      },
      { error: "webgl-not-available" }
    );
  }
}
