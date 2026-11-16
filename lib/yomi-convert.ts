/**
 * 일본어 가사를 한글 발음으로 옮기는 Gemini 호출입니다.
 * 키는 브라우저에서 직접 보내며 서버를 거치지 않습니다.
 */

// 무료 등급에서 기본 flash 모델이 자주 혼잡(503)해서 가벼운 모델을 먼저 씁니다.
const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const RETRY_DELAY_MS = 2000;

const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

const SYSTEM = `너는 일본어 노래 가사를 한국어 화자가 따라 부를 수 있도록 한글 발음으로 옮기는 변환기다. 번역하지 말고 소리만 옮긴다.

출력 형식
- 입력의 각 줄마다 정확히 한 줄을 출력한다. 줄 수와 빈 줄 위치를 입력과 똑같이 유지한다.
- 한글 발음만 출력한다. 원문, 번역, 설명, 번호, 따옴표를 붙이지 않는다.

읽기
- 한자는 가사의 문맥에 맞는 읽기를 고른다. 노래에서 흔한 특수 읽기(예: 運命→사다메, 宇宙→소라, 瞬間→토키, 理由→와케)는 문맥상 자연스러울 때만 쓰고, 원문에 괄호나 후리가나로 읽기가 적혀 있으면 그것을 따른다.
- 조사 は는 "와", へ는 "에", を는 "오"로 적는다.
- 영어, 숫자, 한국어 등 일본어가 아닌 부분은 그대로 둔다.

표기
- 들리는 소리대로 적는다. 어두의 か·た·ぱ행도 거센소리로 적는다(君→키미, 時→토키).
- つ는 "츠", す는 "스", ず·づ는 "즈"로 적는다.
- 촉음 っ은 앞 글자에 ㅅ 받침으로 적는다(きっと→킷토).
- ん은 뒤따르는 소리에 맞춰 ㄴ·ㅁ·ㅇ 받침으로 적는다(さんぽ→삼포, けんか→켕카, みんな→민나). 줄 끝이나 모음 앞에서는 ㄴ.
- 장음은 모음을 한 번 더 적는다(おう·おお→오오, うう→우우, ー는 앞 모음 반복). えい는 "에이"로 적는다.

띄어쓰기
- 문절 단위로 띄어 쓴다. 조사와 어미는 앞말에 붙이고, 자립어가 새로 시작될 때 띈다.
  예: 君の名前を呼んでいた → 키미노 나마에오 욘데이타`;

type GeminiChunk = {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
};

type ConvertOptions = {
  apiKey: string;
  lyrics: string;
  signal: AbortSignal;
  /** 지금까지 받은 전체 발음 텍스트 */
  onText: (text: string) => void;
  onRetry: (attempt: number, total: number) => void;
};

/** 변환이 끝나면 발음 텍스트를 돌려주고, 실패하면 사용자에게 보여줄 문구로 throw 합니다. */
export async function convertToYomi({ apiKey, lyrics, signal, onText, onRetry }: ConvertOptions) {
  let response: Response | undefined;

  for (const [index, model] of MODELS.entries()) {
    response = await fetch(endpoint(model), {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: lyrics }] }],
      }),
    });

    if (response.status !== 503 || index === MODELS.length - 1) break;
    onRetry(index + 2, MODELS.length);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  if (!response?.ok || !response.body) {
    const status = response?.status ?? 0;
    const detail: string = (await response?.json().catch(() => null))?.error?.message ?? "";
    if (status === 429) throw new Error("무료 한도를 넘었습니다. 잠시 뒤 다시 시도하세요.");
    if (status === 503) throw new Error("Gemini 서버가 혼잡합니다. 몇 분 뒤 다시 시도하세요.");
    if (status === 400 || status === 401 || status === 403) {
      throw new Error(`API 키를 확인하세요. ${detail}`);
    }
    throw new Error(`API 오류 ${status}: ${detail}`);
  }

  // SSE: "data: {json}" 줄 단위로 도착합니다.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  let finish = "";
  let block = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const chunk = JSON.parse(line.slice(5)) as GeminiChunk;
      block = chunk.promptFeedback?.blockReason ?? block;
      const candidate = chunk.candidates?.[0];
      finish = candidate?.finishReason ?? finish;
      for (const part of candidate?.content?.parts ?? []) {
        if (part.text && !part.thought) text += part.text;
      }
      onText(text);
    }
  }

  if (block) throw new Error(`모델이 입력을 차단했습니다 (${block}).`);
  if (finish === "RECITATION") {
    throw new Error("저작권 필터에 걸려 중단됐습니다. 가사를 나눠서 시도해 보세요.");
  }
  if (finish === "MAX_TOKENS") {
    throw new Error("가사가 너무 길어 중간에 끊겼습니다. 나눠서 변환하세요.");
  }
  if (finish && finish !== "STOP") throw new Error(`모델이 변환을 중단했습니다 (${finish}).`);

  return text.trimEnd();
}
