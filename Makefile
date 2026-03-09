.PHONY: help test clean

# Default target
help:
	@echo "Meow! 日本語達陣 - 開發者工具"
	@echo ""
	@echo "可用指令:"
	@echo "  make test    執行所有測試 (導航、數據完整性、互動邏輯)"
	@echo "  make clean   清理暫存檔案"
	@echo "  make help    顯示此說明"

# Run all tests in the tests/ directory
test:
	@echo "正在執行系統測試..."
	@python3 -m unittest discover -s tests -p "test_*.py"

# Clean up any temporary files or python cache
clean:
	@echo "清理中..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@find . -type f -name "*.pyd" -delete
	@find . -type f -name ".test_*.swp" -delete
	@echo "清理完成。"
