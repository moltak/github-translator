// GitHub Comment Forms Debug Script - Dynamic Classes Edition
// 브라우저 콘솔에서 실행하여 현재 페이지의 댓글 양식을 분석합니다.
// GitHub의 동적 해시 클래스명 (예: prc-Button-ButtonBase-c50BI)에 대응

console.log('🔍 GitHub Comment Forms Analysis Starting (Dynamic Classes Edition)...');
console.log('🎯 Analyzing GitHub\'s new dynamic class naming system...');

// 1. 현재 URL 분석
console.log('📍 Current URL:', window.location.href);
const pathname = new URL(window.location.href).pathname.toLowerCase();
const isIssuesOrPulls = pathname.includes('/issues') || pathname.includes('/pull');
console.log('🎯 URL Analysis:', {
  pathname,
  isIssuesOrPulls,
  includes_issues: pathname.includes('/issues'),
  includes_pull: pathname.includes('/pull')
});

// 2. 동적 클래스명 분석
console.log('🔍 Analyzing dynamic CSS classes...');
const allElements = document.querySelectorAll('*[class*="prc-"], *[class*="Button"], *[class*="Form"]');
const dynamicClasses = new Set();

allElements.forEach(el => {
  Array.from(el.classList).forEach(className => {
    if (className.includes('prc-') || /^[a-zA-Z]+-[a-zA-Z]+-[a-zA-Z0-9]{5}$/.test(className)) {
      dynamicClasses.add(className);
    }
  });
});

console.log('🎯 Found dynamic classes:', Array.from(dynamicClasses).slice(0, 20));

// 3. 새로운 CommentInterceptor 전략 테스트
const actionBasedSelectors = [
  'form[action*="/comment"]',
  'form[action*="/comments"]',
  'form[action*="/issues/"][action*="/comments"]',
  'form[action*="/pull/"][action*="/comments"]',
  'form[action*="/discussions/"][action*="/comments"]',
];

const dataBasedSelectors = [
  'form[data-target*="comment"]',
  'form[data-turbo-permanent]',
  'form[data-testid*="comment"]',
  'form[data-component*="comment"]',
];

const allSelectors = [...actionBasedSelectors, ...dataBasedSelectors];

console.log('📝 Testing modern form selectors...');
const foundForms = [];

allSelectors.forEach((selector, index) => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Selector ${index + 1}: "${selector}" found ${elements.length} form(s)`);
      elements.forEach((form, formIndex) => {
        const formInfo = {
          selector,
          index: formIndex,
          element: form,
          action: form.action,
          method: form.method,
          classList: form.className,
          id: form.id,
          textareaCount: form.querySelectorAll('textarea').length
        };
        foundForms.push(formInfo);
        console.log(`   Form ${formIndex + 1}:`, formInfo);
      });
    } else {
      console.log(`❌ Selector ${index + 1}: "${selector}" found 0 forms`);
    }
  } catch (error) {
    console.warn(`🚫 Selector ${index + 1}: "${selector}" failed:`, error.message);
  }
});

// 3. 모든 form 요소 스캔 (추가 분석)
const allForms = document.querySelectorAll('form');
console.log(`📋 Found ${allForms.length} total forms on page`);

allForms.forEach((form, index) => {
  const textareas = form.querySelectorAll('textarea');
  if (textareas.length > 0) {
    console.log(`📝 Form ${index + 1} with textarea(s):`, {
      action: form.action,
      method: form.method,
      classList: form.className,
      id: form.id,
      textareaCount: textareas.length,
      textareas: Array.from(textareas).map(ta => ({
        name: ta.name,
        placeholder: ta.placeholder,
        ariaLabel: ta.getAttribute('aria-label'),
        className: ta.className,
        id: ta.id
      }))
    });
  }
});

// 4. Textarea 셀렉터들 테스트
const textareaSelectors = [
  // GitHub 표준 댓글 필드
  'textarea[name="comment[body]"]',
  'textarea[name="body"]',
  // aria-label 기반
  'textarea[aria-label*="comment"]',
  'textarea[aria-label*="Comment"]',
  // placeholder 기반
  'textarea[placeholder*="comment"]',
  'textarea[placeholder*="Comment"]',
  // ID 기반
  'textarea#comment_body',
  'textarea#new_comment_field',
  // 클래스 기반
  'textarea.comment-form-textarea',
  'textarea.js-comment-field',
];

console.log('📝 Testing textarea selectors...');
textareaSelectors.forEach((selector, index) => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Textarea ${index + 1}: "${selector}" found ${elements.length} element(s)`);
      elements.forEach((textarea, taIndex) => {
        console.log(`   Textarea ${taIndex + 1}:`, {
          name: textarea.name,
          placeholder: textarea.placeholder,
          ariaLabel: textarea.getAttribute('aria-label'),
          className: textarea.className,
          id: textarea.id,
          value: textarea.value ? `"${textarea.value.substring(0, 30)}..."` : '(empty)'
        });
      });
    }
  } catch (error) {
    console.warn(`🚫 Textarea selector failed: "${selector}"`, error.message);
  }
});

// 5. 실제 CommentInterceptor 로직 테스트
console.log('🧪 Testing CommentInterceptor logic...');

// URL 체크
const isTranslatableURL = (url) => {
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.includes('/issues') || pathname.includes('/pull');
};

console.log('🔍 URL translatable:', isTranslatableURL(window.location.href));

// 한국어 텍스트 감지
const containsKorean = (text) => {
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  return koreanRegex.test(text);
};

console.log('🔤 Korean detection test:', {
  'Hello world': containsKorean('Hello world'),
  '안녕하세요': containsKorean('안녕하세요'),
  'Hello 안녕': containsKorean('Hello 안녕')
});

// 6. 가상 form submit 테스트를 위한 도우미 함수
window.testCommentInterception = function(testText = '안녕하세요, 테스트입니다.') {
  console.log('🚀 Testing comment interception with:', testText);
  
  const forms = foundForms.filter(f => f.element && f.textareaCount > 0);
  if (forms.length === 0) {
    console.warn('❌ No forms with textareas found for testing');
    return;
  }
  
  const form = forms[0].element;
  const textarea = form.querySelector('textarea');
  
  if (!textarea) {
    console.warn('❌ No textarea found in first form');
    return;
  }
  
  console.log('📝 Using form:', {
    action: form.action,
    method: form.method,
    classList: form.className
  });
  
  console.log('📝 Using textarea:', {
    name: textarea.name,
    placeholder: textarea.placeholder,
    ariaLabel: textarea.getAttribute('aria-label')
  });
  
  // 테스트 텍스트 입력
  const originalValue = textarea.value;
  textarea.value = testText;
  
  console.log('✅ Test text inserted. Original value restored.');
  console.log('💡 Korean detected:', containsKorean(testText));
  
  // 원본 값 복원
  textarea.value = originalValue;
  
  return {
    form,
    textarea,
    testText,
    koreanDetected: containsKorean(testText)
  };
};

console.log('🎉 Analysis complete!');
console.log('💡 To test form interception, run: testCommentInterception()');
console.log('📋 Summary:', {
  totalForms: allForms.length,
  formsWithTextareas: foundForms.length,
  urlTranslatable: isTranslatableURL(window.location.href),
  recommendedSelectors: foundForms.length > 0 ? foundForms[0].selector : 'None found'
});