// GitHub Issues 페이지 링크 구조 디버깅 스크립트
// 브라우저 콘솔에서 실행하세요: https://github.com/pat-jj/s3/issues

console.log('🔍 GitHub Issues 페이지 링크 구조 분석 시작...');

// 현재 페이지 정보
console.log('📍 Current URL:', window.location.href);
console.log('📍 Current pathname:', window.location.pathname);

// 1. 기본적인 이슈 링크 찾기
const basicSelectors = [
  'a[href*="/issues/"]',
  '.js-navigation-item a',
  '.Link--primary',
  'a[data-hovercard-type="issue"]',
];

console.log('\n🎯 기본 선택자들로 찾은 요소들:');
basicSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`"${selector}": ${elements.length}개 요소 발견`);
  
  if (elements.length > 0) {
    console.log('  첫 번째 요소:', elements[0]);
    console.log('  텍스트:', elements[0].textContent?.trim());
    console.log('  href:', (elements[0] as HTMLAnchorElement).href);
    console.log('  클래스:', elements[0].className);
  }
});

// 2. 우리 확장프로그램이 사용하는 선택자들
const ourSelectors = [
  '[class*="IssuePullRequestTitle-module__ListItemTitle"]',
  '[class*="ListItemTitle"]',
  'a[class*="Link--primary"][class*="v-align-middle"]',
  '.js-navigation-item [data-hovercard-type="issue"] .Link--primary',
  '.js-navigation-item .h4 a',
  '[data-testid="issue-title-link"]',
  '.js-navigation-item .Link--primary[data-hovercard-type="issue"]',
  '.js-navigation-item a[href*="/issues/"]',
  '.js-issue-row a[href*="/issues/"]',
];

console.log('\n🎯 우리 확장프로그램 선택자들:');
ourSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`"${selector}": ${elements.length}개 요소 발견`);
  
  if (elements.length > 0) {
    console.log('  첫 번째 요소:', elements[0]);
    console.log('  텍스트:', elements[0].textContent?.trim());
    console.log('  href:', (elements[0] as HTMLAnchorElement).href);
    console.log('  클래스:', elements[0].className);
  }
});

// 3. 실제 이슈 제목 요소들의 구조 분석
console.log('\n🔍 실제 이슈 제목 요소들 구조 분석:');

// 가장 일반적인 이슈 링크 찾기
const issueLinks = document.querySelectorAll('a[href*="/issues/"]');
console.log(`총 ${issueLinks.length}개의 이슈 링크 발견`);

issueLinks.forEach((link, index) => {
  if (index < 3) { // 처음 3개만 분석
    console.log(`\n--- 이슈 링크 ${index + 1} ---`);
    console.log('요소:', link);
    console.log('텍스트:', link.textContent?.trim());
    console.log('href:', (link as HTMLAnchorElement).href);
    console.log('클래스:', link.className);
    console.log('부모 요소:', link.parentElement);
    console.log('부모 클래스:', link.parentElement?.className);
    
    // 자식 요소들도 확인
    if (link.children.length > 0) {
      console.log('자식 요소들:');
      Array.from(link.children).forEach((child, childIndex) => {
        console.log(`  ${childIndex + 1}. ${child.tagName} (${child.className}): "${child.textContent?.trim()}"`);
      });
    }
  }
});

// 4. 링크 테스트 - 실제 텍스트 교체해보기
console.log('\n🧪 링크 보존 테스트 시작...');

const testLink = issueLinks[0] as HTMLAnchorElement;
if (testLink) {
  console.log('테스트 대상 링크:', testLink);
  console.log('원본 텍스트:', testLink.textContent);
  console.log('원본 href:', testLink.href);
  
  // 원본 백업
  const originalText = testLink.textContent;
  const originalHref = testLink.href;
  
  // 텍스트 교체
  testLink.textContent = '🔄 테스트 번역중...';
  
  console.log('교체 후 텍스트:', testLink.textContent);
  console.log('교체 후 href:', testLink.href);
  console.log('href 보존 여부:', testLink.href === originalHref ? '✅ 성공' : '❌ 실패');
  
  // 원본 복원
  setTimeout(() => {
    testLink.textContent = originalText;
    console.log('✅ 원본 텍스트 복원 완료');
  }, 2000);
}

console.log('\n🎉 GitHub Issues 페이지 분석 완료!');
console.log('📋 이 정보를 개발자에게 공유해주세요.');