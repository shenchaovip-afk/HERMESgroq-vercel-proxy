export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);

  // 1. 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // 2. 自动补充 /openai/v1 前缀
  let path = url.pathname;
  if (path.startsWith('/v1/')) {
    path = '/openai' + path;
  } else if (!path.startsWith('/openai/v1/')) {
    path = '/openai/v1' + path;
  }

  const targetUrl = `https://api.groq.com${path}${url.search}`;

  // 3. 清理干扰标头，避免 Groq 拦截
  const newHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (!lowerKey.startsWith('x-') && !lowerKey.startsWith('cf-') && lowerKey !== 'host') {
      newHeaders.set(key, value);
    }
  }

  // 4. 转发请求给 Groq
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: newHeaders,
    body: ['GET', 'HEAD'].includes(req.method) ? null : req.body,
  });

  const respHeaders = new Headers(response.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    headers: respHeaders,
  });
}
