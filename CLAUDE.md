# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Design Language (de-slop / kill-ai-slop 실행 시 필독)

이 사이트는 **기밀문서·문서고(檔案) 콘셉트**를 일부러 만든 디자인입니다. 아래는 브랜드 선택이지 AI slop이 아니므로 절대 "정리" 대상으로 삼지 마세요:

- 모노크롬(니어블랙) + 붉은 인주 단일 액센트 팔레트
- 고무도장·봉인 띠·결재란 등 서류 장치 (`.dossier-*`, `.case-file-*`)
- 글리치 텍스트·텍스트 손상 연출 (`GlitchedText`, `TextGlitch`, `TextCorruptorProvider`, `.glitch-*`)
- 한자 병기·세로쓰기(`writing-mode`)·명조(Zen Old Mincho)·모노스페이스 라벨, 아주 작은 서식 라벨 크기
- 종이 질감: 모눈·괘선·바코드·천공·워터마크·마이크로프린트 (`.paper-ink` 등)
- 페이지 넘김 전환 (`page-turn.css`)

de-slop 스캔이 유효한 표적: 관리자 화면(`app/admin`, `components/admin`, `admin.css`)의 일반적인 웹 UI, 안내문·에러 메시지 등 카피 톤, 콘셉트와 무관한 Tailwind 기본값. 스캔 시 `--exclude` 예:

```
node .agents/skills/kill-ai-slop/scripts/scan.mjs . --exclude=character.css --exclude=overrides.css --exclude=page-turn.css --exclude=shell.css --exclude=forms.css --exclude=base.css
```

(`--exclude`는 경로 부분 문자열 매칭인데 Windows 에선 구분자가 `\`라 디렉터리 경로 대신 파일명으로 거는 것이 안전합니다.)

확인된 의도적 히트는 일괄 제외 대신 `deslop-ignore-next-line <id>` 주석으로 개별 고정하는 것을 선호합니다.
