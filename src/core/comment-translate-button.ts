import { TranslationDirection } from './translation';

interface CommentTranslateButtonOptions {
  enabled: boolean;
  debug: boolean;
}

interface CommentComponent {
  textarea: HTMLTextAreaElement;
  container: Element;
  translateButton?: HTMLButtonElement;
}

export class CommentTranslateButton {
  private options: CommentTranslateButtonOptions;
  private isActive: boolean = false;
  private components: CommentComponent[] = [];
  private mutationObserver: MutationObserver | null = null;

  constructor(options: Partial<CommentTranslateButtonOptions> = {}) {
    this.options = {
      enabled: true,
      debug: false,
      ...options
    };
  }

  /**
   * 번역 버튼 시스템 시작
   */
  public start(): void {
    if (this.isActive) {
      if (this.options.debug) {
        console.log('⚠️ CommentTranslateButton already active');
      }
      return;
    }

    if (!this.isTranslatableURL(window.location.href)) {
      if (this.options.debug) {
        console.log('⏭️ CommentTranslateButton: Not starting - URL not translatable');
      }
      return;
    }

    if (this.options.debug) {
      console.log('🚀 CommentTranslateButton starting...');
    }

    this.findAndAddTranslateButtons();
    this.startMutationObserver();
    this.isActive = true;

    if (this.options.debug) {
      console.log(`✅ CommentTranslateButton active - monitoring ${this.components.length} comment areas`);
    }
  }

  /**
   * 번역 버튼 시스템 중지
   */
  public stop(): void {
    if (!this.isActive) return;

    // 모든 번역 버튼 제거
    this.components.forEach(component => {
      if (component.translateButton && component.translateButton.parentNode) {
        component.translateButton.parentNode.removeChild(component.translateButton);
      }
    });

    this.components = [];
    this.stopMutationObserver();
    this.isActive = false;

    if (this.options.debug) {
      console.log('🛑 CommentTranslateButton stopped');
    }
  }

  /**
   * 댓글 영역을 찾아서 번역 버튼 추가
   */
  private findAndAddTranslateButtons(): void {
    // GitHub 댓글 textarea 찾기
    const textareas = document.querySelectorAll('textarea[class*="prc-Textarea"], textarea[id*=":r"]');
    
    textareas.forEach(textarea => {
      const textareaElement = textarea as HTMLTextAreaElement;
      
      if (this.isCommentTextarea(textareaElement) && !this.isTextareaAlreadyHandled(textareaElement)) {
        const container = this.findCommentContainer(textareaElement);
        if (container) {
          const translateButton = this.createTranslateButton(textareaElement);
          this.addButtonToContainer(container, translateButton);
          
          const component: CommentComponent = {
            textarea: textareaElement,
            container: container,
            translateButton: translateButton
          };
          
          this.components.push(component);
          
          if (this.options.debug) {
            console.log('✅ Added translate button to comment area:', {
              textareaId: textareaElement.id,
              containerClass: container.className
            });
          }
        }
      }
    });
  }

  /**
   * 댓글 컨테이너 찾기
   */
  private findCommentContainer(textarea: HTMLTextAreaElement): Element | null {
    // 다양한 방법으로 댓글 컨테이너 찾기
    return textarea.closest('[class*="IssueCommentComposer"], [class*="CommentComposer"], [class*="CommentBox"]') ||
           textarea.closest('[class*="comment"], [id*="comment"]') ||
           textarea.closest('form') ||
           textarea.parentElement?.closest('div');
  }

  /**
   * 번역 버튼 생성
   */
  private createTranslateButton(textarea: HTMLTextAreaElement): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm github-translator-btn';
    button.innerHTML = '🌐 번역 후 댓글';
    button.title = '한국어를 영어로 번역하여 댓글을 작성합니다';
    
