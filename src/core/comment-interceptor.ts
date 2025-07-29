import { TranslationDirection } from './translation';

export interface CommentInterceptorOptions {
  /**
   * 번역이 활성화되어 있는지 여부
   */
  enabled: boolean;
  
  /**
   * 디버그 로그 출력 여부
   */
  debug: boolean;
}

export class CommentInterceptor {
  private options: CommentInterceptorOptions;
  private isActive: boolean = false;
  private originalFormSubmitHandlers: Map<HTMLFormElement, ((event: Event) => void)[]> = new Map();
  private interceptedTextareas: Set<HTMLTextAreaElement> = new Set();
  private mutationObserver: MutationObserver | null = null;

  constructor(options: Partial<CommentInterceptorOptions> = {}) {
    this.options = {
      enabled: true,
      debug: true,
      ...options
    };
  }

  /**
   * URL이 번역 대상인지 확인하는 함수 (URL 기반 필터링)
   */
  private isTranslatableURL(url: string): boolean {
    const pathname = new URL(url).pathname.toLowerCase();
    const isIssuesOrPulls = pathname.includes('/issues') || pathname.includes('/pull');
    
    if (this.options.debug) {
      console.log('🔍 CommentInterceptor URL Check:', {
        url,
        pathname,
        isIssuesOrPulls,
        includes_issues: pathname.includes('/issues'),
        includes_pull: pathname.includes('/pull')
      });
    }
    
    return isIssuesOrPulls;
  }

  /**
   * 텍스트가 한국어 텍스트인지 간단한 휴리스틱으로 판별
   */
  private containsKorean(text: string): boolean {
    const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
    return koreanRegex.test(text);
  }

    /**
   * GitHub 댓글 컴포넌트를 찾는 함수 (Form 없는 2024 React UI 대응)
   */
  private findCommentComponents(): Array<{textarea: HTMLTextAreaElement, container: Element, buttons: HTMLElement[]}> {
    const components: Array<{textarea: HTMLTextAreaElement, container: Element, buttons: HTMLElement[]}> = [];
    
    if (this.options.debug) {
      console.log('🔍 CommentInterceptor: Searching for React comment components (form-less)...');
    }
    
    // 🎯 prc-Textarea 기반으로 댓글 컴포넌트 찾기
    const prcTextareas = document.querySelectorAll('textarea[class*="prc-Textarea"], textarea[class*="prc-TextArea"]');
    
    prcTextareas.forEach(textarea => {
      if (this.isCommentTextarea(textarea as HTMLTextAreaElement)) {
        // React 컨테이너 찾기
        const container = textarea.closest('[class*="IssueCommentComposer"], [class*="CommentComposer"], [class*="CommentBox"]') 
                       || textarea.closest('[id*="comment"]') 
                       || textarea.parentElement?.closest('div');
        
        if (container) {
          // 컨테이너 내부의 submit/comment 버튼들 찾기
          const buttons = this.findCommentButtons(container);
          
          if (buttons.length > 0) {
            components.push({
              textarea: textarea as HTMLTextAreaElement,
              container: container,
              buttons: buttons
            });
            
            if (this.options.debug) {
              console.log('✅ Found React comment component:', {
                textareaId: textarea.id,
                textareaClass: textarea.className,
                containerClass: container.className,
                buttonsCount: buttons.length
              });
            }
          }
        }
      }
    });
    
    // 🎯 React ID 패턴으로 추가 검색
    const dynamicTextareas = document.querySelectorAll('textarea[id*=":r"]');
    dynamicTextareas.forEach(textarea => {
      if (this.isCommentTextarea(textarea as HTMLTextAreaElement)) {
        const existing = components.find(comp => comp.textarea === textarea);
        if (!existing) {
          const container = textarea.closest('[class*="Comment"]') || textarea.parentElement?.closest('div');
          if (container) {
            const buttons = this.findCommentButtons(container);
            if (buttons.length > 0) {
              components.push({
                textarea: textarea as HTMLTextAreaElement,
                container: container,
                buttons: buttons
              });
              
              if (this.options.debug) {
                console.log('✅ Found dynamic ID comment component:', {
                  textareaId: textarea.id,
                  buttonsCount: buttons.length
                });
              }
            }
          }
        }
      }
    });
    
    return components;
  }

