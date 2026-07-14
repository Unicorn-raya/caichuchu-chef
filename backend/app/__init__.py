"""菜厨厨 Chef 后端包"""
import logging
import sys

# 统一日志配置：输出到 stdout，HF Spaces 会捕获
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