    // 스타일링
    button.style.cssText = `
      margin-left: 8px;
      background: linear-gradient(135deg, #0969da, #218bff);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    `;

    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #0860ca, #1f7ce8)';
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #0969da, #218bff)';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
    });

    // 클릭 이벤트
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleTranslateAndComment(textarea, button);
    });

    return button;
  }

  /**
   * 컨테이너에 버튼 추가
   */
  private addButtonToContainer(container: Element, button: HTMLButtonElement): void {
    // 기존 버튼 영역 찾기
    const buttonContainer = container.querySelector('.form-actions, .comment-form-actions, [class*="actions"]') ||
                          container.querySelector('.d-flex') ||
                          container.querySelector('form > div:last-child') ||
                          container;

    if (buttonContainer) {
      buttonContainer.appendChild(button);
    } else {
      // 적절한 위치가 없으면 컨테이너 끝에 추가
      container.appendChild(button);
    }
  }

  /**
   * 번역 후 댓글 처리
   */
  private async handleTranslateAndComment(textarea: HTMLTextAreaElement, button: HTMLButtonElement): Promise<void> {
    const text = textarea.value.trim();

    if (!text) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    if (!this.containsKorean(text)) {
      alert('한국어 텍스트가 포함된 댓글만 번역할 수 있습니다.');
      return;
    }

    try {
      // 버튼 비활성화 및 로딩 표시
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '🔄 번역 중...';
      
      // 텍스트 번역
      const translatedText = await this.translateText(text, TranslationDirection.KO_TO_EN);
      
      // 번역된 텍스트로 textarea 업데이트
      textarea.value = translatedText;
      
      // 버튼 복원
      button.disabled = false;
      button.innerHTML = originalText;
      
      // 성공 메시지
      button.innerHTML = '✅ 번역 완료!';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);

      if (this.options.debug) {
        console.log('✅ Translation completed:', {
          original: text.substring(0, 50),
          translated: translatedText.substring(0, 50)
        });
      }

      // 자동으로 댓글 제출 (선택적)
      // this.submitComment(textarea);

    } catch (error) {
      // 오류 처리
      button.disabled = false;
      button.innerHTML = originalText;
      
      console.error('❌ Translation failed:', error);
      alert(`번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 댓글 자동 제출 (선택적)
   */
  private submitComment(textarea: HTMLTextAreaElement): void {
    // 가장 가까운 submit 버튼 찾기
    const container = this.findCommentContainer(textarea);
    if (container) {
      const submitButton = container.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement;
      if (submitButton && !submitButton.disabled) {
        submitButton.click();
        
        if (this.options.debug) {
          console.log('🚀 Auto-submitted comment');
        }
      }
    }
  }

  /**
   * 한국어 텍스트 포함 여부 확인
   */
  private containsKorean(text: string): boolean {
    const koreanRegex = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
    return koreanRegex.test(text);
  }

  /**
   * 댓글 textarea인지 확인
   */
  private isCommentTextarea(textarea: HTMLTextAreaElement): boolean {
    const className = textarea.className?.toLowerCase();
    const placeholder = textarea.placeholder?.toLowerCase();
    const ariaLabel = textarea.getAttribute('aria-label')?.toLowerCase();

    return (
      (className && (className.includes('prc-textarea') || className.includes('commentbox'))) ||
      (placeholder && placeholder.includes('comment')) ||
      (ariaLabel && ariaLabel.includes('comment')) ||
      textarea.id.includes(':r')
    );
  }

  /**
   * 이미 처리된 textarea인지 확인
   */
  private isTextareaAlreadyHandled(textarea: HTMLTextAreaElement): boolean {
    return this.components.some(component => component.textarea === textarea);
  }

  /**
   * URL이 번역 가능한지 확인
   */
  private isTranslatableURL(url: string): boolean {
    const pathname = new URL(url).pathname;
    return pathname.includes('/issues/') || pathname.includes('/pull/');
  }

  /**
   * 텍스트 번역 실행
   */
  private async translateText(text: string, direction: TranslationDirection): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: text,
        direction: direction
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.translatedText);
        } else {
          reject(new Error(response.error || 'Translation failed'));
        }
      });
    });
  }

  /**
   * MutationObserver 시작
   */
  private startMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRecheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 새로운 노드가 추가된 경우 댓글 영역인지 확인
          const addedNodes = Array.from(mutation.addedNodes);
          for (const node of addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector && element.querySelector('textarea[class*="prc-Textarea"]')) {
                shouldRecheck = true;
                break;
              }
            }
          }
        }
      });

      if (shouldRecheck) {
        if (this.options.debug) {
          console.log('🔍 CommentTranslateButton: New comment area detected, adding buttons...');
        }
        setTimeout(() => {
          this.findAndAddTranslateButtons();
        }, 500);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    if (this.options.debug) {
      console.log('🔍 CommentTranslateButton: MutationObserver started');
    }
  }

  /**
   * MutationObserver 중지
   */
  private stopMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * 설정 업데이트
   */
  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    
    if (enabled && !this.isActive) {
      this.start();
    } else if (!enabled && this.isActive) {
      this.stop();
    }
  }

  /**
   * 활성화 상태 확인
   */
  public isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * 상태 정보 반환
   */
  public getStatus() {
    return {
      enabled: this.options.enabled,
      active: this.isActive,
      componentsCount: this.components.length,
      currentUrl: window.location.href,
      isTranslatableUrl: this.isTranslatableURL(window.location.href)
    };
  }
}