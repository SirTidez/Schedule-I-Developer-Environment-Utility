# Update System Testing Guide

This directory contains comprehensive tests for the auto-updating logic in the Schedule I Developer Environment Utility.

## Test Structure

### Unit Tests (`tests/main/`)
- **`updateService.test.ts`** - Tests for the main UpdateService class
  - Version detection and comparison
  - GitHub API integration
  - Caching logic
  - Error handling
  - Auto-updater integration

- **`updateCacheService.test.ts`** - Tests for the UpdateCacheService class
  - Cache validity checking
  - Data loading and saving
  - Error handling
  - Concurrent access

- **`updateHandlers.test.ts`** - Tests for IPC handlers
  - All update-related IPC endpoints
  - Event handling
  - Error propagation
  - Status updates

### Integration Tests (`tests/renderer/`)
- **`useUpdateService.test.ts`** - Tests for the React hook
  - State management
  - API calls
  - Error handling
  - Loading states

- **`updateDialog.test.tsx`** - Tests for the UpdateDialog component
  - Rendering and display
  - User interactions
  - Release notes loading
  - Accessibility
  - Error states

### End-to-End Tests (`tests/e2e/`)
- **`update-flow.spec.ts`** - Complete update flow tests
  - Full user journey
  - Dialog interactions
  - Error scenarios
  - Performance testing
  - Accessibility testing

### Test Utilities (`tests/setup/`)
- **`updateTestUtils.ts`** - Common test data and helper functions
- **`updateTestMocks.ts`** - Centralized mock setup
- **`globals.ts`** - Global test configuration

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Renderer Tests Only
```bash
npm run test:renderer
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

The test suite covers:

### UpdateService
- ✅ Version detection (packaged vs development)
- ✅ Version comparison (semantic versioning)
- ✅ GitHub API integration
- ✅ Caching mechanism
- ✅ Error handling
- ✅ Auto-updater integration
- ✅ Release note formatting

### UpdateCacheService
- ✅ Cache validity checking
- ✅ Data persistence
- ✅ Error handling
- ✅ Concurrent access
- ✅ File system operations

### IPC Handlers
- ✅ All update endpoints
- ✅ Event propagation
- ✅ Error handling
- ✅ Status updates

### React Components
- ✅ UpdateDialog rendering
- ✅ User interactions
- ✅ Loading states
- ✅ Error handling
- ✅ Accessibility

### E2E Flows
- ✅ Complete update flow
- ✅ Error scenarios
- ✅ Performance testing
- ✅ Accessibility testing

## Test Scenarios

### Happy Path
1. App startup with update check
2. Update available notification
3. User interaction with dialog
4. Download and installation

### Error Scenarios
1. Network failures
2. API errors
3. File system errors
4. Invalid data
5. Cache corruption

### Edge Cases
1. Beta releases
2. Pre-release versions
3. Version format variations
4. Concurrent operations
5. App restart during update

## Mock Data

The test suite includes comprehensive mock data:

- **GitHub releases** (stable, beta, pre-release)
- **Version formats** (v1.0.0, 1.0.0, beta)
- **Error scenarios** (network, API, file system)
- **Cache data** (valid, expired, corrupted)
- **Package.json** variations

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mocking
- Use centralized mock setup
- Reset mocks between tests
- Mock external dependencies only

### Assertions
- Test both success and error cases
- Verify side effects (API calls, state changes)
- Check error messages and logging

### Performance
- Use fake timers for time-based tests
- Mock expensive operations
- Test concurrent scenarios

## Debugging Tests

### Common Issues
1. **Mock not working** - Check mock setup and reset
2. **Async timing** - Use proper async/await patterns
3. **State not updating** - Verify useEffect dependencies
4. **E2E flakiness** - Add proper waits and timeouts

### Debug Commands
```bash
# Run specific test file
npm test updateService.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run with debug logs
DEBUG=* npm test

# Run single test
npm test -- --grep "specific test name"
```

## Contributing

When adding new update features:

1. **Add unit tests** for new service methods
2. **Add integration tests** for new IPC handlers
3. **Add component tests** for new UI elements
4. **Add E2E tests** for new user flows
5. **Update mock data** if needed
6. **Update documentation** in this README

## Test Data Management

### Adding New Test Data
1. Add to `updateTestUtils.ts`
2. Export from the module
3. Import in test files
4. Document the purpose

### Updating Mock Data
1. Update the mock in `updateTestMocks.ts`
2. Update any dependent tests
3. Verify all tests still pass
4. Update documentation

## Performance Considerations

### Test Performance
- Use `vi.useFakeTimers()` for time-based tests
- Mock expensive operations (file I/O, network)
- Use `vi.hoisted()` for heavy mocks
- Avoid real API calls in tests

### E2E Performance
- Use `page.waitForSelector()` with timeouts
- Mock external services
- Use `page.waitForFunction()` for async operations
- Clean up after tests

## Security Testing

The test suite includes security-related scenarios:

- **Input validation** - Malformed version strings
- **Error handling** - Sensitive data in error messages
- **File system** - Permission errors
- **Network** - Timeout and rate limiting
- **Cache** - Data corruption and tampering

## Maintenance

### Regular Tasks
1. **Update mock data** when APIs change
2. **Review test coverage** for new features
3. **Update documentation** for test changes
4. **Clean up unused mocks** and test data

### Test Review
1. **Code review** all test changes
2. **Verify coverage** for new features
3. **Check performance** of test suite
4. **Validate E2E** tests work in CI/CD
