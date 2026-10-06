"""주제 JSON → 카드 PNG, 무음 릴스 초안, 대본, 캡션, 네이버 글 초안."""
import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = os.environ.get("CONTENT_FONT", "/System/Library/Fonts/AppleSDGothicNeo.ttc")


def wrap(draw, text, font, width):
    lines = []
    for paragraph in text.split("\n"):
        current = ""
        for word in paragraph.split():
            candidate = current + (" " if current else "") + word
            if draw.textlength(candidate, font=font) > width and current:
                lines.append(current)
                current = word
            else:
                current = candidate
            if draw.textlength(current, font=font) > width:
                raise ValueError("너무 긴 단어입니다. 문구를 줄이거나 줄바꿈을 넣으세요.")
        lines.append(current)
    return lines


def card(path, title, body, number, total, reel=False):
    width, height = (1080, 1920) if reel else (1080, 1350)
    image = Image.new("RGB", (width, height), "#0A0906")
    draw = ImageDraw.Draw(image)
    label_font = ImageFont.truetype(FONT, 30)
    title_font = ImageFont.truetype(FONT, 72)
    body_font = ImageFont.truetype(FONT, 43)
    draw.text((90, 260 if reel else 90), "곰돌이피디  /  색보정 첫걸음", font=label_font, fill="#FFCD4A")
    y = 430 if reel else 250
    for line in wrap(draw, title, title_font, 860):
        draw.text((90, y), line, font=title_font, fill="white")
        y += 100
    y += 80
    for line in wrap(draw, body, body_font, 860):
        if y + 65 > height - (340 if reel else 180):
            raise ValueError(f"텍스트가 안전 영역을 넘습니다: {path}")
        draw.text((90, y), line, font=body_font, fill="#CDD5E0")
        y += 65
    draw.line((90, height - 220, 990, height - 220), fill="#354353", width=2)
    draw.text((90, height - 180), "@ldhpd_80  ·  STUDIO E.D.N.C.", font=label_font, fill="#FFCD4A")
    draw.text((875, height - 180), f"{number:02}/{total:02}", font=label_font, fill="white")
    image.save(path)


def build(topic, output, video):
    folder = output / topic["id"]
    folder.mkdir(parents=True, exist_ok=True)
    pages = [(topic["hook"], topic["intro"])]
    pages += [(s["title"], s["body"]) for s in topic["steps"]]
    pages += [("오늘의 연습", topic["cta"])]
    for n, (title, body) in enumerate(pages, 1):
        card(folder / f"card-{n:02}.png", title, body, n, len(pages))
        if video:
            card(folder / f"reel-{n:02}.png", title, body, n, len(pages), True)
    narration = [topic["hook"].replace("\n", " ") + " " + topic["intro"]]
    narration += [s["body"] for s in topic["steps"]]
    narration += [topic["cta"].replace("\n", " ")]
    script = "# " + topic["title"] + "\n\n무음 영상 초안입니다. 아래 대본 녹음과 실제 Resolve 시연을 추가하세요.\n\n"
    for i, line in enumerate(narration):
        script += f"- {i * 6:02}–{(i + 1) * 6:02}초: {line}\n"
    script += "\n각 6초는 임시 편집 길이입니다. 녹음 후 발화 길이에 맞춰 재편집하세요.\n"
    (folder / "reel-script.md").write_text(script)
    caption = topic["hook"].replace("\n", " ") + "\n\n" + topic["intro"] + "\n\n"
    caption += "\n".join(f"{i}. {s['title']}: {s['body']}" for i, s in enumerate(topic["steps"], 1))
    caption += "\n\n" + topic["cta"].replace("\n", " ") + "\n\n#색보정 #다빈치리졸브 #영상편집 #색보정기초\n"
    (folder / "instagram-caption.txt").write_text(caption)
    blog = f"# {topic['title']}\n\n안녕하세요, 곰돌이피디입니다.\n\n{topic['intro']}\n\n오늘은 어려운 색 이론 대신, 같은 장면에서 한 가지씩 확인하는 방법을 정리합니다.\n\n"
    for s in topic["steps"]:
        blog += f"## {s['title']}\n\n{s['body']}\n\n"
    blog += "## 직접 연습하기\n\n같은 장면에서 한 가지 설정만 바꿔보세요. 원본과 보정본을 같은 크기로 비교하고, 어떤 부분이 더 잘 읽히는지 기록하세요.\n\n[실제 보정 전후 이미지와 본인의 작업 경험을 추가할 자리]\n"
    (folder / "naver-draft.md").write_text(blog)
    (folder / "manifest.json").write_text(json.dumps({"topic": topic["id"], "status": "draft", "published": False, "reel_audio": False}, ensure_ascii=False, indent=2))
    if video:
        if not shutil.which("ffmpeg"):
            raise RuntimeError("FFmpeg가 필요합니다.")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/6", "-start_number", "1", "-i", str(folder / "reel-%02d.png"), "-c:v", "libx264", "-r", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(folder / "reel-draft.mp4")], check=True)
    print(folder)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--topics", type=Path, default=ROOT / "topics.json")
    parser.add_argument("--output", type=Path, default=ROOT / "output")
    parser.add_argument("--video", action="store_true")
    args = parser.parse_args()
    for item in json.loads(args.topics.read_text()):
        build(item, args.output, args.video)
