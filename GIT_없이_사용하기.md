# Git 없이 "버튼 클릭"만으로 사이트 올리기 (GitHub Desktop 사용법)

터미널 명령어는 하나도 안 씁니다. 전부 마우스 클릭입니다. 처음 설정만 좀 길고,
그 다음부터는 매번 **2번 클릭**(Commit → Push)이면 끝나요.

---

## 최초 설정 (한 번만, 약 15분)

### 1단계. GitHub 계정 만들기
1. [github.com](https://github.com) 접속 → 우측 상단 **Sign up**
2. 이메일·비밀번호로 가입 (무료)

### 2단계. GitHub Desktop 설치
1. [desktop.github.com](https://desktop.github.com) 접속 → **Download for macOS** 클릭
2. 다운받은 파일 실행 → Applications 폴더로 드래그 (일반 앱 설치와 동일)
3. 실행 후 방금 만든 GitHub 계정으로 로그인

### 3단계. 새 저장소(Repository) 만들기
1. GitHub Desktop 왼쪽 위 **File → New repository...**
2. Name: `studioednc-site` (원하는 이름으로)
3. Local path: 지금 제가 드린 압축 파일을 풀어놓은 그 폴더를 선택
   (이미 폴더가 있으면 "이 폴더를 그대로 저장소로 쓸지" 물어봅니다 → 예)
4. **Create repository** 클릭
5. 화면 오른쪽 위 **Publish repository** 클릭
   - "Keep this code private" 체크 (팀 내부용이니 비공개 추천)
   - **Publish repository** 클릭 → GitHub에 업로드 완료

### 4단계. Netlify와 연결하기
1. [app.netlify.com](https://app.netlify.com) 로그인 → 기존 studioednc.com 사이트 열기
2. **Site configuration → Build & deploy → Continuous deployment → Link repository**
   (또는 "Link site to Git" 버튼)
3. GitHub 로그인 승인 → 방금 만든 `studioednc-site` 저장소 선택
4. Build settings는 그대로 두고 **Deploy** 클릭
   (`netlify.toml` 파일에 이미 설정이 들어있어서 자동으로 인식됩니다)

### 5단계. 서비스키 등록
1. Netlify 사이트 → **Site configuration → Environment variables → Add a variable**
2. Key: `G2B_SERVICE_KEY`
3. Value: 나라장터 인증키 값 붙여넣기
4. 저장 후 **Deploys 탭 → Trigger deploy → Deploy site** 한 번 눌러서 반영

여기까지가 최초 설정이고, 이제부터 저장소에 올라가는 모든 변경사항은 Netlify가
자동으로 감지해서 사이트에 반영합니다.

---

## 평소 사용법 (앞으로 매번, 2번 클릭)

제가 수정된 파일을 드리면:

1. 받은 파일을 **원래 그 폴더에 덮어쓰기**로 넣습니다 (예: index.html 교체)
2. **GitHub Desktop 실행** → 왼쪽에 바뀐 파일들이 자동으로 표시됩니다
3. 화면 왼쪽 아래 **Summary** 칸에 아무 말이나 한 줄 씁니다 (예: "공지 수정")
4. **Commit to main** 버튼 클릭
5. 화면 위쪽 **Push origin** 버튼 클릭

이게 끝입니다. Push 하고 1~2분 뒤 studioednc.com에 자동으로 반영됩니다.
터미널 창은 한 번도 열 필요 없습니다.

---

## 공지(NOTICE) 문구는 어떻게 바꾸나요?

메인 페이지 상단에 공지 배너를 넣어뒀습니다. 문구를 바꾸고 싶으시면
**저한테 채팅으로 "공지 이거로 바꿔줘"라고 말씀만 해주시면 됩니다.** 제가 파일을
수정해서 드리면, 위 "평소 사용법"대로 2번 클릭만 하면 바로 반영됩니다.
(직접 코드를 만지실 필요 없습니다.)