  /**
   * 컨테이너 내부의 댓글 제출 버튼들을 찾는 함수
   */
  private findCommentButtons(container: Element): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    
    // 모든 버튼과 클릭 가능한 요소들 검색
    const allButtons = container.querySelectorAll('button, [role="button"], [type="submit"]');
    
    allButtons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      const className = button.className?.toLowerCase() || '';
      
      // 댓글 제출 버튼인지 판별
      if (
        text.includes('comment') || 
        text.includes('submit') ||
        text.includes('reply') ||
        text.includes('post') ||
        ariaLabel.includes('comment') ||
        ariaLabel.includes('submit') ||
        className.includes('submit') ||
        className.includes('comment')
      ) {
        buttons.push(button as HTMLElement);
      }
    });
    
    // 명시적인 submit 버튼이 없으면 모든 버튼 중에서 찾기
    if (buttons.length === 0) {
      const fallbackButtons = container.querySelectorAll('button[type="submit"], button:not([type])');
      fallbackButtons.forEach(btn => {
        // 숨겨진 버튼이나 disabled 버튼은 제외
        const element = btn as HTMLElement;
        if (element.offsetWidth > 0 && element.offsetHeight > 0 && !element.disabled) {
          buttons.push(element);
        }
      });
    }
    
    return buttons;
  }

     /**
    * 기존 form 기반 방식 (fallback)
    */
   private findCommentForms(): HTMLFormElement[] {
     const forms: HTMLFormElement[] = [];
     
     const actionBasedSelectors = [
       'form[action*="/comment"]',
       'form[action*="/comments"]',
       'form[action*="/issues/"][action*="/comments"]',
       'form[action*="/pull/"][action*="/comments"]',
     ];
     
     const dataBasedSelectors = [
       'form[data-target*="comment"]',
       'form[data-turbo-permanent]',
       'form[data-testid*="comment"]',
     ];
     
     const allSelectors = [...actionBasedSelectors, ...dataBasedSelectors];
     
     for (const selector of allSelectors) {
      try {
        // has() 셀렉터나 복잡한 셀렉터 대신 더 단순한 방식으로 처리
        if (selector.includes('textarea[')) {
          // textarea 셀렉터인 경우, textarea의 부모 form을 찾기
          const textareas = document.querySelectorAll(selector) as NodeListOf<HTMLTextAreaElement>;
          textareas.forEach(textarea => {
            const form = textarea.closest('form') as HTMLFormElement;
            if (form && !forms.includes(form)) {
              forms.push(form);
            }
          });
        } else if (selector.includes(':has(')) {
          // :has() 셀렉터는 브라우저 호환성 문제로 건너뛰기
          if (this.options.debug) {
            console.log('⏭️ Skipping :has() selector for compatibility:', selector);
          }
          continue;
        } else {
          // 일반적인 form 셀렉터
          const elements = document.querySelectorAll(selector) as NodeListOf<HTMLFormElement>;
          elements.forEach(form => {
            if (!forms.includes(form)) {
              forms.push(form);
            }
          });
        }
      } catch (error) {
        // querySelector가 실패할 수 있는 복잡한 선택자 무시
        if (this.options.debug) {
          console.warn('🚫 CommentInterceptor selector failed:', selector, error);
        }
      }
    }
    
    // Fallback 전략들 실행
    const textareaBasedApproach = () => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        const form = textarea.closest('form');
        if (form && this.isCommentTextarea(textarea)) {
          if (!forms.includes(form)) {
            forms.push(form);
          }
        }
      });
    };
    
    const structuralApproach = () => {
      const allForms = document.querySelectorAll('form');
      allForms.forEach(form => {
        const textarea = form.querySelector('textarea');
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        
        if (textarea && submitButton && this.isCommentTextarea(textarea)) {
          if (!forms.includes(form)) {
            forms.push(form);
          }
        }
      });
    };
    
    textareaBasedApproach();
    structuralApproach();

    if (this.options.debug) {
      console.log('📝 Found comment forms:', forms.length);
      forms.forEach((form, index) => {
        console.log(`   Form ${index + 1}:`, {
          action: form.action,
          method: form.method,
          classList: form.className,
          textareas: form.querySelectorAll('textarea').length
        });
      });
    }

    return forms;
  }

  /**
   * Textarea가 댓글 입력 필드인지 판별하는 헬퍼 메서드 (2024 React UI 대응)
   */
  private isCommentTextarea(textarea: HTMLTextAreaElement): boolean {
    // 🎯 prc-Textarea 클래스 확인 (GitHub 최신 패턴)
    const className = textarea.className?.toLowerCase();
    if (className && (
      className.includes('prc-textarea') ||
      className.includes('prc-textinput') ||
      className.includes('commentbox') ||
      className.includes('comment-box')
    )) {
      return true;
    }

    // 🎯 동적 React ID 패턴 확인
    const id = textarea.id;
    if (id && id.includes(':r')) {
      // React의 동적 ID인 경우, 부모 컨테이너에서 댓글 관련 클래스 확인
      const parentContainer = textarea.closest('[class*="Comment"], [class*="comment"]');
      if (parentContainer) {
        return true;
      }
    }

    // 🎯 부모 컨테이너의 React 컴포넌트명 확인
    const reactCommentContainer = textarea.closest('[class*="IssueCommentComposer"], [class*="CommentComposer"], [class*="CommentBox"]');
    if (reactCommentContainer) {
      return true;
    }
    
    // name 속성 확인
    const name = textarea.name?.toLowerCase();
    if (name && (name.includes('comment') || name.includes('body'))) {
      return true;
    }
    
    // placeholder 확인
    const placeholder = textarea.placeholder?.toLowerCase();
    if (placeholder && (
      placeholder.includes('comment') ||
      placeholder.includes('leave a comment') ||
      placeholder.includes('add a comment') ||
      placeholder.includes('write a comment')
    )) {
      return true;
    }
    
    // aria-label 확인
    const ariaLabel = textarea.getAttribute('aria-label')?.toLowerCase();
    if (ariaLabel && (
      ariaLabel.includes('comment') ||
      ariaLabel.includes('leave a comment') ||
      ariaLabel.includes('add a comment') ||
      ariaLabel.includes('write a comment')
    )) {
      return true;
    }
    
    // data 속성 확인
    const dataTestId = textarea.getAttribute('data-testid')?.toLowerCase();
    if (dataTestId && dataTestId.includes('comment')) {
      return true;
    }
    
    // 부모 form의 action으로 확인
    const form = textarea.closest('form');
    if (form?.action && form.action.includes('comment')) {
      return true;
    }
    
    return false;
  }

  /**
   * Form 내의 댓글 textarea를 찾는 함수 (동적 클래스명 대응)
   */
  private findCommentTextarea(form: HTMLFormElement): HTMLTextAreaElement | null {
    // 모든 textarea를 찾아서 댓글 텍스트 영역인지 확인
    const textareas = form.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
    
    for (const textarea of textareas) {
      if (this.isCommentTextarea(textarea)) {
        if (this.options.debug) {
          console.log(`✅ Found comment textarea:`, {
            name: textarea.name,
            placeholder: textarea.placeholder,
            ariaLabel: textarea.getAttribute('aria-label'),
            className: textarea.className
          });
        }
        return textarea;
      }
    }

    if (this.options.debug) {
      console.warn('❌ No comment textarea found in form:', form);
      console.log('Available textareas:', Array.from(textareas).map(ta => ({
        name: ta.name,
        placeholder: ta.placeholder,
        ariaLabel: ta.getAttribute('aria-label')
      })));
    }
    return null;
  }

  /**
   * 번역 요청을 background script에 전송
   */
  private async translateText(text: string, direction: TranslationDirection): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.options.debug) {
        console.log('🌐 CommentInterceptor sending translation request:', {
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          direction
        });
      }

      chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text: text,
        direction: direction
      }, (response) => {
        if (chrome.runtime.lastError) {
          const error = `Chrome runtime error: ${chrome.runtime.lastError.message}`;
          console.error('❌ CommentInterceptor translation failed:', error);
          reject(new Error(error));
          return;
        }

        if (response && response.success) {
          if (this.options.debug) {
            console.log('✅ CommentInterceptor translation succeeded:', {
              original: text.substring(0, 30) + '...',
              translated: response.translatedText.substring(0, 30) + '...'
            });
          }
          resolve(response.translatedText);
        } else {
          const error = `Translation failed: ${response?.error || 'Unknown error'}`;
          console.error('❌ CommentInterceptor translation failed:', error);
          reject(new Error(error));
        }
      });
    });
  }

  /**
   * React 버튼 클릭을 intercept하는 핸들러 (Form 없는 GitHub 2024 UI)
   */
  private createReactButtonHandler(textarea: HTMLTextAreaElement, buttons: HTMLElement[]) {
    return async (event: Event) => {
      if (this.options.debug) {
        console.log('🔔 CommentInterceptor: React button clicked', {
          eventType: event.type,
          buttonText: (event.target as HTMLElement)?.textContent?.trim(),
          textareaValue: textarea.value?.substring(0, 50) + '...'
        });
      }

      // URL 필터링 체크
      if (!this.isTranslatableURL(window.location.href)) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - URL not translatable');
        }
        return; // 번역하지 않고 그대로 진행
      }

      if (!this.options.enabled) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - disabled');
        }
        return; // 번역하지 않고 그대로 진행
      }

      const text = textarea.value.trim();
      
      // 텍스트가 비어있으면 번역하지 않음
      if (!text) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - empty text');
        }
        return;
      }

      // 한국어가 포함되어 있지 않으면 번역하지 않음
      if (!this.containsKorean(text)) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - no Korean text detected');
          console.log('   Text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
        return;
      }

      // 버튼 클릭을 중단하고 번역 수행
      event.preventDefault();
      event.stopPropagation();

      if (this.options.debug) {
        console.log('🛑 CommentInterceptor: Button click intercepted for translation');
        console.log('   Korean text detected:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      }

      try {
        // 버튼 비활성화 (중복 제출 방지)
        const clickedButton = event.target as HTMLElement;
        buttons.forEach(button => {
          (button as any).disabled = true;
        });

        // 번역 진행 표시
        const originalValue = textarea.value;
        textarea.value = '🔄 번역 중... (Translating...)';
        textarea.disabled = true;

        // 한국어 → 영어 번역 실행
        const translatedText = await this.translateText(text, TranslationDirection.KO_TO_EN);

        // 번역된 텍스트로 교체
        textarea.value = translatedText;
        textarea.disabled = false;

        // 버튼 재활성화
        buttons.forEach(button => {
          (button as any).disabled = false;
        });

        if (this.options.debug) {
          console.log('✅ CommentInterceptor: Translation completed, triggering original click');
          console.log('   Translated text:', translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : ''));
        }

        // 번역된 텍스트로 원래 버튼 클릭 시뮬레이션
        // 이번에는 Korean detection을 우회하기 위해 interceptor를 일시적으로 비활성화
        this.setEnabled(false);
        
        if (this.options.debug) {
          console.log('🚀 CommentInterceptor: Simulating original button click');
        }
        
        // 원래 클릭된 버튼을 다시 클릭
        setTimeout(() => {
          clickedButton.click();
          
          // 제출 후 잠깐 대기하고 원상태로 복구 (SPA 환경 고려)
          setTimeout(() => {
            this.setEnabled(true);
            textarea.value = originalValue; // 원본 한국어 텍스트로 복원 (사용자 편의)
            if (this.options.debug) {
              console.log('🔄 CommentInterceptor: Restored original Korean text for user convenience');
            }
          }, 1000);
        }, 100);

      } catch (error) {
        // 번역 실패 시 원본 텍스트 복원
        textarea.value = text;
        textarea.disabled = false;

        // 버튼 재활성화
        buttons.forEach(button => {
          (button as any).disabled = false;
        });

        console.error('❌ CommentInterceptor: Translation failed:', error);
        
        // 사용자에게 오류 알림
        alert(`번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n원본 텍스트로 다시 시도하시거나, 영어로 직접 작성해주세요.`);
      }
    };
  }

  /**
   * Form submit 이벤트를 intercept하는 핸들러 (레거시 지원)
   * GitHub의 AJAX/Fetch 기반 submit과 일반 form submit 모두 처리
   */
  private createSubmitHandler(form: HTMLFormElement, textarea: HTMLTextAreaElement) {
    return async (event: Event) => {
      if (this.options.debug) {
        console.log('🔔 CommentInterceptor: Form submit event detected', {
          eventType: event.type,
          target: event.target,
          formAction: form.action,
          textareaValue: textarea.value?.substring(0, 50) + '...'
        });
      }
      // URL 필터링 체크
      if (!this.isTranslatableURL(window.location.href)) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - URL not translatable');
        }
        return; // 번역하지 않고 그대로 진행
      }

      if (!this.options.enabled) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - disabled');
        }
        return; // 번역하지 않고 그대로 진행
      }

      const text = textarea.value.trim();
      
      // 텍스트가 비어있으면 번역하지 않음
      if (!text) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - empty text');
        }
        return;
      }

      // 한국어가 포함되어 있지 않으면 번역하지 않음
      if (!this.containsKorean(text)) {
        if (this.options.debug) {
          console.log('⏭️ CommentInterceptor: Skipping - no Korean text detected');
          console.log('   Text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
        return;
      }

      // Form submit을 중단하고 번역 수행
      event.preventDefault();
      event.stopPropagation();

      if (this.options.debug) {
        console.log('🛑 CommentInterceptor: Form submit intercepted for translation');
        console.log('   Korean text detected:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      }

      try {
        // 버튼 비활성화 (중복 제출 방지)
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
          (button as HTMLButtonElement | HTMLInputElement).disabled = true;
        });

        // 번역 진행 표시
        const originalValue = textarea.value;
        textarea.value = '🔄 번역 중... (Translating...)';
        textarea.disabled = true;

        // 한국어 → 영어 번역 실행
        const translatedText = await this.translateText(text, TranslationDirection.KO_TO_EN);

        // 번역된 텍스트로 교체
        textarea.value = translatedText;
        textarea.disabled = false;

        // 버튼 재활성화
        submitButtons.forEach(button => {
          (button as HTMLButtonElement | HTMLInputElement).disabled = false;
        });

        if (this.options.debug) {
          console.log('✅ CommentInterceptor: Translation completed, submitting form');
          console.log('   Translated text:', translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : ''));
        }

        // 번역된 텍스트로 form을 다시 제출
        // 이번에는 Korean detection을 우회하기 위해 interceptor를 일시적으로 비활성화
        this.setEnabled(false);
        
        if (this.options.debug) {
          console.log('🚀 CommentInterceptor: Submitting form with translated text');
        }
        
        // GitHub의 최신 UI는 AJAX/Fetch 기반일 수 있으므로 다양한 방법으로 시도
        try {
          // 1. 기본 form.submit() 시도
          form.submit();
        } catch (error) {
          if (this.options.debug) {
            console.warn('⚠️ form.submit() failed, trying alternative methods:', error);
          }
          
          // 2. Submit 버튼 클릭 시뮬레이션
          const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          if (submitButton) {
            submitButton.click();
          } else {
            // 3. 수동으로 submit 이벤트 발생
            const submitEvent = new Event('submit', { bubbles: true, cancelable: false });
            form.dispatchEvent(submitEvent);
          }
        }
        
        // 제출 후 잠깐 대기하고 원상태로 복구 (SPA 환경 고려)
        setTimeout(() => {
          this.setEnabled(true);
          textarea.value = originalValue; // 원본 한국어 텍스트로 복원 (사용자 편의)
          if (this.options.debug) {
            console.log('🔄 CommentInterceptor: Restored original Korean text for user convenience');
          }
        }, 1000);

      } catch (error) {
        // 번역 실패 시 원본 텍스트 복원
        textarea.value = text;
        textarea.disabled = false;

        // 버튼 재활성화
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
          (button as HTMLButtonElement | HTMLInputElement).disabled = false;
        });

        console.error('❌ CommentInterceptor: Translation failed:', error);
        
        // 사용자에게 오류 알림
        alert(`번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n원본 텍스트로 다시 시도하시거나, 영어로 직접 작성해주세요.`);
      }
    };
  }

  /**
   * CommentInterceptor 활성화 (React 컴포넌트 방식)
   */
  public start(): void {
    if (this.isActive) {
      if (this.options.debug) {
        console.log('⚠️ CommentInterceptor already active');
      }
      return;
    }

    // URL 필터링 체크
    if (!this.isTranslatableURL(window.location.href)) {
      if (this.options.debug) {
        console.log('⏭️ CommentInterceptor: Not starting - URL not translatable');
      }
      return;
    }

    if (this.options.debug) {
      console.log('🚀 CommentInterceptor starting (React mode)...');
    }

    // 🎯 새로운 방식: React 컴포넌트 기반 처리
    const components = this.findCommentComponents();
    let interceptedCount = 0;

    components.forEach(component => {
      const { textarea, container, buttons } = component;
      
      if (!this.interceptedTextareas.has(textarea)) {
        // React 컴포넌트용 버튼 클릭 핸들러 생성
        const handler = this.createReactButtonHandler(textarea, buttons);
        
        // 모든 관련 버튼에 클릭 리스너 추가
        buttons.forEach((button, index) => {
          button.addEventListener('click', handler, true); // capture phase에서 실행
          
          if (this.options.debug) {
            console.log(`🔔 Added click listener to button ${index + 1}:`, {
              buttonText: button.textContent?.trim(),
              buttonClass: button.className
            });
          }
        });
        
        this.interceptedTextareas.add(textarea);
        interceptedCount++;

        if (this.options.debug) {
          console.log(`📝 Intercepted React comment component ${interceptedCount}:`, {
            textareaId: textarea.id,
            textareaClass: textarea.className,
            containerClass: container.className,
            buttonsCount: buttons.length
          });
        }
      }
    });

    // 🎯 Fallback: 기존 form 방식도 시도
    const forms = this.findCommentForms();
    forms.forEach(form => {
      const textarea = this.findCommentTextarea(form);
      if (textarea && !this.interceptedTextareas.has(textarea)) {
        const handler = this.createSubmitHandler(form, textarea);
        form.addEventListener('submit', handler, true);
        this.interceptedTextareas.add(textarea);
        interceptedCount++;
        
        if (this.options.debug) {
          console.log(`📝 Intercepted legacy form ${interceptedCount}:`, {
            formAction: form.action,
            textareaName: textarea.name
          });
        }
      }
    });

    this.isActive = true;

    // 동적으로 생성되는 댓글 양식을 감지하기 위한 MutationObserver 시작
    this.startMutationObserver();

    if (this.options.debug) {
      console.log(`✅ CommentInterceptor active - monitoring ${interceptedCount} comment components`);
    }
  }

  /**
   * CommentInterceptor 비활성화
   */
  public stop(): void {
    if (!this.isActive) {
      if (this.options.debug) {
        console.log('⚠️ CommentInterceptor already inactive');
      }
      return;
    }

    if (this.options.debug) {
      console.log('🛑 CommentInterceptor stopping...');
    }

    // MutationObserver 중지
    this.stopMutationObserver();
    
    // 모든 이벤트 리스너 제거
    this.originalFormSubmitHandlers.clear();
    this.interceptedTextareas.clear();
    
    this.isActive = false;

    if (this.options.debug) {
      console.log('✅ CommentInterceptor stopped');
    }
  }

  /**
   * 활성화 상태 변경
   */
  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    if (this.options.debug) {
      console.log(`🔧 CommentInterceptor enabled: ${enabled}`);
    }
  }

  /**
   * 현재 활성화 상태 반환
   */
  public isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * 현재 실행 상태 반환
   */
  public isRunning(): boolean {
    return this.isActive;
  }

  /**
   * 동적으로 생성되는 댓글 양식을 감지하는 MutationObserver 시작
   */
  private startMutationObserver(): void {
    if (this.mutationObserver) {
      return; // 이미 실행 중
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRecheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // 새로운 form이나 textarea가 추가되었는지 확인
              if (
                element.tagName === 'FORM' ||
                element.querySelector?.('form') ||
                element.tagName === 'TEXTAREA' ||
                element.querySelector?.('textarea')
              ) {
                shouldRecheck = true;
                if (this.options.debug) {
                  console.log('🔍 CommentInterceptor: New form/textarea detected, rechecking...');
                }
              }
            }
          });
        }
      });

      if (shouldRecheck) {
        // 디바운스된 재실행
        setTimeout(() => {
          this.recheckCommentForms();
        }, 500);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    if (this.options.debug) {
      console.log('🔍 CommentInterceptor: MutationObserver started for dynamic forms');
    }
  }

  /**
   * MutationObserver 중지
   */
  private stopMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
      if (this.options.debug) {
        console.log('🔍 CommentInterceptor: MutationObserver stopped');
      }
    }
  }

  /**
   * 새로운 댓글 양식을 재검사하여 interceptor 설정 (React + Form 방식)
   */
  private recheckCommentForms(): void {
    if (!this.isActive || !this.options.enabled) {
      return;
    }

    let newComponentsCount = 0;

    // 🎯 React 컴포넌트 방식 재검사
    const components = this.findCommentComponents();
    components.forEach(component => {
      const { textarea, container, buttons } = component;
      
      if (!this.interceptedTextareas.has(textarea)) {
        const handler = this.createReactButtonHandler(textarea, buttons);
        
        buttons.forEach(button => {
          button.addEventListener('click', handler, true);
        });
        
        this.interceptedTextareas.add(textarea);
        newComponentsCount++;
        
        if (this.options.debug) {
          console.log(`✅ Added dynamic React component ${newComponentsCount}:`, {
            textareaId: textarea.id,
            buttonsCount: buttons.length
          });
        }
      }
    });

    // 🎯 레거시 Form 방식 재검사
    const forms = this.findCommentForms();
    forms.forEach(form => {
      const textarea = this.findCommentTextarea(form);
      if (textarea && !this.interceptedTextareas.has(textarea)) {
        const handler = this.createSubmitHandler(form, textarea);
        form.addEventListener('submit', handler, true);
        this.interceptedTextareas.add(textarea);
        newComponentsCount++;
        
        if (this.options.debug) {
          console.log(`✅ Added dynamic legacy form ${newComponentsCount}:`, {
            formAction: form.action
          });
        }
      }
    });

    if (newComponentsCount > 0 && this.options.debug) {
      console.log(`✅ CommentInterceptor: Added ${newComponentsCount} new dynamic comment component(s)`);
    }
  }

  /**
   * 모든 상태 정보 반환 (디버깅용)
   */
  public getStatus() {
    return {
      enabled: this.options.enabled,
      active: this.isActive,
      interceptedForms: this.originalFormSubmitHandlers.size, // 레거시 form 개수
      interceptedTextareas: this.interceptedTextareas.size, // React 컴포넌트 + form 총 개수
      currentUrl: window.location.href,
      isTranslatableUrl: this.isTranslatableURL(window.location.href),
      mutationObserverActive: !!this.mutationObserver
    };
  }
}