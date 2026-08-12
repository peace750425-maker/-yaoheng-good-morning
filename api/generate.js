export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "只接受 POST 請求" });
  }

  try {
    const { date } = req.body || {};

    if (!date) {
      return res.status(400).json({ error: "缺少日期" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY 尚未設定"
      });
    }

    // 第一步：AI 自動決定今天的文案與整體視覺方向
    const textResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          reasoning: {
            effort: "low"
          },
          input: `
你是一位頂級精品品牌藝術總監。

現在要為「曜衡」設計 ${date} 的每日早安海報。

要求：

1. 自動寫一句或兩句繁體中文勵志短句。
2. 文案簡短、有質感、不俗氣、不說教。
3. 每次都要重新決定完全不同的：
   - 場景
   - 藝術方向
   - 色系
   - 構圖
   - 光線
   - 視覺元素
   - 字體氛圍
4. 不要固定晨曦、咖啡、山景等模板。
5. 可以是精品攝影、電影感、建築、自然、抽象藝術、
   東方美學、城市、旅行、靜物、時尚 editorial 等。
6. 重點是每天視覺差異要非常大。
7. 海報必須包含：
   - 日期：${date}
   - 勵志短句
   - 底部低調署名：曜衡
8. 整體必須有高級品牌 campaign / 設計雜誌質感。
9. 不要出現人物正面大頭肖像。
10. 畫面適合手機直式早安海報。

請只輸出一段可以直接交給圖片生成模型的完整繁體中文圖片提示詞。
`
        })
      }
    );

    const textData = await textResponse.json();

    if (!textResponse.ok) {
      console.error(textData);
      throw new Error(
        textData?.error?.message || "文字生成失敗"
      );
    }

    const artPrompt =
      textData.output
        ?.flatMap(item => item.content || [])
        ?.find(item => item.type === "output_text")
        ?.text ||
      textData.output_text;

    if (!artPrompt) {
      throw new Error("沒有取得 AI 設計提示詞");
    }

    // 第二步：真正生成全新的 AI 圖片
    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: artPrompt,
          size: "1024x1536",
          quality: "medium",
          n: 1
        })
      }
    );

    const imageData = await imageResponse.json();

    if (!imageResponse.ok) {
      console.error(imageData);
      throw new Error(
        imageData?.error?.message || "圖片生成失敗"
      );
    }

    const base64 = imageData.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("沒有收到圖片資料");
    }

    return res.status(200).json({
      image: `data:image/png;base64,${base64}`
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "生成失敗"
    });
  }
}
