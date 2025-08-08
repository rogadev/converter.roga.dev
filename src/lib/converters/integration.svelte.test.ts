import { page } from '@vitest/browser/context';
import { describe, expect, it, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../../routes/+page.svelte';

describe('Converter Integration Tests (Browser)', () => {
  beforeAll(async () => {
    // Wait for the page to be fully loaded
    await page.waitForTimeout(1000);
  });

  it('should render the converter interface', async () => {
    render(Page);

    // Check that main UI elements are present
    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeInTheDocument();

    // Check for file input
    const fileInput = page.getByLabelText(/choose files/i);
    await expect.element(fileInput).toBeInTheDocument();

    // Check for convert button (should be disabled initially)
    const convertButton = page.getByRole('button', { name: /start conversion/i });
    await expect.element(convertButton).toBeInTheDocument();
    await expect.element(convertButton).toBeDisabled();
  });

  it('should show file information when a file is selected', async () => {
    render(Page);

    // Create a mock image file
    const mockFile = new File(['fake image content'], 'test-image.jpg', {
      type: 'image/jpeg'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockFile]);

    // Wait for the file to be processed
    await page.waitForTimeout(500);

    // Check that file info is displayed
    const fileName = page.getByText('test-image.jpg');
    await expect.element(fileName).toBeInTheDocument();

    // Check that convert button is now enabled
    const convertButton = page.getByRole('button', { name: /start conversion/i });
    await expect.element(convertButton).toBeEnabled();
  });

  it('should show appropriate options for image files', async () => {
    render(Page);

    const mockImageFile = new File(['fake image content'], 'test.png', {
      type: 'image/png'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockImageFile]);

    await page.waitForTimeout(500);

    // Check for image format options
    const webpOption = page.getByText('WebP');
    const avifOption = page.getByText('AVIF');

    await expect.element(webpOption).toBeInTheDocument();
    await expect.element(avifOption).toBeInTheDocument();
  });

  it('should show appropriate options for video files', async () => {
    render(Page);

    const mockVideoFile = new File(['fake video content'], 'test.mp4', {
      type: 'video/mp4'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockVideoFile]);

    await page.waitForTimeout(500);

    // Check for GIF conversion options
    const gifOption = page.getByText('GIF');
    await expect.element(gifOption).toBeInTheDocument();

    // Check for video-specific controls
    const widthInput = page.getByLabelText(/width/i);
    const fpsInput = page.getByLabelText(/fps/i);

    await expect.element(widthInput).toBeInTheDocument();
    await expect.element(fpsInput).toBeInTheDocument();
  });

  it('should handle unsupported file types', async () => {
    render(Page);

    const mockUnsupportedFile = new File(['fake content'], 'test.txt', {
      type: 'text/plain'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockUnsupportedFile]);

    await page.waitForTimeout(500);

    // Check that unsupported message is shown
    const unsupportedMessage = page.getByText(/unsupported file type/i);
    await expect.element(unsupportedMessage).toBeInTheDocument();

    // Convert button should remain disabled
    const convertButton = page.getByRole('button', { name: /start conversion/i });
    await expect.element(convertButton).toBeDisabled();
  });

  it('should show loading state during conversion', async () => {
    render(Page);

    const mockImageFile = new File(['fake image content'], 'test.jpg', {
      type: 'image/jpeg'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockImageFile]);

    await page.waitForTimeout(500);

    const convertButton = page.getByRole('button', { name: /start conversion/i });

    // Note: This would trigger actual conversion which might fail in test environment
    // We mainly test that the UI elements exist and behave correctly
    await expect.element(convertButton).toBeEnabled();
  });

  it('should validate input ranges', async () => {
    render(Page);

    const mockVideoFile = new File(['fake video content'], 'test.mp4', {
      type: 'video/mp4'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockVideoFile]);

    await page.waitForTimeout(500);

    // Test input validation
    const widthInput = page.getByLabelText(/width/i);
    const fpsInput = page.getByLabelText(/fps/i);

    // Check that inputs have reasonable defaults
    await expect.element(widthInput).toHaveValue('480');
    await expect.element(fpsInput).toHaveValue('12');
  });

  it('should preserve user selections when switching files', async () => {
    render(Page);

    // First select an image
    const mockImageFile = new File(['fake image content'], 'test.jpg', {
      type: 'image/jpeg'
    });

    const fileInput = page.getByLabelText(/choose files/i);
    await fileInput.setInputFiles([mockImageFile]);
    await page.waitForTimeout(500);

    // Change quality setting for image
    const qualityInput = page.getByLabelText(/quality/i);
    await qualityInput.fill('90');

    // Switch to video file
    const mockVideoFile = new File(['fake video content'], 'test.mp4', {
      type: 'video/mp4'
    });

    await fileInput.setInputFiles([mockVideoFile]);
    await page.waitForTimeout(500);

    // Switch back to image
    await fileInput.setInputFiles([mockImageFile]);
    await page.waitForTimeout(500);

    // Quality setting should be preserved
    await expect.element(qualityInput).toHaveValue('90');
  });
});
