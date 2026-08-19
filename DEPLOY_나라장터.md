# 나라장터 검색 기능 배포 가이드

이 사이트에 `bids.html`(나라장터 검색 페이지)과 `netlify/functions/g2b.js`(백엔드
서버리스 함수)가 추가되었습니다. **주의: 지금까지 쓰시던 "Netlify Drop"(폴더를
드래그&드롭하는 방식)으로는 이 기능이 동작하지 않습니다.** Drop 방식은 정적 파일만
올라가고, 서버리스 함수(Functions)는 빌드 과정이 있는 배포 방식에서만 작동해요.

## 1. 배포 방식을 Git 연동으로 바꾸기 (최초 1회만)

1. 이 폴더 전체를 GitHub(또는 GitLab) 저장소에 올리세요 (비공개 저장소 추천).
2. [app.netlify.com](https://app.netlify.com) 에서 기존 사이트를 열고
   **Site configuration → Build & deploy → Link repository** (또는 새 사이트를
   "Import from Git"으로 새로 만들어서 기존 도메인을 연결)로 방금 만든 저장소를 연결하세요.
3. Build settings는 비워두시면 됩니다 (`netlify.toml`에 이미 설정되어 있어요:
   publish 디렉토리 = 루트, functions 디렉토리 = `netlify/functions`).
4. 이후로는 "Netlify Drop 재업로드" 대신, 저장소에 변경사항을 올리면(git push)
   자동으로 재배포됩니다. (제가 파일을 새로 드릴 때마다 이 저장소에 반영해주시면 됩니다.)

## 2. 서비스키를 환경변수로 등록하기 (최초 1회만)

1. Netlify 사이트 대시보드 → **Site configuration → Environment variables**
2. **Add a variable** 클릭
3. Key: `G2B_SERVICE_KEY`
4. Value: `config.json`에 있던 `service_key` 값을 그대로 붙여넣기
   (현재 값: `h1Ny04w1S0hdagSULowvQtu5OIgKuoRHfyIQ7YnuUEpLM%2BIt5LK4ADtpjx13dA8goNdnEZDlCsynK1ZrrRQuWQ%3D%3D`)
5. Scopes는 기본값(모든 배포 컨텍스트)으로 두고 저장
6. 저장 후 사이트를 한 번 다시 배포(Deploys 탭 → Trigger deploy)해야 반영됩니다

이 환경변수는 서버(함수) 안에서만 읽히고, 브라우저로는 절대 전달되지 않습니다.
설정 탭 화면에도 더 이상 인증키 입력란이 없습니다 (관리자만 Netlify에서 등록).

## 3. 확인

배포가 끝나면 `https://studioednc.com/bids.html` (또는 실제 사용 중인 도메인 +
`/bids.html`)으로 접속해서 검색이 되는지 확인하세요. 네비게이션 "08 나라장터"
메뉴에서도 바로 연결됩니다.

## 4. "킵/확인" 데이터는 어디에 저장되나요?

Netlify Blobs라는 저장소에 사이트 단위로 저장됩니다. 팀원 누가 킵하거나 확인
체크를 하든 같은 데이터를 모두가 같이 봅니다 (팀 공용). 검색 키워드 설정도
마찬가지로 팀 공용입니다 (설정 탭에서 저장하면 전체에 반영).

## 5. 로컬 도구는 어떻게 되나요?

기존에 드린 `실행하기(공식API).command` 로컬 버전은 그대로 계속 쓰실 수 있어요
(둘은 서로 영향을 주지 않는 별개의 실행 방식입니다). 다만 "킵/확인" 데이터는
로컬 버전과 웹 버전이 서로 공유되지 않습니다 — 로컬은 `saved.json` 파일에,
웹 버전은 Netlify Blobs에 따로 저장돼요.
