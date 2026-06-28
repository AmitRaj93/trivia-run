# Fix: Invalidate Quiz Cache When File Changes

## Problem

The quiz content is cached in memory on server startup and **never invalidated**, causing outdated answers to persist even after editing `content/quiz.json`. 

### Steps to Reproduce
1. Start the server: `npm run dev`
2. Load the quiz in the browser (answers are cached)
3. Edit `content/quiz.json` and change an answer
4. Refresh the browser
5. **Expected**: New answer displays
6. **Actual (before fix)**: Old answer still shows

## Root Cause

In `lib/content.js`, the `loadQuiz()` function caches the quiz and returns it on every subsequent call without checking if the file has been modified:

```javascript
export function loadQuiz() {
  if (cache) return cache;  // ← Always returns stale cache
  const raw = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  cache = { ... };
  return cache;
}
```

## Solution

Track the file's modification time (`mtime`) and invalidate the cache when the file changes:

1. **Import `statSync`** to check file metadata
2. **Track `cachedMtime`** alongside the cached quiz
3. **Compare modification times** before returning cached data
4. **Reload the quiz** if the file has been modified
5. **Add error handling** to gracefully handle invalid JSON without crashing

### Changes Made
- ✅ Detects file changes via modification timestamp comparison
- ✅ Automatically reloads quiz when `content/quiz.json` is updated
- ✅ Prevents crashes from malformed JSON with fallback to cached or minimal quiz
- ✅ No breaking changes to the public API

## Technical Details

**File Modified**: `lib/content.js`
- **Lines Changed**: 29 additions, 9 deletions
- **Key Addition**: 
  ```javascript
  const stats = statSync(CONTENT_PATH);
  const mtime = stats.mtimeMs;
  
  if (cache && cachedMtime === mtime) {
    return cache;
  }
  ```

## Testing

Since this project doesn't have automated tests, verify manually:

```bash
npm run dev
```

### Test 1: Cache Invalidation
1. Open the app and load a quiz
2. Edit an answer in `content/quiz.json` (e.g., change "Mars" to "Venus")
3. Refresh the browser
4. Verify the **new answer appears** (not the old one)

### Test 2: Error Handling
1. Intentionally break `content/quiz.json` (add invalid JSON syntax)
2. Reload the app
3. Verify it **doesn't crash**
4. Check console for error message
5. Fix the JSON and reload
6. Verify the quiz loads correctly again

## Impact

- **Scope**: Server-side quiz loading only
- **Breaking Changes**: None
- **Performance**: Negligible (file stat is ~1ms per load)
- **Affected Users**: Anyone running this locally and editing quizzes during development

## Related

Fixes the issue where answers from `content/quiz.json` don't render correctly after manual updates.
