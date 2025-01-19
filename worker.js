// 监听 fetch 事件，当收到 HTTP 请求时，触发执行 handleRequest 事件
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

    // PTIONS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    
    console.log(`Request method: ${request.method}, path: ${pathname}`);

    // 首页路由
    if (pathname === '/') {
        return new Response(JSON.stringify({ "code": 0, "msg": "Visit https://rokcso.com/p/post-upvote-api/ to see more." }), { 
            status: 200, headers
        });
    }

    // /count 路由
    if (pathname === '/count') {
        // 只支持 GET 请求
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ "code": 1, "msg": '/count only supports GET method.' }), {
                status: 405, headers
            });
        }

        // 获取 post 参数
        const postId = url.searchParams.get('post');

        // 如果 post 参数无值
        if (!postId) {
            return new Response(JSON.stringify({ "code": 1, "msg": 'Please input postId, e.g., /count?post=xxx' }), {
                status: 400, headers
            });
        }

        // 如果 post 参数有值，则构造待查询的 upvoteCountKey 并从 UPVOTE_COUNT KV 获取对应的 upvoteCountValue
        const upvoteCountKey = `count:${postId}`;
        const upvoteCountValue = Number(await UPVOTE_COUNT.get(upvoteCountKey));

        // 如果没有从 UPVOTE_COUNT KV 获取到 upvoteCountKey 对应的 upvoteCountValue
        if (upvoteCountValue === null) {
            return new Response(JSON.stringify({ "code": 1, "msg": `No post count data found for key "${upvoteCountKey}".` }), {
                status: 404, headers
            });
        }

        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP');

        // 构造待查询的 upvoteRecordKey 并从 UPVOTE_RECORD KV 获取对应的 upvoteRecordValue
        const upvoteRecordKey = `upvote:${postId}:${ip}`;
        const upvoteRecordValue = Number(await UPVOTE_RECORD.get(upvoteRecordKey));
        // 如果没有从 UPVOTE_RECORD KV 获取到 upvoteRecordKey 对应的 upvoteRecordValue
        // 暂不做处理，在最终结果中返回

        // 如果从 UPVOTE_COUNT KV 获取到 upvoteCountKey 对应的 upvoteCountValue
        return new Response(JSON.stringify({
            "code": 0,
            "msg": "success",
            "data": {
                "postId": postId,
                "count": upvoteCountValue,
                // 当 upvoteRecordValue !== 1 时（通常为 null 或 0）表示用户还没有投过票，返回 false
                "hasUpvoted": upvoteRecordValue === 1
            }
        }), {
            status: 200, headers
        });
    }

    // /upvote 路由
    if (pathname === '/upvote') {
        // 只支持 POST 请求
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ "code": 1, "msg": '/upvote only supports POST method.' }), {
                status: 405, headers
            });
        }

        // 解析请求体 body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({ "code": 1, "msg": `Invalid JSON body, details: ${e.message}` }), {
                status: 400, headers
            });
        }

        console.log(`Post body: ${JSON.stringify(body)}`);

        // 从 body 中获取参数
        const { postId, diff } = body;

        // 校验参数合法性
        if (!postId || typeof diff !== 'number' || !Number.isInteger(diff)) {
            return new Response(JSON.stringify({ "code": 1, "msg": 'Invalid postId or diff' }), {
                status: 400, headers
            });
        }

        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';

        // 处理 diff
        let upvoteRecordValue;
        if (diff >= 1) {
            upvoteRecordValue = 1;
        } else if (diff <= 0) {
            upvoteRecordValue = 0;
        }

        // 拼接 upvoteRecordKey
        const upvoteRecordKey = `upvote:${postId}:${ip}`;

        // 如果用户还没有投过票，则执行后续逻辑
        // 将 upvoteRecordValue 存储到 UPVOTE_RECORD KV
        await UPVOTE_RECORD.put(upvoteRecordKey, upvoteRecordValue);

        // 构造 upvoteCountKey 去 UPVOTE_COUNT KV 查询文章当前的 upvoteCountValue
        const upvoteCountKey = `count:${postId}`;
        const upvoteCountValue = Number(await UPVOTE_COUNT.get(upvoteCountKey));
        // 如果本次行为为投票，则 upvoteCountValue + 1，否则 upvoteCountValue - 1
        if (upvoteRecordValue === 1) {
            // 检查用户是否已经投过票，从 UPVOTE_RECORD KV 获取对应的 value
            const existingUpvoteValue = Number(await UPVOTE_RECORD.get(upvoteRecordKey));
            if (existingUpvoteValue === 1) {
                return new Response(JSON.stringify({ "code": 1, "msg": 'You have already voted.' }), {
                    status: 400, headers
                });
            }
            await UPVOTE_COUNT.put(upvoteCountKey, (upvoteCountValue || 0) + 1);
        } else if (upvoteRecordValue === 0) {
            await UPVOTE_COUNT.put(upvoteCountKey, (upvoteCountValue || 0) - 1);
        }

        return new Response(JSON.stringify({ "code": 0, "msg": "success" }), {
            status: 200, headers
        });
    }

    // 其他非法路由重定向到首页
    const redirectUrl = `${url.origin}/`;
    return Response.redirect(redirectUrl, 302);
}
