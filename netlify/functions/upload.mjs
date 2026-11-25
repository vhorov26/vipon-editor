export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const viponCookie = process.env.VIPON_COOKIE;
  if (!viponCookie) {
    return new Response(
      JSON.stringify({ error: "Не задана переменная окружения VIPON_COOKIE в настройках Netlify!" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const incomingForm = await req.formData();
    const file = incomingForm.get("upload");

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "Файл изображения не получен" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || "image/png" });

    const outgoingForm = new FormData();
    outgoingForm.append("upload", blob, file.name || `screenshot_${Date.now()}.png`);

    const viponRes = await fetch("https://www.myvipon.com/upload/img-editor", {
      method: "POST",
      body: outgoingForm,
      headers: {
        "Cookie": viponCookie,
        "Origin": "https://www.myvipon.com",
        "Referer": "https://www.myvipon.com/my-post/add?ref=shopper_post&type=1",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      }
    });

    const text = await viponRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "MyVipon вернул некорректный ответ. Проверьте актуальность VIPON_COOKIE." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (data && data.uploaded && data.url) {
      return new Response(JSON.stringify({ uploaded: true, url: data.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        error: data?.error?.message || "MyVipon отклонил загрузку. Обновите VIPON_COOKIE в настройках Netlify."
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Внутренняя ошибка функции загрузки" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
