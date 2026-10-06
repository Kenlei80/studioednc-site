# Uplika 게시·분석 연결

2026-10-06 공식 문서를 확인하고 Codex 글로벌 MCP에 uplika 서버(https://api.uplika.com/mcp)를 등록했습니다. OAuth 인증 완료 및 연결 계정 검증은 아직 대기 중입니다. 등록만으로 사용 가능하다고 판단하지 않습니다.

## 공식 지원과 조건
- Instagram: 피드·릴스·스토리·캐러셀 게시, 예약 및 게시물 인사이트. 직접 Instagram 로그인 또는 Facebook 연결 방식. 실제 계정의 요구 조건과 권한은 연결 화면에서 확인합니다.
- Naver Blog: Chrome 확장 프로그램이 로그인된 사용자 브라우저의 편집기를 통해 발행. 컴퓨터가 깨어 있고 확장이 실행된 Chrome이 필요. 네이버 공식 발행 API가 없어도 이 경로로 자동 발행 가능.
- 분석: list_channel_posts는 기존 앱에서 작성한 게시물도 조회. open_post는 본문·댓글·수치를 함께 조회. 인사이트는 플랫폼별 제공 범위 차이가 있으며 null을 0으로 해석하지 않습니다. 네이버 방문자·검색어·체류시간 등 상세 블로그 통계는 지원 여부 미확인.

## 연결 후 작업 순서
1. Uplika 대시보드에서 @ldhpd_80 및 gage_otd 연결. 네이버 크롬 확장 설치와 로그인.
2. OAuth 화면에서 계정 목록 읽기, 게시물 읽기·쓰기, 지속 연결 권한을 확인하고 사용자가 승인.
3. list_accounts로 실제 계정과 워크스페이스 확인. 네이버 카테고리와 bridge_status 확인.
4. list_channel_posts/open_post로 기존 콘텐츠 분석 → 콘텐츠 기획 수정.
5. 현재 생성한 output 파일을 완성 편집 후 업로드하고 초안 저장으로 확인.
6. 게시 대상·일정·내용을 확정한 콘텐츠만 발행 또는 예약. 실제 테스트 전에는 자동 발행 완료로 보고하지 않음.

현재 제작 도구와 Uplika 게시 API를 잇는 실행 코드는 아직 구현되지 않았으며 인증 후 계정·카테고리·미디어 ID를 확인해 연결합니다. 토큰·키는 GitHub 소스에 저장하지 않습니다.

공식 문서:
- https://uplika.com/en/docs
- https://uplika.com/en/docs/naver-blog
- https://uplika.com/en/docs/instagram
- https://uplika.com/en/docs/tools
- https://uplika.com/en/docs/replies
