import { ComponentCollector } from "../types";
import { safeGet } from "../utils";

export class AudioCollector implements ComponentCollector {
  name = "audio";

  async collect(): Promise<object> {
    return safeGet(async () => {
      // Check if AudioContext is available
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        return { error: "no-audio-context" };
      }

      const audioContext = new AudioContext();
      const result: Record<string, any> = {};

      try {
        // Get basic audio context info
        result.sampleRate = audioContext.sampleRate;
        result.state = audioContext.state;
        result.maxChannelCount = audioContext.destination.maxChannelCount;
        result.channelCount = audioContext.destination.channelCount;
        result.channelCountMode = audioContext.destination.channelCountMode;
        result.channelInterpretation =
          audioContext.destination.channelInterpretation;

        // Create audio fingerprint using oscillator
        const oscillator = audioContext.createOscillator();
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();
        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

        oscillator.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(gainNode);
        gainNode.connect(audioContext.destination);

        scriptProcessor.onaudioprocess = () => {
          const freqData = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(freqData);

          let sum = 0;
          for (let i = 0; i < freqData.length; i++) {
            sum += Math.abs(freqData[i]);
          }
          result.audioFingerprint = sum.toString();
        };

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);

        // Wait a bit for processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Clean up
        await audioContext.close();

        return result;
      } catch (error) {
        try {
          await audioContext.close();
        } catch {}
        return {
          error: "audio-processing-failed",
          details: (error as Error).message,
        };
      }
    }, Promise.resolve({ error: "audio-not-available" }));
  }
}

export class FontsCollector implements ComponentCollector {
  name = "fonts";

  collect(): string[] {
    return safeGet(() => {
      const testFonts = [
        "Arial",
        "Arial Black",
        "Arial Narrow",
        "Arial Rounded MT Bold",
        "Bookman Old Style",
        "Bradley Hand ITC",
        "Century",
        "Century Gothic",
        "Comic Sans MS",
        "Courier",
        "Courier New",
        "Georgia",
        "Gentium",
        "Helvetica",
        "Helvetica Neue",
        "Impact",
        "King",
        "Lucida Console",
        "Lalit",
        "Modena",
        "Monotype Corsiva",
        "Papyrus",
        "Tahoma",
        "TeX",
        "Times",
        "Times New Roman",
        "Trebuchet MS",
        "Verdana",
        "Verona",
      ];

      const availableFonts: string[] = [];
      const testString = "mmmmmmmmmmlli";
      const testSize = "72px";
      const h = document.getElementsByTagName("body")[0];

      // Create a test span element
      const s = document.createElement("span");
      s.style.fontSize = testSize;
      s.style.position = "absolute";
      s.style.left = "-9999px";
      s.style.visibility = "hidden";
      s.innerHTML = testString;
      h.appendChild(s);

      // Get default width and height
      s.style.fontFamily = "monospace";
      const defaultWidth = s.offsetWidth;
      const defaultHeight = s.offsetHeight;

      // Test each font
      for (const font of testFonts) {
        s.style.fontFamily = `'${font}', monospace`;
        if (
          s.offsetWidth !== defaultWidth ||
          s.offsetHeight !== defaultHeight
        ) {
          availableFonts.push(font);
        }
      }

      // Clean up
      h.removeChild(s);

      return availableFonts;
    }, []);
  }
}
