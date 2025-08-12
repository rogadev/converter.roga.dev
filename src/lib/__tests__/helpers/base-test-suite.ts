/**
 * Base test suite class providing consistent setup patterns
 */
import { beforeEach, afterEach } from 'vitest';
import { TestMocks, type MockSetupOptions } from './test-mocks';

export abstract class BaseTestSuite {
  protected mockConversionService: any;
  protected mockWebUtils: any;

  constructor(mockOptions?: MockSetupOptions) {
    this.setupHooks(mockOptions);
  }

  private setupHooks(mockOptions?: MockSetupOptions) {
    beforeEach(async () => {
      await this.beforeEachSetup();
    });

    afterEach(() => {
      this.afterEachCleanup();
    });
  }

  protected async beforeEachSetup() {
    // Get mock references
    this.mockConversionService = await TestMocks.getConversionServiceMocks();
    this.mockWebUtils = await TestMocks.getWebUtilsMocks();

    // Reset mocks
    TestMocks.reset();

    // Allow subclasses to add custom setup
    await this.customSetup();
  }

  protected afterEachCleanup() {
    TestMocks.restore();
    this.customCleanup();
  }

  // Override in subclasses for custom setup
  protected async customSetup(): Promise<void> { }

  // Override in subclasses for custom cleanup
  protected customCleanup(): void { }
}

/**
 * Specialized base class for component tests
 */
export abstract class ComponentTestSuite extends BaseTestSuite {
  constructor() {
    super({
      includeWebUtils: true,
      includeConversionService: true,
      includeURLMocks: true
    });
  }

  protected async customSetup(): Promise<void> {
    // Set up successful conversions by default for component tests
    await TestMocks.setupSuccessfulConversions();
  }
}

/**
 * Specialized base class for unit tests
 */
export abstract class UnitTestSuite extends BaseTestSuite {
  constructor(mockOptions?: MockSetupOptions) {
    super(mockOptions || {
      includeWebUtils: false,
      includeConversionService: false,
      includeURLMocks: false
    });
  }
}
