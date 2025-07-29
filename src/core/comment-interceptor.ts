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
   * GitHub 댓글 form을 찾는 함수 (2024 React UI 대응)
   */
  private findCommentForms(): HTMLFormElement[] {
    const forms: HTMLFormElement[] = [];
    
    // 🎯 새로운 전략: React 컴포넌트 기반 댓글 양식 찾기
    const reactComponentApproach = () => {
      // GitHub의 최신 React 댓글 컴포넌트들
      const commentWrappers = [
        '[class*="IssueCommentComposer"]',
        '[class*="CommentComposer"]', 
        '[class*="CommentBox"]',
        '[class*="commentComposer"]',
        '[class*="react-issue-comment-composer"]',
        '#react-issue-comment-composer'
      ];
      
      commentWrappers.forEach(wrapper => {
        const elements = document.querySelectorAll(wrapper);
        elements.forEach(element => {
          // 컴포넌트 내부의 form 찾기
          const form = element.querySelector('form') || element.closest('form');
          if (form && !forms.includes(form)) {
            const textarea = form.querySelector('textarea');
            if (textarea) {
              forms.push(form as HTMLFormElement);
              if (this.options.debug) {
                console.log('✅ Found React component form:', {
                  wrapper: wrapper,
                  formAction: form.action,
                  textareaClass: textarea.className
                });
              }
            }
          }
        });
      });
    };

    // 🎯 prc- 클래스 기반 textarea로 form 찾기
    const prcBasedApproach = () => {
      const prcTextareas = document.querySelectorAll('textarea[class*="prc-Textarea"], textarea[class*="prc-TextArea"]');
      prcTextareas.forEach(textarea => {
        const form = textarea.closest('form');
        if (form && !forms.includes(form)) {
          forms.push(form as HTMLFormElement);
          if (this.options.debug) {
            console.log('✅ Found prc-based form:', {
              textareaClass: textarea.className,
              textareaId: textarea.id,
              formAction: form.action
            });
          }
        }
      });
    };

    // 🎯 동적 React ID 패턴으로 textarea 찾기
    const dynamicIdApproach = () => {
      const dynamicTextareas = document.querySelectorAll('textarea[id*=":r"]');
      dynamicTextareas.forEach(textarea => {
        const form = textarea.closest('form');
        if (form && !forms.includes(form)) {
          forms.push(form as HTMLFormElement);
          if (this.options.debug) {
            console.log('✅ Found dynamic ID form:', {
              textareaId: textarea.id,
              textareaClass: textarea.className,
              formAction: form.action
            });
          }
        }
      });
    };

    // 🎯 기존 방식들 (fallback)
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
    
    // 각 전략을 순차적으로 실행
    reactComponentApproach();
    prcBasedApproach(); 
    dynamicIdApproach();
    
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
   * Form submit 이벤트를 intercept하는 핸들러
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
   * CommentInterceptor 활성화
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
      console.log('🚀 CommentInterceptor starting...');
    }

    const forms = this.findCommentForms();
    let interceptedCount = 0;

    forms.forEach(form => {
      const textarea = this.findCommentTextarea(form);
      if (textarea && !this.interceptedTextareas.has(textarea)) {
        const handler = this.createSubmitHandler(form, textarea);
        
        // 기존 핸들러 백업
        const existingHandlers = this.originalFormSubmitHandlers.get(form) || [];
        this.originalFormSubmitHandlers.set(form, existingHandlers);
        
        // 새 핸들러 등록 - 여러 이벤트에 대응
        form.addEventListener('submit', handler, true); // capture phase에서 실행
        
        // GitHub의 최신 UI에서는 버튼 클릭으로 AJAX 요청을 보낼 수 있음
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
          button.addEventListener('click', (clickEvent) => {
            if (this.options.debug) {
              console.log('🔔 CommentInterceptor: Submit button clicked', {
                buttonText: button.textContent?.trim(),
                buttonType: button.getAttribute('type')
              });
            }
            // 클릭 이벤트에서도 동일한 로직 적용
            // setTimeout을 사용하여 form submit 이벤트가 발생하기 전에 처리
            setTimeout(() => {
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              handler(submitEvent);
            }, 10);
          }, true);
        });
        
        this.interceptedTextareas.add(textarea);
        interceptedCount++;

        if (this.options.debug) {
          console.log(`📝 Intercepted comment form ${interceptedCount}:`, {
            formAction: form.action,
            textareaName: textarea.name,
            textareaPlaceholder: textarea.placeholder
          });
        }
      }
    });

    this.isActive = true;

    // 동적으로 생성되는 댓글 양식을 감지하기 위한 MutationObserver 시작
    this.startMutationObserver();

    if (this.options.debug) {
      console.log(`✅ CommentInterceptor active - monitoring ${interceptedCount} comment forms`);
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
   * 새로운 댓글 양식을 재검사하여 interceptor 설정
   */
  private recheckCommentForms(): void {
    if (!this.isActive || !this.options.enabled) {
      return;
    }

    const forms = this.findCommentForms();
    let newFormsCount = 0;

    forms.forEach(form => {
      const textarea = this.findCommentTextarea(form);
      if (textarea && !this.interceptedTextareas.has(textarea)) {
        const handler = this.createSubmitHandler(form, textarea);
        
        // 새 핸들러 등록
        form.addEventListener('submit', handler, true);
        
        // GitHub의 최신 UI에서는 버튼 클릭으로 AJAX 요청을 보낼 수 있음
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
          button.addEventListener('click', (clickEvent) => {
            if (this.options.debug) {
              console.log('🔔 CommentInterceptor: Submit button clicked (dynamic)', {
                buttonText: button.textContent?.trim(),
                buttonType: button.getAttribute('type')
              });
            }
            setTimeout(() => {
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              handler(submitEvent);
            }, 10);
          }, true);
        });
        
        this.interceptedTextareas.add(textarea);
        newFormsCount++;
      }
    });

    if (newFormsCount > 0 && this.options.debug) {
      console.log(`✅ CommentInterceptor: Added ${newFormsCount} new dynamic comment form(s)`);
    }
  }

  /**
   * 모든 상태 정보 반환 (디버깅용)
   */
  public getStatus() {
    return {
      enabled: this.options.enabled,
      active: this.isActive,
      interceptedForms: this.originalFormSubmitHandlers.size,
      interceptedTextareas: this.interceptedTextareas.size,
      currentUrl: window.location.href,
      isTranslatableUrl: this.isTranslatableURL(window.location.href),
      mutationObserverActive: !!this.mutationObserver
    };
  }
}