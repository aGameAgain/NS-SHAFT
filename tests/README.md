# 自动化测试文档

## 测试架构

这个项目采用了完整的自动化测试策略，包含三个层次：

### 1. 单元测试 (Vitest)
- **目的**: 测试各个模块的独立功能
- **技术**: Vitest + jsdom
- **优势**: 快速、隔离、不依赖浏览器

**测试覆盖的模块:**
- `GameState` - 游戏状态管理
- `Platform` & `PlatformManager` - 平台系统
- `Player` - 玩家逻辑
- `Physics` - 碰撞检测和物理引擎

### 2. 集成测试 (Playwright)
- **目的**: 测试浏览器中的实际游戏行为
- **技术**: Playwright (支持 Chrome, Firefox, Safari)
- **优势**: 真实用户环境、跨浏览器兼容性

**测试场景:**
- 基础功能 (`game-basic.spec.js`)
- 用户交互 (`game-interaction.spec.js`) 
- 视觉渲染 (`game-visual.spec.js`)
- 性能测试 (`game-performance.spec.js`)

### 3. 视觉回归测试
- **目的**: 确保游戏渲染正确
- **技术**: Playwright Screenshots
- **优势**: 检测视觉变化、支持多设备

## 运行测试

### 安装依赖
```bash
npm install
```

### 运行所有测试
```bash
npm test
```

### 单独运行单元测试
```bash
npm run test:unit          # 运行一次
npm run test:unit:watch    # 监视模式
```

### 单独运行端到端测试
```bash
npm run test:e2e           # 运行所有浏览器
npm run test:e2e:ui        # 可视化界面
npm run test:e2e:debug     # 调试模式
```

### 安装Playwright浏览器
```bash
npx playwright install
```

## 测试特性

### 单元测试特性
- ✅ 模拟DOM环境 (jsdom)
- ✅ Canvas API 模拟
- ✅ 快速执行 (<100ms per test)
- ✅ 高代码覆盖率
- ✅ 独立测试（无副作用）

### 端到端测试特性
- ✅ 多浏览器支持 (Chrome, Firefox, Safari)
- ✅ 真实用户交互模拟
- ✅ 自动截图和视频录制
- ✅ 网络条件模拟
- ✅ 移动设备测试
- ✅ 性能监控

### 测试数据和报告
- 📊 HTML测试报告 (playwright-report/)
- 📷 失败时自动截图
- 🎥 测试执行视频录制
- 📈 性能指标收集

## CI/CD 集成

测试配置支持持续集成：
- 自动启动开发服务器
- 并行测试执行
- 失败时重试机制
- 跨平台兼容性

## 最佳实践

1. **测试隔离**: 每个测试独立运行，不依赖其他测试
2. **真实场景**: 模拟真实用户行为和边界条件
3. **快速反馈**: 单元测试快速执行，及时发现问题
4. **视觉验证**: 使用截图确保UI正确渲染
5. **性能监控**: 检测性能回归和内存泄漏

这套测试系统确保了游戏的稳定性、性能和用户体验质量。