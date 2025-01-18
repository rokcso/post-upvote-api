addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // 公共响应头
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // 允许所有域名跨域访问
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // 允许的 HTTP 方法
        'Access-Control-Allow-Headers': 'Content-Type', // 允许的请求头
    };

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    
    console.log(`Request method: ${request.method}, path: ${pathname}`);

    // 首页路由
    if (pathname === '/') {
        return new Response('Visit https://rokcso.com/ to see more.', { 
            status: 200, headers: { 'Content-Type': 'text/plain' }
        });
    }

    // /count 路由
    if (pathname === '/count') {
        // 只支持 GET 请求
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ "code": 1, "msg": '/count only supports GET method.' }), { status: 405, headers });
        }

        // 获取 post 参数
        const postId = url.searchParams.get('post');

        // 如果 post 参数无值
        if (!postId) {
            return new Response(JSON.stringify({ "code": 1, "msg": 'Please input postId' }), { status: 400, headers });
        }

        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP');

        const upvoteKey = `upvote:${postId}:${ip}`;
        const upvoteValue = await UPVOTE_RECORD.get(upvoteKey);

        // 如果 post 参数有值，则构造待查询的 key 并从 UPVOTE_COUNT KV 获取对应的 value
        const key = `count:${postId}`;
        const value = await UPVOTE_COUNT.get(key);

        // 如果没有从 KV 获取到 key 对应的 value
        if (value === null) {
            return new Response(JSON.stringify({"code": 1, "msg": `No post count data found for key "${key}".` }), { status: 404, headers });
        }

        // 如果从 KV 获取到 key 对应的 value
        return new Response(JSON.stringify({
            "code": 0,
            "msg": "success",
            "data": {
                "postId": postId,
                "count": Number(value),
                "hasUpvoted": upvoteValue === "1"
            }
        }), { status: 200, headers });
    }

    // /upvote 路由
    if (pathname === '/upvote') {
        // 只支持 POST 请求
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ "code": 1, "msg": '/upvote only supports POST method.' }), { status: 405, headers });
        }

        // 解析请求体
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({ "code": 1, "msg": 'Invalid JSON body' }), { status: 400, headers });
        }

        console.log(`Post body: ${JSON.stringify(body)}`);

        // 获取参数
        const { postId, diff } = body;

        // 校验参数
        if (!postId || typeof diff !== 'number' || !Number.isInteger(diff)) {
            return new Response(JSON.stringify({ "code": 1, "msg": 'Invalid postId or diff' }), { status: 400, headers });
        }

        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';

        // 处理 diff
        let upvoteValue;
        if (diff >= 1) {
            upvoteValue = 1;
        } else if (diff <= 0) {
            upvoteValue = -1;
        }

        // 拼接 key
        const upvoteKey = `upvote:${postId}:${ip}`;

        // 检查用户是否已经投过票
        const existingVote = await UPVOTE_RECORD.get(upvoteKey);
        if (existingVote === "1") {
            return new Response(JSON.stringify({ "code": 1, "msg": 'You have already voted.' }), { status: 400, headers });
        }

        // 存储到 KV
        await UPVOTE_RECORD.put(upvoteKey, upvoteValue.toString());

        // 构造文章 key 去查询文章 upvote count
        const postKey = `count:${postId}`;
        const postUpvoteCount = Number(await UPVOTE_COUNT.get(postKey));
        if (upvoteValue === 1) {
            await UPVOTE_COUNT.put(postKey, (postUpvoteCount || 0) + 1);
        } else if (upvoteValue === -1) {
            await UPVOTE_COUNT.put(postKey, (postUpvoteCount || 0) - 1);
        }

        return new Response(JSON.stringify({ "code": 0, "msg": "success" }), { headers });
    }

    // 其他非法路由重定向到首页
    const redirectUrl = `${url.origin}/`; // 动态生成首页 URL
    return Response.redirect(redirectUrl, 302);
}
