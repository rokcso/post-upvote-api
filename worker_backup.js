// 定义常量
const UPVOTE_RECORD_PREFIX = 'upvote:';
const UPVOTE_COUNT_PREFIX = 'count:';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const ACCESS_CONTROL_MAX_AGE = 86400; // 24小时

// 公共响应头
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ' + CSRF_TOKEN_HEADER,
};

// 定义错误码
const errorCode = {
    SUCCESS: 0,
    INVALID_INPUT: 1,
    METHOD_NOT_ALLOWED: 2,
    NOT_FOUND: 3,
    ALREADY_VOTED: 4,
    CANNOT_CANCEL_VOTE: 5,
    INTERNAL_ERROR: 99,
};

// 生成CSRF令牌
function generateCSRFToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 验证CSRF令牌
function validateCSRFToken(request, expectedToken) {
    const token = request.headers.get(CSRF_TOKEN_HEADER);
    return token === expectedToken;
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        // 添加Access-Control-Max-Age头
        headers['Access-Control-Max-Age'] = ACCESS_CONTROL_MAX_AGE.toString();
        return new Response(null, { headers });
    }

    console.log(`Request method: ${request.method}, path: ${pathname}`);

    // 首页路由
    if (pathname === '/') {
        return new Response(JSON.stringify({
            "code": errorCode.SUCCESS,
            "msg": "Visit https://rokcso.com/p/post-upvote-api/ to see more."
        }), {
            status: 200,
            headers,
        });
    }

    // /count路由
    if (pathname === '/count') {
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({
                "code": errorCode.METHOD_NOT_ALLOWED,
                "msg": '/count only supports GET method.'
            }), {
                status: 405,
                headers,
            });
        }

        const postId = url.searchParams.get('post');
        if (!postId || typeof postId !== 'string' || postId.length < 5) {
            return new Response(JSON.stringify({
                "code": errorCode.INVALID_INPUT,
                "msg": 'Please input postId, e.g., /count?post=xxx'
            }), {
                status: 400,
                headers,
            });
        }

        const upvoteCountKey = `${UPVOTE_COUNT_PREFIX}${postId}`;
        const upvoteCountValue = Number(await UPVOTE_COUNT.get(upvoteCountKey));

        if (upvoteCountValue === null) {
            return new Response(JSON.stringify({
                "code": errorCode.NOT_FOUND,
                "msg": `No post count data found for key "${upvoteCountKey}".`
            }), {
                status: 404,
                headers,
            });
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
        const upvoteRecordKey = `${UPVOTE_RECORD_PREFIX}${postId}:${ip}`;
        const upvoteRecordValue = Number(await UPVOTE_RECORD.get(upvoteRecordKey));

        return new Response(JSON.stringify({
            "code": errorCode.SUCCESS,
            "msg": "success",
            "data": {
                "postId": postId,
                "count": upvoteCountValue,
                "hasUpvoted": upvoteRecordValue === 1,
            }
        }), {
            status: 200,
            headers,
        });
    }

    // /upvote路由
    if (pathname === '/upvote') {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                "code": errorCode.METHOD_NOT_ALLOWED,
                "msg": '/upvote only supports POST method.'
            }), {
                status: 405,
                headers,
            });
        }

        // 生成CSRF令牌（实际应用中应存储在Cookie或HTML中）
        const csrfToken = generateCSRFToken();
        // 验证CSRF令牌（实际应用中应从前端获取）
        // if (!validateCSRFToken(request, csrfToken)) {
        //     return new Response(JSON.stringify({
        //         "code": errorCode.INVALID_INPUT,
        //         "msg": 'Invalid CSRF token.'
        //     }), {
        //         status: 403,
        //         headers,
        //     });
        // }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({
                "code": errorCode.INVALID_INPUT,
                "msg": 'Invalid JSON body.'
            }), {
                status: 400,
                headers,
            });
        }

        console.log(`Post body: ${JSON.stringify(body)}`);

        const { postId, diff } = body;
        if (!postId || typeof postId !== 'string' || postId.length < 5 ||
            typeof diff !== 'number' || !Number.isInteger(diff) ||
            (diff !== 1 && diff !== -1)) {
            return new Response(JSON.stringify({
                "code": errorCode.INVALID_INPUT,
                "msg": 'Invalid postId or diff.'
            }), {
                status: 400,
                headers,
            });
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
        const upvoteRecordKey = `${UPVOTE_RECORD_PREFIX}${postId}:${ip}`;
        const existingUpvoteRecordValue = Number(await UPVOTE_RECORD.get(upvoteRecordKey));

        if (diff === 1) {
            if (existingUpvoteRecordValue === 1) {
                return new Response(JSON.stringify({
                    "code": errorCode.ALREADY_VOTED,
                    "msg": 'You have already voted.'
                }), {
                    status: 400,
                    headers,
                });
            }
            await UPVOTE_RECORD.put(upvoteRecordKey, 1);
            const upvoteCountKey = `${UPVOTE_COUNT_PREFIX}${postId}`;
            const upvoteCountValue = Number(await UPVOTE_COUNT.get(upvoteCountKey));
            await UPVOTE_COUNT.put(upvoteCountKey, (upvoteCountValue || 0) + 1);
        } else if (diff === -1) {
            if (existingUpvoteRecordValue !== 1) {
                return new Response(JSON.stringify({
                    "code": errorCode.CANNOT_CANCEL_VOTE,
                    "msg": 'You have not voted yet.'
                }), {
                    status: 400,
                    headers,
                });
            }
            await UPVOTE_RECORD.put(upvoteRecordKey, 0);
            const upvoteCountKey = `${UPVOTE_COUNT_PREFIX}${postId}`;
            const upvoteCountValue = Number(await UPVOTE_COUNT.get(upvoteCountKey));
            if (upvoteCountValue > 0) {
                await UPVOTE_COUNT.put(upvoteCountKey, upvoteCountValue - 1);
            } else {
                return new Response(JSON.stringify({
                    "code": errorCode.CANNOT_CANCEL_VOTE,
                    "msg": 'This post\'s count is less than 1, cannot cancel upvote.'
                }), {
                    status: 400,
                    headers,
                });
            }
        }

        return new Response(JSON.stringify({
            "code": errorCode.SUCCESS,
            "msg": "success"
        }), {
            status: 200,
            headers,
        });
    }

    // 其他非法路由重定向到首页
    const redirectUrl = `${url.origin}/`;
    return Response.redirect(redirectUrl, 302);
}