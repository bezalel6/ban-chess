# Task Completion Checklist

When completing any development task, follow these steps:

## 1. Code Quality Checks
- [ ] Run type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Fix any linting issues: `npm run lint:fix`

## 2. Testing
- [ ] Run relevant E2E tests based on changes:
  - Auth changes: `npm run test:auth`
  - Game logic: `npm run test:game`
  - Multiplayer: `npm run test:multiplayer`
  - UI/Accessibility: `npm run test:a11y`
- [ ] Verify no test regressions: `npm run test`

## 3. Build Verification
- [ ] Ensure build succeeds: `npm run build`
- [ ] Check for any build warnings or errors

## 4. Manual Testing
- [ ] Test in development environment:
  - Start WebSocket server: `npm run dev:ws`
  - Start Next.js server: `npm run dev:next`
- [ ] Verify feature works as expected
- [ ] Check browser console for errors
- [ ] Test on different screen sizes (mobile responsive)

## 5. Code Review Checklist
- [ ] No duplicate/parallel components created
- [ ] Old code removed when replaced
- [ ] Follows TypeScript conventions
- [ ] No `any` types unless absolutely necessary
- [ ] Proper error handling implemented
- [ ] Component follows single responsibility principle

## 6. Git Workflow
- [ ] Changes on feature branch (not master/main)
- [ ] Meaningful commit messages
- [ ] All changes staged and committed
- [ ] No temporary/debug files committed

## 7. Documentation
- [ ] Update relevant documentation if needed
- [ ] Add comments for complex logic
- [ ] Update CLAUDE.md if conventions change