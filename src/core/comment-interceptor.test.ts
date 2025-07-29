import { CommentInterceptor } from './comment-interceptor';
import { TranslationDirection } from './translation';

// Chrome API 모킹
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

// @ts-ignore
global.chrome = mockChrome;

// HTMLFormElement.prototype.submit 모킹 (jsdom에서 구현되지 않음)
HTMLFormElement.prototype.submit = jest.fn();

describe('CommentInterceptor', () => {
  let interceptor: CommentInterceptor;
  
  beforeEach(() => {
    // DOM 초기화
    document.body.innerHTML = '';
    
    // Chrome API 모킹 초기화
    mockChrome.runtime.sendMessage.mockClear();
    mockChrome.runtime.lastError = null;
    
    // HTMLFormElement.submit 모킹 초기화
    (HTMLFormElement.prototype.submit as jest.Mock).mockClear();
    
    // window.location 모킹
    delete (window as any).location;
    (window as any).location = new URL('https://github.com/owner/repo/issues');
    
    interceptor = new CommentInterceptor({
      enabled: true,
      debug: false // 테스트에서는 로그 출력 안함
    });
  });

  afterEach(() => {
    if (interceptor) {
      interceptor.stop();
    }
  });

  describe('URL-based filtering', () => {
    test('should detect translatable URLs correctly', () => {
      // given - URL이 issues 또는 pull을 포함하는지 테스트
      const testCases = [
        { url: 'https://github.com/owner/repo/issues', expected: true },
        { url: 'https://github.com/owner/repo/issues/123', expected: true },
        { url: 'https://github.com/owner/repo/pull/456', expected: true },
        { url: 'https://github.com/owner/repo/pulls', expected: true },
        { url: 'https://github.com/owner/repo', expected: false },
        { url: 'https://github.com/owner/repo/commits', expected: false },
        { url: 'https://github.com/owner/repo/settings', expected: false }
      ];

      testCases.forEach(({ url, expected }) => {
        // when
        (window as any).location = new URL(url);
        const result = (interceptor as any).isTranslatableURL(url);
        
        // then
        expect(result).toBe(expected);
      });
    });

    test('should not start on non-translatable URLs', () => {
      // given
      (window as any).location = new URL('https://github.com/owner/repo/settings');
      
      // when
      interceptor.start();
      
      // then
      expect(interceptor.isRunning()).toBe(false);
    });
  });

  describe('Korean text detection', () => {
    test('should detect Korean text correctly', () => {
      // given - 한국어 텍스트 감지 테스트
      const testCases = [
        { text: '안녕하세요!', expected: true },
        { text: 'Hello world', expected: false },
        { text: '이것은 영어와 Korean이 섞인 텍스트입니다.', expected: true },
        { text: 'This is English with 한글 mixed in.', expected: true },
        { text: '123456', expected: false },
        { text: '!@#$%^&*()', expected: false },
        { text: '', expected: false }
      ];

      testCases.forEach(({ text, expected }) => {
        // when
        const result = (interceptor as any).containsKorean(text);
        
        // then
        expect(result).toBe(expected);
      });
    });
  });

  describe('Comment form detection', () => {
    test('should find GitHub comment forms with standard selectors', () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]" placeholder="Leave a comment"></textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      // when
      const forms = (interceptor as any).findCommentForms();

      // then
      expect(forms).toHaveLength(1);
      expect(forms[0].classList.contains('js-new-comment-form')).toBe(true);
    });

    test('should find GitHub comment forms with various selectors', () => {
      // given
      document.body.innerHTML = `
        <form action="/owner/repo/issues/123/comments" method="post">
          <textarea name="body" aria-label="Add a comment"></textarea>
          <button type="submit">Submit</button>
        </form>
        <form class="comment-form">
          <textarea placeholder="Write a comment..."></textarea>
          <input type="submit" value="Post"/>
        </form>
      `;

      // when
      const forms = (interceptor as any).findCommentForms();

      // then
      expect(forms.length).toBeGreaterThanOrEqual(1);
    });

    test('should find textarea in comment form', () => {
      // given
      const form = document.createElement('form');
      form.innerHTML = `
        <textarea name="comment[body]" placeholder="Leave a comment"></textarea>
        <button type="submit">Comment</button>
      `;
      document.body.appendChild(form);

      // when
      const textarea = (interceptor as any).findCommentTextarea(form);

      // then
      expect(textarea).not.toBeNull();
      expect(textarea.name).toBe('comment[body]');
    });

    test('should return null when no textarea found', () => {
      // given
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="title"/>
        <button type="submit">Submit</button>
      `;
      document.body.appendChild(form);

      // when
      const textarea = (interceptor as any).findCommentTextarea(form);

      // then
      expect(textarea).toBeNull();
    });
  });

  describe('Translation functionality', () => {
    test('should send translation request to background script', async () => {
      // given
      const mockResponse = { success: true, translatedText: 'Hello, world!' };
      mockChrome.runtime.sendMessage.mockImplementation((request, callback) => {
        callback(mockResponse);
      });

      const testText = '안녕하세요, 세상!';

      // when
      const result = await (interceptor as any).translateText(testText, TranslationDirection.KO_TO_EN);

      // then
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TRANSLATE',
        text: testText,
        direction: TranslationDirection.KO_TO_EN
      }, expect.any(Function));
      expect(result).toBe('Hello, world!');
    });

    test('should handle translation errors', async () => {
      // given
      const mockResponse = { success: false, error: 'Translation failed' };
      mockChrome.runtime.sendMessage.mockImplementation((request, callback) => {
        callback(mockResponse);
      });

      // when & then
      await expect((interceptor as any).translateText('안녕하세요', TranslationDirection.KO_TO_EN))
        .rejects.toThrow('Translation failed: Translation failed');
    });

    test('should handle Chrome runtime errors', async () => {
      // given
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      mockChrome.runtime.sendMessage.mockImplementation((request, callback) => {
        callback(null);
      });

      // when & then
      await expect((interceptor as any).translateText('안녕하세요', TranslationDirection.KO_TO_EN))
        .rejects.toThrow('Chrome runtime error: Extension context invalidated');
    });
  });

  describe('Form submission interception', () => {
    test('should intercept form with Korean text', async () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]">안녕하세요, 이것은 테스트입니다.</textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      const form = document.querySelector('form') as HTMLFormElement;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
      
      // Mock translation response
      mockChrome.runtime.sendMessage.mockImplementation((request, callback) => {
        callback({ success: true, translatedText: 'Hello, this is a test.' });
      });

      let submitPrevented = false;
      const handler = (interceptor as any).createSubmitHandler(form, textarea);

      // when
      const event = new Event('submit', { bubbles: true, cancelable: true });
      event.preventDefault = jest.fn(() => { submitPrevented = true; });
      event.stopPropagation = jest.fn();

      await handler(event);

      // then
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(submitPrevented).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
      expect(HTMLFormElement.prototype.submit).toHaveBeenCalled();
    });

    test('should not intercept form with English text', async () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]">Hello, this is English text.</textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      const form = document.querySelector('form') as HTMLFormElement;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
      
      let submitPrevented = false;
      const handler = (interceptor as any).createSubmitHandler(form, textarea);

      // when
      const event = new Event('submit', { bubbles: true, cancelable: true });
      event.preventDefault = jest.fn(() => { submitPrevented = true; });

      await handler(event);

      // then
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(submitPrevented).toBe(false);
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('should not intercept when interceptor is disabled', async () => {
      // given
      interceptor.setEnabled(false);
      
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]">안녕하세요</textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      const form = document.querySelector('form') as HTMLFormElement;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
      
      let submitPrevented = false;
      const handler = (interceptor as any).createSubmitHandler(form, textarea);

      // when
      const event = new Event('submit', { bubbles: true, cancelable: true });
      event.preventDefault = jest.fn(() => { submitPrevented = true; });

      await handler(event);

      // then
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(submitPrevented).toBe(false);
    });

    test('should not intercept empty textarea', async () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]">   </textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      const form = document.querySelector('form') as HTMLFormElement;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
      
      let submitPrevented = false;
      const handler = (interceptor as any).createSubmitHandler(form, textarea);

      // when
      const event = new Event('submit', { bubbles: true, cancelable: true });
      event.preventDefault = jest.fn(() => { submitPrevented = true; });

      await handler(event);

      // then
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(submitPrevented).toBe(false);
    });
  });

  describe('Interceptor lifecycle', () => {
    test('should start and stop correctly', () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]"></textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      // when - start
      interceptor.start();

      // then
      expect(interceptor.isRunning()).toBe(true);

      // when - stop
      interceptor.stop();

      // then
      expect(interceptor.isRunning()).toBe(false);
    });

    test('should not start twice', () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]"></textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      // when
      interceptor.start();
      const firstStatus = interceptor.getStatus();
      
      interceptor.start(); // 두 번째 시작 시도
      const secondStatus = interceptor.getStatus();

      // then
      expect(firstStatus.active).toBe(true);
      expect(secondStatus.active).toBe(true);
      expect(firstStatus.interceptedForms).toBe(secondStatus.interceptedForms);
    });

    test('should toggle enabled state', () => {
      // given
      expect(interceptor.isEnabled()).toBe(true);

      // when
      interceptor.setEnabled(false);

      // then
      expect(interceptor.isEnabled()).toBe(false);

      // when
      interceptor.setEnabled(true);

      // then
      expect(interceptor.isEnabled()).toBe(true);
    });

    test('should return correct status', () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]"></textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      // when
      interceptor.start();
      const status = interceptor.getStatus();

      // then
      expect(status).toEqual({
        enabled: true,
        active: true,
        interceptedForms: expect.any(Number),
        interceptedTextareas: expect.any(Number),
        currentUrl: 'https://github.com/owner/repo/issues',
        isTranslatableUrl: true
      });
    });
  });

  describe('Error handling', () => {
    test('should handle translation failure gracefully', async () => {
      // given
      document.body.innerHTML = `
        <form class="js-new-comment-form" method="post">
          <textarea name="comment[body]">번역 실패 테스트</textarea>
          <button type="submit">Comment</button>
        </form>
      `;

      const form = document.querySelector('form') as HTMLFormElement;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
      const originalText = textarea.value;
      
      // Mock translation failure
      mockChrome.runtime.sendMessage.mockImplementation((request, callback) => {
        callback({ success: false, error: 'API quota exceeded' });
      });

      // Mock alert
      window.alert = jest.fn();

      const handler = (interceptor as any).createSubmitHandler(form, textarea);

      // when
      const event = new Event('submit', { bubbles: true, cancelable: true });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      await handler(event);

      // then
      expect(textarea.value).toBe(originalText); // 원본 텍스트로 복원
      expect(textarea.disabled).toBe(false); // textarea 활성화 복원
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('API quota exceeded')
      );
    });
  });
});