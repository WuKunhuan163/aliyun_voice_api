# 阿里云语音识别 Web 应用

一个基于阿里云智能语音交互API的Web语音识别应用，支持实时录音、语音识别和智能分析。

🌐 **在线体验**: [https://250903-aliyun-voice.vercel.app](https://250903-aliyun-voice.vercel.app)

## ✨ 功能特性

- 🎤 **实时录音**: 使用Web Audio API进行高质量音频录制，支持30秒自动停止
- 🔊 **语音识别**: 集成阿里云智能语音交互API，高精度中文识别
- 🤖 **智能分析**: 使用智谱AI GLM-4.5-Flash对识别结果进行智能总结
- 📊 **实时波形**: SVG实时音频波形可视化，录音进度条显示
- 💾 **配置管理**: 支持配置导入导出，sessionStorage持久化存储
- 🚀 **智能跳转**: 基于配置完成状态的自动步骤跳转系统
- 🎯 **步骤向导**: 6步配置向导，清晰的用户引导流程
- 📱 **响应式设计**: 适配桌面和移动端设备

## 🚀 快速开始

### 在线使用

直接访问 [https://250903-aliyun-voice.vercel.app](https://250903-aliyun-voice.vercel.app)，按照步骤配置API密钥即可使用。

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/WuKunhuan163/aliyun_voice_to_text.git
   cd aliyun_voice_to_text
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器（自动打开浏览器）**
   ```bash
   npm run dev
   ```

4. **启动生产服务器**
   ```bash
   npm start
   ```

## 🔧 配置要求

### 必需配置

1. **阿里云智能语音交互**
   - 前往 [阿里云智能语音交互控制台](https://nls-portal.console.aliyun.com/)
   - 开通服务并创建项目获取 AppKey
   - 创建用户并获取 AccessKey ID 和 AccessKey Secret

2. **智谱AI** (可选，用于智能分析)
   - 前往 [智谱AI开放平台](https://bigmodel.cn/)
   - 获取API Key
   - 注意：智谱AI功能现在通过独立的 [zhipu_llm_api](https://zhipu-llm-api.vercel.app) 服务提供

### 配置步骤

应用提供完整的6步配置向导：

1. **服务开通确认** - 确认阿里云服务已开通
2. **AppKey配置** - 输入项目AppKey
3. **用户创建确认** - 确认已创建语音交互用户
4. **AccessKey配置** - 输入并验证AccessKey凭据
5. **录音测试** - 测试语音录制和识别功能
6. **智谱AI配置** - 配置AI分析功能（可选）

## 🛠️ 技术架构

### 前端技术栈
- **HTML5/CSS3**: 现代Web标准，响应式设计
- **Vanilla JavaScript (ES6+)**: 模块化架构，无外部框架依赖
- **Web Audio API**: 高质量音频录制和实时处理
- **AudioWorkletNode**: 音频数据流处理
- **SVG**: 实时波形可视化
- **SessionStorage**: 配置持久化存储

### 后端技术栈
- **Node.js**: 服务器运行时
- **Express风格路由**: RESTful API设计
- **阿里云NLS SDK**: 语音识别服务集成
- **Vercel Serverless**: 云函数部署

### API服务架构
- **阿里云语音识别**: 直接集成阿里云NLS API
- **智谱AI服务**: 通过独立的 [zhipu_llm_api](https://zhipu-llm-api.vercel.app) 微服务
  - 解耦智谱AI功能，独立部署和维护
  - 统一的API接口，便于其他项目复用
  - 支持GLM-4-Flash等多种模型

### 核心模块

```
assets/scripts/
├── app.js              # 主应用逻辑，协调各模块
├── audio-recorder.js   # 音频录制模块，Web Audio API封装
├── config-manager.js   # 配置管理，持久化存储
├── ui-manager.js       # UI状态管理，步骤控制
├── aliyun-api.js       # 阿里云API封装
└── server.js          # 本地开发服务器
```

## 💡 编程经验与技术亮点

### 1. 模块化架构设计

采用ES6类和模块化设计，实现了高内聚低耦合：

```javascript
class VoiceRecognitionApp {
    constructor() {
        this.stepAutoJumpManager = this.createStepAutoJumpManager();
    }
    
    createStepAutoJumpManager() {
        return {
            stepConfigs: { /* 步骤配置 */ },
            async autoJumpFromStep(startStep) { /* 自动跳转逻辑 */ }
        };
    }
}
```

### 2. Web Audio API 深度应用

实现了专业级音频录制和实时可视化：

```javascript
// 使用AudioWorkletNode进行音频处理
const audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');
audioWorkletNode.port.onmessage = (event) => {
    const { audioData, rms } = event.data;
    this.updateWaveform(rms); // 实时波形更新
};
```

### 3. 智能状态管理

基于状态机的步骤管理系统：

```javascript
stepConfigs: {
    2: {
        name: 'AppKey配置',
        hasJumpButton: true,
        jumpFunction: () => this.validateStep2(),
        canAutoJump: () => {
            const hasConfig = config.appKey && config.appKey.trim();
            const wasCompleted = configManager.isStepCompleted(2);
            return hasConfig && wasCompleted;
        }
    }
}
```

### 4. 异步操作优化

使用Promise和async/await处理复杂异步流程：

```javascript
async executeStepJump(stepNumber) {
    try {
        await stepConfig.jumpFunction();
        return true;
    } catch (error) {
        console.error(`步骤${stepNumber}跳转失败:`, error);
        return false;
    }
}
```

### 5. 错误处理与用户体验

实现了完善的错误处理和用户反馈机制：

```javascript
try {
    const result = await this.performSpeechRecognition(audioBlob);
    if (result) {
        this.handleRecognitionSuccess(result);
    }
} catch (error) {
    this.handleRecognitionError(error);
    uiManager.showStepStatus('step5', `❌ ${error.message}`, 'error');
}
```

### 6. 性能优化技巧

- **事件委托**: 减少事件监听器数量
- **防抖处理**: 避免频繁的API调用
- **内存管理**: 及时释放音频资源
- **懒加载**: 按需初始化重型组件

### 7. 跨平台兼容性

实现了多平台的自动浏览器打开功能：

```javascript
const platform = process.platform;
let command;
switch (platform) {
    case 'darwin': command = `open ${url}`; break;
    case 'win32': command = `start ${url}`; break;
    default: command = `xdg-open ${url}`; break;
}
```

## 🎯 使用技巧

### 录音优化
- 确保安静环境，减少背景噪音
- 距离麦克风15-30cm，清晰发音
- 录音时长建议10-25秒，获得最佳识别效果

### 配置管理
- 使用导出功能备份配置
- 配置导入后会自动跳转到合适步骤
- sessionStorage确保页面刷新后配置不丢失

### 智能分析
- 智谱AI会自动总结录音内容
- 支持50字以内的简洁总结
- 可用于会议记录、语音备忘等场景

## 🔒 安全说明

- **隐私保护**: 所有API密钥仅在前端临时存储，不会上传到服务器
- **数据安全**: 音频数据仅用于识别，不进行持久化存储
- **会话管理**: 使用sessionStorage，关闭浏览器自动清除敏感信息

## 📈 项目统计

- **代码行数**: ~2000+ 行
- **模块数量**: 6个核心模块
- **API集成**: 2个第三方服务
- **浏览器兼容**: Chrome 66+, Firefox 60+, Safari 12+

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [阿里云智能语音交互](https://ai.aliyun.com/nls)
- [智谱AI开放平台](https://bigmodel.cn/)
- [Web Audio API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Vercel 部署文档](https://vercel.com/docs)