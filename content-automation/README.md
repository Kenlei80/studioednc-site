# 곰돌이피디 색보정 첫걸음 제작 자동화

대상: Instagram @ldhpd_80 / 네이버 gage_otd. 한 주제 JSON으로 카드뉴스 PNG, 무음 릴스 MP4, 녹음 대본, 캡션, 네이버 글 초안을 생성합니다.

## 로컬 실행
```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python build.py --video
```
content-automation 폴더에서 실행. FFmpeg 필요. macOS 기본 한국어 폰트 사용. Linux에서는 CONTENT_FONT 환경변수로 NotoSansCJK-Regular.ttc 절대 경로 지정.

## GitHub 실행
main에 반영 후 Actions → Generate beginner color content → Run workflow. 자동 실행 일정은 없으며 수동 실행합니다. 완료 후 color-content-drafts 아티팩트를 다운로드하세요. GitHub 실행은 아직 검증 전이며 브랜치 반영만으로 게시되지는 않습니다.

## 출력과 사용
output/주제ID/에 카드 5장, 30초 텍스트 슬라이드 무음 릴스, 대본, 캡션, 네이버 Markdown 초안이 생성됩니다. 영상은 설명 화면 초안으로서 음성·실제 Resolve 조작 시연이 없습니다. 녹음 길이에 맞춰 컷 길이를 조절하고 실제 보정 전후 예시를 추가하세요.
topics.json을 수정하면 다음 콘텐츠 제작에 반영됩니다. 제목과 본문은 이미지 안전 영역을 넘으면 생성 단계에서 오류를 냅니다.

## 구현 범위
제작 자동화 구현. Instagram 인증·게시·예약과 네이버 로그인·편집기 입력·발행은 미구현. n8n 및 Meta 공식 샘플은 검토했지만 실행·설치하지 않았습니다. 계정 연결이 없는 상태에서 설치만으로 자동 게시가 완성되지는 않습니다.
계정 분석 범위와 기획은 account-analysis.md 참고.

## 배포와 비밀값
현재 저장소 Netlify 설정은 루트를 웹에 게시합니다. 자동화 도구의 웹 노출 방지를 위해 루트 _redirects에 content-automation 및 .github 경로의 404 규칙을 추가합니다. 비밀값·토큰·.env를 이 폴더나 Git에 넣지 마세요. 생성 output은 .gitignore에서 제외합니다. GitHub 아티팩트에는 공개 가능한 초안만 넣으세요.

## 참고한 GitHub 자료
- https://github.com/python-pillow/Pillow : 설치한 이미지 렌더러
- https://github.com/fbsamples/reels_publishing_apis : Meta 공식 게시 샘플, 이전 Facebook Login 방식 여부 검토 필요
- https://github.com/n8n-io/n8n : 향후 워크플로 연결 후보
