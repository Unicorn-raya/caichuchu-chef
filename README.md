---
title: 菜厨厨 Chef API
emoji: 🍳
colorFrom: orange
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# 菜厨厨智能菜谱推荐

基于 RAG 的菜谱推荐后端服务，根据冰箱剩余食材推荐菜谱。

## API

- `GET /api/recipes` - 获取所有菜谱
- `POST /api/search` - 搜索推荐菜谱
- `GET /api/recipe/{id}` - 获取菜谱详情
- `GET /api/tags` - 获取菜谱标签
