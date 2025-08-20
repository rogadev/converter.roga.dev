import { page } from '@vitest/browser/context';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

// Mock the conversion service
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

describe('/+page.svelte', () => {
	let mockConversionService: any;
	let mockWebUtils: any;

	beforeEach(async () => {
		// Setup mocks
		mockConversionService = await import('$lib/conversion-service');
		mockWebUtils = await import('$lib/converters/web');

		// Default mock implementations
		mockConversionService.ConversionService.convertImage.mockResolvedValue({
			blob: new Blob(['converted image'], { type: 'image/png' }),
			filename: 'test.png'
		});

		mockConversionService.ConversionService.convertVideo.mockResolvedValue({
			blob: new Blob(['converted gif'], { type: 'image/gif' }),
			filename: 'test.gif'
		});

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Initial Render', () => {
		it('should render main heading', async () => {
			render(Page);
			const heading = page.getByRole('heading', { level: 1 });
			await expect.element(heading).toBeInTheDocument();
			await expect.element(heading).toHaveTextContent('File Converter');
		});

		it('should render description', async () => {
			render(Page);
			const description = page.getByText('Drop a file or click to upload. Pick an option, then start conversion.');
			await expect.element(description).toBeInTheDocument();
		});

		it('should render file upload area', async () => {
			render(Page);
			const uploadLabel = page.getByText('Drag & drop your file here');
			await expect.element(uploadLabel).toBeInTheDocument();
		});

		it('should render disabled conversion button initially', async () => {
			render(Page);
			const convertButton = page.getByRole('button', { name: /start (file )?conversion/i });
			await expect.element(convertButton).toBeInTheDocument();
			await expect.element(convertButton).toBeDisabled();
		});

		it('should render output preview area', async () => {
			render(Page);
			const previewText = page.getByText('Output preview');
			await expect.element(previewText).toBeInTheDocument();
		});

		it('should render privacy notice', async () => {
			render(Page);
			const privacyText = page.getByText('Runs fully in your browser. Your files never leave your device.');
			await expect.element(privacyText).toBeInTheDocument();
		});
	});

	describe('File Upload', () => {
		it('should render file input with correct attributes', async () => {
			render(Page);
			const fileInput = page.getByLabelText('Choose files');
			await expect.element(fileInput).toBeInTheDocument();
			await expect.element(fileInput).toHaveAttribute('type', 'file');
		});

		it('should render upload area with drag and drop text', async () => {
			render(Page);
			const uploadText = page.getByText('Drag & drop your file here');
			await expect.element(uploadText).toBeInTheDocument();
		});
	});

	describe('Basic UI Elements', () => {
		it('should render conversion button', async () => {
			render(Page);
			const convertButton = page.getByRole('button', { name: /start (file )?conversion/i });
			await expect.element(convertButton).toBeInTheDocument();
		});

		it('should render output preview area', async () => {
			render(Page);
			const previewText = page.getByText('Output preview');
			await expect.element(previewText).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper labels on form inputs', async () => {
			render(Page);
			const fileInput = page.getByLabelText('Choose files');
			await expect.element(fileInput).toBeInTheDocument();
		});
	});
});
