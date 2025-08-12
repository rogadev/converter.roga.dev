export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly fileType?: string
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

export function handleConversionError(error: unknown, fileType?: string): string {
  if (error instanceof ConversionError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Common FFmpeg errors
    if (error.message.includes('SharedArrayBuffer')) {
      return 'Video conversion requires secure context (HTTPS). Please check your browser settings.';
    }

    if (error.message.includes('out of memory')) {
      return 'File too large for conversion. Try a smaller file or reduce quality settings.';
    }

    return `Conversion failed: ${error.message}`;
  }

  return `Unknown error occurred during ${fileType || 'file'} conversion`;
}
