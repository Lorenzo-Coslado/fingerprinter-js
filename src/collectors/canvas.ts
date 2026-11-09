/**
 * Canvas and WebGL Collectors
 * Graphics-based fingerprinting
 */

import { FingerprintError } from '../types';
import type { CollectorMetadata, WebGLData } from '../types';
import { BaseCollector } from './base';

/**
 * Canvas Collector
 * Creates a unique canvas fingerprint based on rendering differences
 */
export class CanvasCollector extends BaseCollector<string> {
  readonly name = 'canvas';
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata('canvas', {
    stable: true,
    category: 'graphics',
  });

  isSupported(): boolean {
    return (
      super.isSupported() &&
      typeof document !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined'
    );
  }

  collect(): string {
    this.requireSupported();
    {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx)
        throw new FingerprintError('Canvas context is unavailable', 'UNSUPPORTED', this.name);

      // Set canvas size
      canvas.width = 200;
      canvas.height = 50;

      // Draw text with various styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);

      ctx.fillStyle = '#069';
      ctx.fillText('Canvas fingerprint 🎨', 2, 15);

      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Canvas fingerprint 🎨', 4, 17);

      // Draw some shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgb(0,255,255)';
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgb(255,255,0)';
      ctx.beginPath();
      ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    }
  }
}

/**
 * WebGL Collector
 * Collects WebGL rendering context information
 */
export class WebGLCollector extends BaseCollector<WebGLData> {
  readonly name = 'webgl';
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata('webgl', {
    stable: true,
    category: 'graphics',
  });

  isSupported(): boolean {
    return (
      super.isSupported() &&
      typeof document !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined'
    );
  }

  collect(): WebGLData {
    this.requireSupported();
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) throw new FingerprintError('WebGL context is unavailable', 'UNSUPPORTED', this.name);
    try {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const data: WebGLData = {
        vendor: gl.getParameter(gl.VENDOR) as string,
        renderer: gl.getParameter(gl.RENDERER) as string,
        version: gl.getParameter(gl.VERSION) as string,
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string,
        extensions: (gl.getSupportedExtensions() ?? []).sort(),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
        maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
        maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
        maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS) as number,
      };
      if (debug) {
        data.unmaskedVendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) as string;
        data.unmaskedRenderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string;
      }
      return data;
    } finally {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
}
