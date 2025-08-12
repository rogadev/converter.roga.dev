import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import { TestFiles } from '$lib/__tests__/helpers/mock-file-factory';
import { UITestHelpers } from '$lib/__tests__/helpers/ui-test-helpers';
import { ComponentTestSuite } from '$lib/__tests__/helpers/base-test-suite';
import { TestMocks } from '$lib/__tests__/helpers/test-mocks';

// Set up mocks at module level
TestMocks.setup({
  includeWebUtils: true,
  includeConversionService: true,
  includeURLMocks: true
});

describe('Conversion Workflow UI States', () => {
  // Use the base test suite for consistent setup
  const testSuite = new (class extends ComponentTestSuite {
    async customSetup() {
      await super.customSetup();
      // Any additional setup specific to this test suite
    }
  })();

  describe('Loading States', () => {
    it('should show loading state during image conversion', async () => {
      // Arrange: Mock a slow conversion
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });

      const mockService = await TestMocks.getConversionServiceMocks();
      mockService.ConversionService.convertImage.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // Act: Start conversion
      await UITestHelpers.triggerConversion();

      // Assert: Should show loading state
      const loadingButton = page.getByRole('button', { name: /converting/i });
      await expect.element(loadingButton).toBeInTheDocument();
      await expect.element(loadingButton).toBeDisabled();
      await expect.element(loadingButton).toHaveTextContent('Converting…');

      // Complete the conversion
      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });

      // Wait for completion and verify normal state restored
      await UITestHelpers.waitForConversionComplete();
      const normalButton = page.getByRole('button', { name: /start conversion/i });
      await expect.element(normalButton).toBeInTheDocument();
      await expect.element(normalButton).toBeEnabled();
    });

    it('should prevent multiple simultaneous conversions', async () => {
      // Arrange: Mock a slow conversion
      let resolveConversion: (value: any) => void;
      const conversionPromise = new Promise(resolve => {
        resolveConversion = resolve;
      });

      const mockService = await TestMocks.getConversionServiceMocks();
      mockService.ConversionService.convertImage.mockReturnValue(conversionPromise);

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // Act: Start first conversion
      await UITestHelpers.triggerConversion();

      // Try to start second conversion
      const loadingButton = page.getByRole('button', { name: /converting/i });
      await loadingButton.click();

      // Assert: Should still only have one call
      expect(mockService.ConversionService.convertImage).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveConversion!({
        blob: new Blob(['converted'], { type: 'image/png' }),
        filename: 'test.png'
      });
    });
  });

  describe('Success States', () => {
    it('should show output preview after successful conversion', async () => {
      // Arrange: Use default successful conversion setup
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // Act
      await UITestHelpers.triggerConversion();
      await UITestHelpers.waitForConversionComplete();

      // Assert
      const outputImage = page.getByAltText('Output');
      await expect.element(outputImage).toBeInTheDocument();
      await expect.element(outputImage).toHaveAttribute('src', 'blob:mock-url');

      const downloadButton = page.getByRole('button', { name: /download again/i });
      await expect.element(downloadButton).toBeInTheDocument();
      await expect.element(downloadButton).toBeEnabled();

      // Verify download was triggered
      const mockWebUtils = await TestMocks.getWebUtilsMocks();
      expect(mockWebUtils.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'test.png'
      );
    });

    it('should display file size information', async () => {
      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      await UITestHelpers.triggerConversion();
      await UITestHelpers.waitForConversionComplete();

      const sizeInfo = await UITestHelpers.getOutputSize();
      expect(sizeInfo).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
    });
  });

  describe('Error States', () => {
    it('should display error message when conversion fails', async () => {
      // Arrange: Mock conversion failure
      const mockService = await TestMocks.getConversionServiceMocks();
      mockService.ConversionService.convertImage.mockRejectedValue(
        new Error('Image conversion failed')
      );

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // Act
      await UITestHelpers.triggerConversion();
      await UITestHelpers.waitForConversionComplete();

      // Assert
      const errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toContain('conversion failed');

      // Button should be re-enabled
      const convertButton = page.getByRole('button', { name: /start conversion/i });
      await expect.element(convertButton).toBeEnabled();

      // Should not show output
      const hasOutput = await UITestHelpers.isOutputPreviewVisible();
      expect(hasOutput).toBe(false);
    });

    it('should clear error message when starting new conversion', async () => {
      // Arrange: First conversion fails
      const mockService = await TestMocks.getConversionServiceMocks();
      mockService.ConversionService.convertImage
        .mockRejectedValueOnce(new Error('First conversion failed'))
        .mockResolvedValue({
          blob: new Blob(['success'], { type: 'image/png' }),
          filename: 'test.png'
        });

      render(Page);
      const testFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(testFile);

      // First conversion fails
      await UITestHelpers.triggerConversion();
      await UITestHelpers.waitForConversionComplete();

      let errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Second conversion succeeds
      await UITestHelpers.triggerConversion();

      // Error should be cleared immediately
      await page.waitForTimeout(50);
      errorMessage = await UITestHelpers.getErrorMessage();
      expect(errorMessage).toBeNull();
    });
  });

  describe('File Type Handling', () => {
    it('should show appropriate options for different file types', async () => {
      render(Page);

      // Test image file
      const imageFile = TestFiles.jpegImage();
      await UITestHelpers.uploadFile(imageFile);

      const webpOption = page.getByText('WebP');
      const avifOption = page.getByText('AVIF');
      await expect.element(webpOption).toBeInTheDocument();
      await expect.element(avifOption).toBeInTheDocument();

      // Test video file
      const videoFile = TestFiles.mp4Video();
      await UITestHelpers.uploadFile(videoFile);

      const gifOption = page.getByText('GIF');
      await expect.element(gifOption).toBeInTheDocument();

      // Should show video-specific controls
      await UITestHelpers.openAdvancedOptions();
      const widthInput = page.getByLabelText(/width/i);
      const fpsInput = page.getByLabelText(/fps/i);
      await expect.element(widthInput).toBeInTheDocument();
      await expect.element(fpsInput).toBeInTheDocument();
    });

    it('should handle unsupported file types gracefully', async () => {
      render(Page);
      const unsupportedFile = TestFiles.unsupportedFile();
      await UITestHelpers.uploadFile(unsupportedFile);

      const unsupportedMessage = page.getByText(/unsupported file type/i);
      await expect.element(unsupportedMessage).toBeInTheDocument();

      const convertButton = page.getByLabelText('Start file conversion');
      await expect.element(convertButton).toBeDisabled();
    });
  });
});
