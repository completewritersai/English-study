# 하루 표현장

영어 구어와 한국어 뜻을 직접 저장하고, 날짜별로 정리하며, 휴대폰과 컴퓨터에서 같은 카드를 복습하는 개인 단어장입니다.

## 기능

- 표현과 한국어 뜻 추가·수정·삭제
- 저장 날짜별 목록
- 전체 카드 넘기기와 섞기
- 오늘의 복습: `다시 보기`는 10분 뒤 다시 등장하고, `익숙해요`는 1·3·7·14·30일 간격으로 다시 등장
- 이메일 로그인과 계정별 동기화

## 연결 방법

정적 사이트 코드는 GitHub 저장소 `completewritersai/English-study`에 둡니다. GitHub Pages는 화면을 제공하고, Supabase는 로그인과 카드 데이터를 저장합니다. GitHub 저장소에 개인 표현 데이터를 커밋하지 않습니다.

1. [Supabase](https://supabase.com/)에서 프로젝트를 만듭니다.
2. SQL Editor에서 [schema.sql](./schema.sql)을 실행합니다. 이 파일은 사용자별 카드 접근을 제한하는 Row Level Security 정책을 포함합니다.
3. Project Settings → API Keys에서 프로젝트 URL과 **publishable key**를 확인해 [config.js](./config.js)에 입력합니다. `secret` 또는 `service_role` 키는 입력하지 않습니다.
4. Authentication → URL Configuration에서 Site URL을 GitHub Pages 주소 `https://completewritersai.github.io/English-study/`로 설정하고 같은 주소를 Redirect URLs에 추가합니다.
5. GitHub 저장소의 Settings → Pages에서 `main` 브랜치의 `/ (root)`를 게시 소스로 선택합니다.
6. 게시된 사이트에 접속해 이메일 로그인 링크를 받은 뒤 표현을 추가합니다. 다른 기기에서도 같은 이메일로 로그인하면 같은 카드가 보입니다.

로컬에서는 정적 서버를 실행해 확인할 수 있습니다. 예: `python3 -m http.server 8000`. 로컬 로그인까지 시험하려면 Supabase Redirect URLs에 `http://localhost:8000/`도 추가합니다.

## 저장 구조

`cards` 테이블에는 영어 표현, 한국어 뜻, 추가 날짜, 다음 복습 시각, 복습 단계가 저장됩니다. 각 요청은 로그인한 사용자 ID로 제한됩니다.

## 배포 전 확인

- [ ] `config.js`에 실제 프로젝트 URL과 publishable key 입력
- [ ] `schema.sql` 실행
- [ ] 로그인 리디렉션 URL 등록
- [ ] GitHub Pages 활성화
- [ ] 휴대폰과 컴퓨터에서 같은 이메일로 로그인하여 카드 동기화 확인
