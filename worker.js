// 监听 fetch 事件，当收到 HTTP 请求时，触发执行 handleRequest 事件
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

// 统一的响应处理
function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}

async function handleRequest(request) {
    // PTIONS 预检请求
    if (request.method === 'OPTIONS') {
        return createResponse(null);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    
    console.log(`Request method: ${request.method}, path: ${pathname}`);

    // 首页路由
    if (pathname === '/') {
        return createResponse({
            code: 0,
            msg: "Visit https://rokcso.com/p/post-upvote-api/ to see more."
        });
    }

    // /count 路由
    if (pathname === '/count') {
        // 只支持 GET 请求
        if (request.method !== 'GET') {
            return createResponse({
                code: 1,
                msg: '/count only supports GET method.'
            }, 405);
        }

        // 获取 post 参数
        const postId = url.searchParams.get('post');
        // 如果 post 参数无值
        if (!postId) {
            return createResponse({
                code: 1,
                msg: "Please input postId, e.g., /count?post=xxx"
            }, 400);
        }

        // 如果 post 参数有值，则构造待查询的 upvoteCountKey 并从 UPVOTE_COUNT KV 获取对应的 upvoteCountValue
        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP');
        const upvoteCountKey = `count:${postId}`;
        const upvoteRecordKey = `upvote:${postId}:${ip}`

        try {
            const [upvoteCountValue, upvoteRecordValue] = await Promise.all([
                UPVOTE_COUNT.get(upvoteCountKey),
                UPVOTE_RECORD.get(upvoteRecordKey)
            ]);

            if (upvoteCountValue === null) {
                return createResponse({
                    code: 1,
                    msg: `No post count data found for key "${upvoteCountKey}".`
                }, 404);
            }

            return createResponse({
                code: 0,
                msg: "success",
                data: {
                    post: postId,
                    count: Number(upvoteCountValue),
                    hasUpvoted: Number(upvoteRecordValue) === 1
                }
            });
        } catch (e) {
            return createResponse({
                code: 1,
                msg: `Failed to fetch data from KV store: ${e.message}`
            }, 500);
        }
    }

    // /upvote 路由
    if (pathname === '/upvote') {
        // 只支持 POST 请求
        if (request.method !== 'POST') {
            return createResponse({
                code: 1,
                msg: '/upvote only supports POST method.'
            }, 405);
        }

        // 解析请求体 body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return createResponse({
                code: 1,
                msg: `Invalid JSON body, details: ${e.message}`
            }, 400);
        }

        console.log(`Post body: ${JSON.stringify(body)}`);

        // 从 body 中获取参数
        const { postId, diff } = body;
        // 校验参数合法性
        if (!postId || typeof diff !== 'number' || !Number.isInteger(diff)) {
            return createResponse({
                code: 1,
                msg: 'Invalid postId or diff'
            }, 400);
        }

        // 获取请求方 IP 地址
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
        const upvoteCountKey = `count:${postId}`;
        const upvoteRecordKey = `upvote:${postId}:${ip}`;

        try {
            const [hasUpvotedRecordValue, hasUpvotedCountValue] = await Promise.all([
                UPVOTE_RECORD.get(upvoteRecordKey),
                UPVOTE_COUNT.get(upvoteCountKey)
            ]);

            const newUpvoteStatus = diff >= 1 ? 1 : 0;
            const hasUpvotedStatus = Number(hasUpvotedRecordValue);
            const hasUpvotedCount = Number(hasUpvotedCountValue) || 0;

            // 检查是否重复操作
            if (newUpvoteStatus === hasUpvotedStatus) {
                return createResponse({
                    code: 1,
                    msg: newUpvoteStatus === 1 ? `You have already voted. ${upvoteRecordKey}` : `You have already canceled your vote. ${upvoteRecordKey}`
                }, 400);
            }

            // 检查取消 upvote 是否合法
            if (newUpvoteStatus === 0 && hasUpvotedCount <= 0) {
                return createResponse({
                    code: 1,
                    msg: 'This post\'s less than 1, can not cancel upvote.'
                }, 400);
            }

            // 执行 upvote 操作
            await Promise.all([
                UPVOTE_RECORD.put(upvoteRecordKey, newUpvoteStatus),
                UPVOTE_COUNT.put(upvoteCountKey, newUpvoteStatus === 1 ? hasUpvotedCount + 1 : hasUpvotedCount - 1)
            ]);

            return createResponse({
                code: 0,
                msg: "success"
            })
        } catch (e) {
            return createResponse({
                code: 1,
                msg: `Failed to update data in KV store: ${e.message}`
            }, 500);
        }
    }

    // 其他非法路由重定向到首页
    const redirectUrl = `${url.origin}/`;
    return Response.redirect(redirectUrl, 302);
}