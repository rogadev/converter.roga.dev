/**
 * UITestHelpers - Utilities for testing UI interactions and component behavior
 * Provides consistent methods for simulating user interactions in browser tests
 */

// Only import browser context in browser environment
let page: any;
try {
  if (typeof window !== 'undefined') {
    page = (await import('@vitest/browser/context')).page;
  }
} catch {
  // Fallback for Node.js environment
  page = null;
}

import type { ImageFormat } from '../../types';

export interface UITestHelpers {
  uploadFile(file: File): Promise<void>;
  selectImageFormat(format: ImageFormat): Promise<void>;
  setVideoOptions(options: Partial<VideoTestOptions>): Promise<void>;
  triggerConversion(): Promise<void>;
  waitForConversionComplete(): Promise<void>;
  getErrorMessage(): Promise<string | null>;
}

export interface VideoTestOptions {
  width: number;
  fps: number;
  start: number;
  duration: number;
  highQuality: boolean;
}

export class UITestHelpers {
  /**
   * Simulates file upload by setting files on input element
   */
  static async uploadFile(file: File): Promise<void> {
    if (!page) {
      throw new Error('UITestHelpers can only be used in browser environment');
    }

    const input = document.getElementById('file-input') as HTMLInputElement;
    if (!input) {
      // Provide more debugging context
      const availableInputs = Array.from(document.querySelectorAll('input')).map(i =>
        `${i.id || 'no-id'}[type=${i.type}]`
      );
      throw new Error(
        `File input element #file-input not found. Available inputs: ${availableInputs.join(', ')}. ` +
        'Ensure the component is properly rendered.'
      );
    }

    try {
      // Validate file before upload
      if (!file.name) {
        throw new Error('File must have a name');
      }
      if (file.size === 0) {
        console.warn('Uploading empty file, this may cause unexpected behavior');
      }

      // Create DataTransfer to simulate file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Override the files property (read-only in browsers, but writable in tests)
      Object.defineProperty(input, 'files', {
        value: dataTransfer.files,
        configurable: true,
        writable: true
      });

      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      const eventDispatched = input.dispatchEvent(changeEvent);

      if (!eventDispatched) {
        throw new Error('Change event was cancelled, file upload may have failed');
      }

      // Wait for reactive updates
      await this.waitForUpdate();

      // Verify upload was processed
      const fileInfo = await this.getFileInfo();
      if (!fileInfo || fileInfo.name !== file.name) {
        throw new Error(
          `File upload verification failed. Expected: ${file.name}, Got: ${fileInfo?.name || 'none'}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to upload file "${file.name}" (${file.size} bytes, ${file.type}): ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Simulates drag and drop file upload
   */
  static async dragAndDropFile(file: File, targetSelector = 'label[for="file-input"]'): Promise<void> {
    const dropZone = document.querySelector(targetSelector);
    if (!dropZone) {
      throw new Error(`Drop zone element not found: ${targetSelector}`);
    }

    // Create drag event with file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      dataTransfer
    });

    dropZone.dispatchEvent(dropEvent);
    await this.waitForUpdate();
  }

  /**
   * Selects an image format option
   */
  static async selectImageFormat(format: ImageFormat): Promise<void> {
    const radioInput = document.querySelector(`input[type="radio"][value="${format}"]`) as HTMLInputElement;
    if (!radioInput) {
      throw new Error(`Image format radio button not found: ${format}`);
    }

    radioInput.checked = true;
    radioInput.dispatchEvent(new Event('change', { bubbles: true }));
    await this.waitForUpdate();
  }

  /**
   * Sets video conversion options
   */
  static async setVideoOptions(options: Partial<VideoTestOptions>): Promise<void> {
    if (options.width !== undefined) {
      await this.setInputValue('input[type="number"][placeholder="auto"]', options.width.toString());
    }

    if (options.fps !== undefined) {
      const fpsInput = document.querySelector('input[type="number"][placeholder="12"]') as HTMLInputElement;
      if (fpsInput) {
        await this.setInputValue(fpsInput, options.fps.toString());
      }
    }

    if (options.start !== undefined) {
      const startInput = document.querySelector('input[type="number"][placeholder="0"]') as HTMLInputElement;
      if (startInput) {
        await this.setInputValue(startInput, options.start.toString());
      }
    }

    if (options.duration !== undefined) {
      const durationInputs = document.querySelectorAll('input[type="number"][placeholder="auto"]');
      const durationInput = Array.from(durationInputs).find(input =>
        input.previousElementSibling?.textContent?.includes('Duration')
      ) as HTMLInputElement;
      if (durationInput) {
        await this.setInputValue(durationInput, options.duration.toString());
      }
    }

    if (options.highQuality !== undefined) {
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = options.highQuality;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    await this.waitForUpdate();
  }

  /**
   * Sets image quality slider value
   */
  static async setImageQuality(quality: number): Promise<void> {
    const qualitySlider = document.querySelector('input[type="range"]') as HTMLInputElement;
    if (!qualitySlider) {
      throw new Error('Quality slider not found');
    }

    qualitySlider.value = quality.toString();
    qualitySlider.dispatchEvent(new Event('input', { bubbles: true }));
    qualitySlider.dispatchEvent(new Event('change', { bubbles: true }));
    await this.waitForUpdate();
  }

  /**
   * Clicks the conversion button
   */
  static async triggerConversion(): Promise<void> {
    const convertButton = document.querySelector('button') as HTMLButtonElement;
    if (!convertButton) {
      throw new Error('Convert button not found');
    }

    if (convertButton.disabled) {
      throw new Error('Convert button is disabled');
    }

    convertButton.click();
    await this.waitForUpdate();
  }

  /**
   * Waits for conversion to complete by monitoring button text
   */
  static async waitForConversionComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    let lastButtonText = '';

    while (Date.now() - startTime < timeout) {
      const convertButton = document.querySelector('button') as HTMLButtonElement;

      if (!convertButton) {
        throw new Error('Convert button not found during wait');
      }

      const currentButtonText = convertButton.textContent || '';

      // Check if conversion completed (button text changed from "Converting...")
      if (!currentButtonText.includes('Converting') && lastButtonText.includes('Converting')) {
        // Wait a bit more for UI to fully update
        await this.waitForUpdate(500);
        return;
      }

      // Check if button never started converting (might have failed immediately)
      if (!currentButtonText.includes('Converting') && !lastButtonText.includes('Converting')) {
        // Check if there's an error message
        const errorMessage = await this.getErrorMessage();
        if (errorMessage) {
          return; // Conversion failed, but that's a valid completion state
        }

        // Check if there's output (successful conversion)
        const hasOutput = await this.isOutputPreviewVisible();
        if (hasOutput) {
          return; // Conversion succeeded
        }
      }

      lastButtonText = currentButtonText;
      await this.waitForUpdate(100);
    }

    throw new Error(`Conversion did not complete within ${timeout}ms timeout`);
  }

  /**
   * Gets the current error message if displayed
   */
  static async getErrorMessage(): Promise<string | null> {
    const errorElement = document.querySelector('.text-red-600');
    return errorElement?.textContent || null;
  }

  /**
   * Gets the current file information displayed
   */
  static async getFileInfo(): Promise<{ name: string; size: string; } | null> {
    const nameElement = document.querySelector('.font-medium');
    const sizeElement = document.querySelector('.text-neutral-600');

    if (!nameElement || !sizeElement) {
      return null;
    }

    return {
      name: nameElement.textContent || '',
      size: sizeElement.textContent || ''
    };
  }

  /**
   * Checks if the convert button is enabled
   */
  static async isConvertButtonEnabled(): Promise<boolean> {
    const convertButton = document.querySelector('button') as HTMLButtonElement;
    return convertButton ? !convertButton.disabled : false;
  }

  /**
   * Checks if the output preview is visible
   */
  static async isOutputPreviewVisible(): Promise<boolean> {
    const previewImage = document.querySelector('img[alt="Output"]') as HTMLImageElement;
    return previewImage ? previewImage.src !== '' : false;
  }

  /**
   * Gets the output file size display
   */
  static async getOutputSize(): Promise<string | null> {
    const sizeElements = document.querySelectorAll('.text-xs.text-neutral-600');
    const outputSizeElement = Array.from(sizeElements).find(el =>
      el.textContent && /\d+(\.\d+)?\s*(B|KB|MB|GB)/.test(el.textContent)
    );
    return outputSizeElement?.textContent || null;
  }

  /**
   * Clicks the "Download again" button if visible
   */
  static async clickDownloadAgain(): Promise<void> {
    const downloadButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Download again')
    ) as HTMLButtonElement;

    if (!downloadButton) {
      throw new Error('Download again button not found');
    }

    downloadButton.click();
    await this.waitForUpdate();
  }

  /**
   * Opens advanced options if they're collapsed
   */
  static async openAdvancedOptions(): Promise<void> {
    const summary = document.querySelector('summary') as HTMLElement;
    if (!summary) {
      throw new Error('Advanced options summary not found');
    }

    const details = summary.parentElement as HTMLDetailsElement;
    if (!details.open) {
      summary.click();
      await this.waitForUpdate();
    }
  }

  /**
   * Helper to set input value and trigger events
   */
  private static async setInputValue(
    input: HTMLInputElement | string,
    value: string
  ): Promise<void> {
    const element = typeof input === 'string'
      ? document.querySelector(input) as HTMLInputElement
      : input;

    if (!element) {
      throw new Error(`Input element not found: ${input}`);
    }

    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Waits for UI updates to complete
   */
  private static async waitForUpdate(ms = 100): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience functions for common UI test scenarios
 */
export const UIActions = {
  // File upload actions
  uploadImage: (file: File) => UITestHelpers.uploadFile(file),
  uploadVideo: (file: File) => UITestHelpers.uploadFile(file),
  dragDropFile: (file: File) => UITestHelpers.dragAndDropFile(file),

  // Format selection
  selectWebP: () => UITestHelpers.selectImageFormat('webp'),
  selectAVIF: () => UITestHelpers.selectImageFormat('avif'),
  selectPNG: () => UITestHelpers.selectImageFormat('png'),
  selectJPEG: () => UITestHelpers.selectImageFormat('jpeg'),

  // Conversion actions
  startConversion: () => UITestHelpers.triggerConversion(),
  waitForCompletion: () => UITestHelpers.waitForConversionComplete(),

  // State checks
  isReady: () => UITestHelpers.isConvertButtonEnabled(),
  hasError: () => UITestHelpers.getErrorMessage(),
  hasOutput: () => UITestHelpers.isOutputPreviewVisible(),

  // Advanced options
  setQuality: (quality: number) => UITestHelpers.setImageQuality(quality),
  setVideoWidth: (width: number) => UITestHelpers.setVideoOptions({ width }),
  setVideoFPS: (fps: number) => UITestHelpers.setVideoOptions({ fps }),
  enableHighQuality: () => UITestHelpers.setVideoOptions({ highQuality: true })
};
