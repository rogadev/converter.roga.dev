import { page } from '@vitest/browser/context';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import { MockFileFactory, TestFiles } from '$lib/__tests__/helpers/mock-file-factory';
import { UITestHelpers } from '$lib/__tests__/helpers/ui-test-helpers';

// Mock the conversion service with more detailed control
vi.mock('$lib/conversion-service', () => ({
  ConversionService: {
    convertImage: vi.fn(),
    convertVideo: vi.fn()
  }
}));

// Mock web utilities
vi.mock('$lib/converters/web', () => ({
  downloadBlob: vi.fn(),
  humanFileSize: vi.fn((size: number) => `${(size / 1024).toFixed(1)} KB`),
  renameFile: vi.fn((name: string, ext: string) => name.replace(/\.[^/.]+$/, `.${ext}`))
}));

// Mock URL.createObjectURL and revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

describe('Conversion Workflow UI States', () => {
  let mockConversionService: any;
  let mockWebUtils: any;

  beforeEach(async () => {
    // Setup mocks
    mockConversionService = await import('$lib/conversion-service');
    mockWebUtils = await import('$lib/converters/web');

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading state during image conversion', async () => {
      // Mock a slow conversion
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });
      mockConversionService.ConversionService.convertImage.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      // Should show loading state
      const loadingButton = page.getByRole('button', { name: /converting/i });
      await expect.element(loadingButton).toBeInTheDocument();
      await expect.element(loadingButton).toBeDisabled();

      // Button text should change
      await expect.element(loadingButton).toHaveTextContent('Converting…');

      // Complete the conversion
      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });

      // Wait for completion
      await UITestHelpers.waitForConversionComplete();

      // Should return to normal state
      const normalButton = page.getByRole('button', { name: /start conversion/i });
      await expect.element(normalButton).toBeInTheDocument();
      await expect.element(normalButton).toBeEnabled();
    });

    it('should show loading state during video conversion', async () => {
      // Mock a slow conversion
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });
      mockConversionService.ConversionService.convertVideo.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.mp4Video();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      // Should show loading state
      const loadingButton = page.getByRole('button', { name: /converting/i });
      await expect.element(loadingButton).toBeInTheDocument();
      await expect.element(loadingButton).toBeDisabled();

      // Complete the conversion
      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/gif' }),
        filename: 'test.gif'
      });

      await UITestHelpers.waitForConversionComplete();
    });

    it('should prevent multiple simultaneous conversions', async () => {
      // Mock a slow conversion
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });
      mockConversionService.ConversionService.convertImage.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });

      // Start first conversion
      await convertButton.click();

      // Button should be disabled
      const loadingButton = page.getByRole('button', { name: /converting/i });
      await expect.element(loadingButton).toBeDisabled();

      // Try to click again - should not trigger another conversion
      await loadingButton.click();

      // Should still only have one call
      expect(mockConversionService.ConversionService.convertImage).toHaveBeenCalledTimes(1);

      // Complete the conversion
      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });
    });

    it('should show proper ARIA labels during loading', async () => {
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });
      mockConversionService.ConversionService.convertImage.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start file conversion/i });
      await convertButton.click();

      // Should have proper ARIA label during conversion
      const loadingButton = page.getByRole('button', { name: /converting file, please wait/i });
      await expect.element(loadingButton).toBeInTheDocument();

      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });
    });
  });

  describe('Success States', () => {
    beforeEach(() => {
      // Mock successful conversions
      mockConversionService.ConversionService.convertImage.mockResolvedValue({
        blob: new Blob(['converted image'], { type: 'image/png' }),
        filename: 'test.png'
      });

      mockConversionService.ConversionService.convertVideo.mockResolvedValue({
        blob: new Blob(['converted gif'], { type: 'image/gif' }),
        filename: 'test.gif'
      });
    });

    it('should show output preview after successful image conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Should show output image
      const outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();
      await expect.element(outputImage).toHaveAttribute('src', 'blob:mock-url');
    });

    it('should show output preview after successful video conversion', async () => {
      render(Page);
      const testFile = TestFiles.mp4Video();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Should show output image (GIF)
      const outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();
    });

    it('should show file size information after conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Should show file size
      const sizeInfo = page.getByText(/KB/);
      await expect.element(sizeInfo).toBeInTheDocument();
    });

    it('should show download again button after successful conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Should show download again button
      const downloadButton = page.getByRole('button', { name: /download again/i });
      await expect.element(downloadButton).toBeInTheDocument();
      await expect.element(downloadButton).toBeEnabled();
    });

    it('should trigger automatic download after successful conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Should have called downloadBlob
      expect(mockWebUtils.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'test.png'
      );
    });

    it('should handle download again button click', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Mock fetch for download again
      globalThis.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['downloaded'], { type: 'image/png' }))
      });

      const downloadButton = page.getByRole('button', { name: /download again/i });
      await downloadButton.click();

      // Should fetch the blob URL
      expect(globalThis.fetch).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should clear previous output when starting new conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // First conversion
      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();
      await UITestHelpers.waitForConversionComplete();

      // Should have output
      let outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();

      // Start second conversion
      await convertButton.click();

      // Output should be cleared during conversion
      const previewText = page.getByText('Output preview');
      await expect.element(previewText).toBeInTheDocument();

      await UITestHelpers.waitForConversionComplete();

      // Should show new output
      outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error message when image conversion fails', async () => {
      mockConversionService.ConversionService.convertImage.mockRejectedValue(
        new Error('Image conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      // Wait for error to appear
      await page.waitForTimeout(100);

      const errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toContain('conversion failed');
    });

    it('should display error message when video conversion fails', async () => {
      mockConversionService.ConversionService.convertVideo.mockRejectedValue(
        new Error('Video conversion failed')
      );

      render(Page);
      const testFile = TestFiles.mp4Video();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await page.waitForTimeout(100);

      const errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toContain('conversion failed');
    });

    it('should re-enable conversion button after error', async () => {
      mockConversionService.ConversionService.convertImage.mockRejectedValue(
        new Error('Conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      // Wait for error
      await page.waitForTimeout(100);

      // Button should be enabled again
      const enabledButton = page.getByRole('button', { name: /start conversion/i });
      await expect.element(enabledButton).toBeEnabled();
    });

    it('should clear error message when starting new conversion', async () => {
      // First conversion fails
      mockConversionService.ConversionService.convertImage.mockRejectedValueOnce(
        new Error('First conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      // Wait for error
      await page.waitForTimeout(100);
      let errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Second conversion succeeds
      mockConversionService.ConversionService.convertImage.mockResolvedValue({
        blob: new Blob(['success'], { type: 'image/png' }),
        filename: 'test.png'
      });

      await convertButton.click();

      // Error should be cleared immediately when starting new conversion
      await page.waitForTimeout(50);
      errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toBeNull();
    });

    it('should handle download again errors gracefully', async () => {
      // Successful conversion first
      mockConversionService.ConversionService.convertImage.mockResolvedValue({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();
      await UITestHelpers.waitForConversionComplete();

      // Mock fetch failure
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const downloadButton = page.getByRole('button', { name: /download again/i });
      await downloadButton.click();

      // Should show error
      await page.waitForTimeout(100);
      const errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toContain('Download failed');
    });

    it('should handle corrupted file errors appropriately', async () => {
      mockConversionService.ConversionService.convertImage.mockRejectedValue(
        new Error('Invalid image data')
      );

      render(Page);
      const corruptedFile = TestFiles.corruptedImage();
      await UITestHelpers.uploadFile(corruptedFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await page.waitForTimeout(100);

      const errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toContain('Invalid image data');
    });

    it('should not show output preview when conversion fails', async () => {
      mockConversionService.ConversionService.convertImage.mockRejectedValue(
        new Error('Conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await page.waitForTimeout(100);

      // Should still show placeholder text
      const previewText = page.getByText('Output preview');
      await expect.element(previewText).toBeInTheDocument();

      // Should not show output image
      const outputImages = page.locator('img[alt="Output"]');
      await expect.element(outputImages).not.toBeInTheDocument();
    });

    it('should not show download again button when conversion fails', async () => {
      mockConversionService.ConversionService.convertImage.mockRejectedValue(
        new Error('Conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await page.waitForTimeout(100);

      // Should not show download again button
      const downloadButtons = page.locator('button:has-text("Download again")');
      await expect.element(downloadButtons).not.toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('should maintain conversion settings during conversion', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // Change format to PNG
      const pngOption = page.getByRole('radio', { name: /png/i });
      await pngOption.click();

      // Start conversion
      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // PNG should still be selected
      await expect.element(pngOption).toBeChecked();
    });

    it('should maintain video settings during conversion', async () => {
      render(Page);
      const testFile = TestFiles.mp4Video();
      await UITestHelpers.uploadFile(testFile);

      // Change video settings
      const advancedToggle = page.getByText('Advanced');
      await advancedToggle.click();

      const widthInput = page.getByLabelText('Width');
      await widthInput.fill('640');

      // Start conversion
      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();

      await UITestHelpers.waitForConversionComplete();

      // Settings should be maintained
      await expect.element(widthInput).toHaveValue('640');
    });

    it('should preserve output after page interactions', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await convertButton.click();
      await UITestHelpers.waitForConversionComplete();

      // Should have output
      const outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();

      // Interact with advanced options
      const advancedToggle = page.getByText('Advanced');
      await advancedToggle.click();

      // Output should still be there
      await expect.element(outputImage).toBeInTheDocument();
    });
  });
});
