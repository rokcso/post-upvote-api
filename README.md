# post-upvote-api

本项目是 [hugo-bearblog-neo](https://github.com/rokcso/hugo-bearblog-neo) 中 Upvote 功能的后端服务。基于 Cloudflare Workers + KV，可以非常方便地自部署。

Upvote 功能：支持用户对单篇文章进行 Upvote，统计每篇文章的 Upvote 数，判断用户对单篇文章的 Upvote 状态。

## 部署指南

### 部署 Workers

注册/登录 Cloudflare 后台，前往 Workers 模块后点击 Create（下图 2 处）。

点击 Create Worker（下图 3 处）。

随便输入一个名称（比如 post-upvote）后点击 Deploy（下图 5 处）。

然后点击 Edit code（下图 6 处）。

删除代码编辑器（下图 7 处）中原有的代码，将本项目 [worker.js]() 中的代码完全复制粘贴到代码编辑器中，点击 Deploy（下图 8 处）。

### 创建 KV namespace

注册/登录 Cloudflare 后台，前往 KV 模块后点击 Create（下图 10 处）。

随便输入一个名称（比如 upvote-count）后点击 Add（下图 12 处）。

用相同的步骤再创建一个 KV namespace，依然可以随便命名（比如 upvote-record）。

### 为 Workers 绑定 KV namespace

注册/登录 Cloudflare 后台，前往 Workers 模块后点击进入刚刚创建的 Worker（如本案例中下图 14 处的 post-upvote）。

前往该 Worker 中的 Settings -> Bindings，点击 Add（下图 17 处）。

选择 KV namespace 后输入 Variable name 为 `UPVOTE_COUNT`，然后选择一个刚刚创建的 KV namespace（比如 upvote-count），随后点击 Save（下图 20 处）。

用相同的步骤再创建一个 Variable name 为 `UPVOTE_RECORD`，选择刚刚创建的另一个 KV namespace（比如 upvote-record），随后点击 Save。

### 测试

## 在 hugo-bearblog-neo 中启用 Upvote 功能




