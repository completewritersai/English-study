# 하루 표현장

영어 구어와 한국어 뜻을 직접 저장하고, 날짜별로 정리하며, 휴대폰과 컴퓨터에서 같은 카드를 복습하는 개인 단어장입니다.

## 비용과 저장 방식

GitHub Free의 공개 저장소 `completewritersai/English-study`를 사이트 코드와 GitHub Pages 게시에 사용합니다. 표현 데이터는 별도의 **비공개** 저장소 `completewritersai/English-study-data`에 저장합니다. 다른 데이터베이스 서비스는 필요하지 않습니다. 단어장 변경은 GitHub에 커밋으로 기록되며, 다른 기기에서 사이트를 열거나 탭으로 돌아오면 최신 데이터를 불러옵니다.

## 기능

- 표현과 한국어 뜻 추가·수정·삭제
- 저장 날짜별 목록
- 전체 카드 넘기기와 섞기
- 오늘의 복습: `다시 보기`는 10분 뒤, `익숙해요`는 1·3·7·14·30일 간격으로 재등장
- GitHub 비공개 저장소를 통한 기기 간 동기화

## 연결 방법

1. GitHub에서 **비공개** 저장소 `English-study-data`를 만듭니다. `Add a README file`을 선택해 기본 브랜치가 생기도록 합니다. 표현 데이터는 공개 사이트 저장소에 넣지 않습니다.
2. GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens에서 새 토큰을 만듭니다. Resource owner는 `completewritersai`, Repository access는 **Only select repositories**에서 `English-study-data` 하나만 선택합니다. Repository permissions → Contents를 **Read and write**로 설정합니다. 만료 기간을 선택합니다.
3. `completewritersai/English-study` 저장소 Settings → Pages에서 **Deploy from a branch**, Branch **main**, Folder **/(root)**를 선택하고 저장합니다.
4. 게시된 사이트 `https://completewritersai.github.io/English-study/`를 열어 토큰을 직접 입력합니다. 휴대폰에서도 같은 방식으로 연결하면 같은 단어장이 표시됩니다. 토큰을 이 대화에 보내거나 코드에 넣지 마세요.

토큰을 기기에 저장하려면 `이 기기에서 연결 유지`를 선택합니다. 선택하지 않으면 브라우저 탭 세션이 끝날 때 다시 입력해야 합니다. 저장을 선택할 때는 본인 기기에서만 사용하세요. 토큰이 만료되면 새 토큰을 만들어 다시 연결합니다.

## 개발자 메모

- 저장소 이름은 [config.js](./config.js)의 `dataRepo`에서 바꿀 수 있습니다.
- 데이터는 비공개 저장소의 `data/YYYY-MM.json`으로 나뉘어 저장됩니다. 새 달의 첫 카드를 추가할 때 파일이 자동 생성됩니다.
- 두 기기에서 동시에 같은 달의 파일을 바꾸면 GitHub의 파일 버전(SHA)을 사용해 충돌을 감지하고 다시 시도합니다.
- 로컬 화면 점검: `python3 -m http.server 8000`. GitHub API 연결 테스트에는 비공개 저장소와 토큰이 필요합니다.
