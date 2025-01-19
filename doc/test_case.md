// 测试首页路由
fetch('https://post-upvote.rokcso.com/')
    .then(response => response.json())
    .then(data => console.log('Home route:', data))
    .catch(error => console.error('Error:', error));

// 测试 /count 路由 - GET 请求，带 post 参数
fetch('https://post-upvote.rokcso.com/count?post=123')
    .then(response => response.json())
    .then(data => console.log('/count with post parameter:', data))
    .catch(error => console.error('Error:', error));

// 测试 /count 路由 - GET 请求，不带 post 参数
fetch('https://post-upvote.rokcso.com/count')
    .then(response => response.json())
    .then(data => console.log('/count without post parameter:', data))
    .catch(error => console.error('Error:', error));

// 测试 /count 路由 - POST 请求
fetch('https://post-upvote.rokcso.com/count', { method: 'POST' })
    .then(response => response.json())
    .then(data => console.log('/count with POST method:', data))
    .catch(error => console.error('Error:', error));

// 测试 /upvote 路由 - POST 请求，带合法的 postId 和 diff
fetch('https://post-upvote.rokcso.com/upvote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: '123', diff: 1 })
})
    .then(response => response.json())
    .then(data => console.log('/upvote with valid body:', data))
    .catch(error => console.error('Error:', error));

// 测试 /upvote 路由 - POST 请求，带非法的 postId 或 diff
fetch('https://post-upvote.rokcso.com/upvote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: '', diff: 'invalid' })
})
    .then(response => response.json())
    .then(data => console.log('/upvote with invalid body:', data))
    .catch(error => console.error('Error:', error));

// 测试 /upvote 路由 - GET 请求
fetch('https://post-upvote.rokcso.com/upvote', { method: 'GET' })
    .then(response => response.json())
    .then(data => console.log('/upvote with GET method:', data))
    .catch(error => console.error('Error:', error));

// 测试非法路由
fetch('https://post-upvote.rokcso.com/invalid')
    .then(response => {
        if (response.redirected) {
            console.log('Invalid route redirected to:', response.url);
        } else {
            return response.json();
        }
    })
    .then(data => console.log('Invalid route response:', data))
    .catch(error => console.error('Error:', error));