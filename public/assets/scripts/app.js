/**
 * 主应用逻辑模块
 * 协调各个模块，处理用户交互和业务流程
 */

class VoiceRecognitionApp {
    constructor() {
        this.isProcessingRecording = false;
        this.progressTimer = null;
        this.stepAutoJumpManager = null;
        this.currentStep = 1; // 追踪当前激活的步骤
        this.asyncOperations = new Map(); // 追踪正在进行的异步操作
        this.totalSteps = 6; // 总步骤数
        
        // 配置项到步骤的映射关系
        this.configStepMapping = {
            // 步骤1：服务设置（总是完成）
            1: [],
            // 步骤2：AppKey配置
            2: ['appKey'],
            // 步骤3：用户创建（总是可以完成）
            3: [],
            // 步骤4：AccessKey配置
            4: ['accessKeyId', 'accessKeySecret'],
            // 步骤5：录音测试（需要前面步骤完成）
            5: ['appKey', 'accessKeyId', 'accessKeySecret'],
            // 步骤6：智谱API配置
            6: ['zhipuApiKey']
        };
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 将应用实例注册为全局对象，供其他模块使用
        window.voiceApp = this;
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.initializeStepAutoJump();
            });
        } else {
            this.setupEventListeners();
            this.initializeStepAutoJump();
        }
    }

    /**
     * 初始化步骤自动跳转功能
     */
    initializeStepAutoJump() {
        this.stepAutoJumpManager = this.createStepAutoJumpManager();
        
        // 检查是否有缓存配置需要自动跳转
        setTimeout(() => {
            this.checkAndAutoJumpFromSession();
        }, 1000);
    }

    /**
     * 更新当前步骤
     */
    setCurrentStep(stepNumber) {
        const completedSteps = [...configManager.completedSteps];
        console.log(`📍 当前步骤从 ${this.currentStep} 切换到 ${stepNumber}`);
        console.log(`📋 setCurrentStep(${stepNumber}) - 当前completedSteps:`, completedSteps);
        this.currentStep = stepNumber;
    }

    /**
     * 验证是否还在指定步骤
     */
    isStillInStep(stepNumber) {
        const isStill = this.currentStep === stepNumber;
        if (!isStill) {
            console.log(`⚠️ 步骤验证失败: 期望步骤${stepNumber}, 当前步骤${this.currentStep}, 操作被忽略`);
        }
        return isStill;
    }

    /**
     * 注册异步操作
     */
    registerAsyncOperation(operationId, stepNumber) {
        this.asyncOperations.set(operationId, {
            stepNumber,
            timestamp: Date.now()
        });
        console.log(`🔄 注册异步操作: ${operationId} (步骤${stepNumber})`);
    }

    /**
     * 取消注册异步操作
     */
    unregisterAsyncOperation(operationId) {
        if (this.asyncOperations.has(operationId)) {
            console.log(`✅ 异步操作完成: ${operationId}`);
            this.asyncOperations.delete(operationId);
        }
    }

    /**
     * 验证异步操作是否仍然有效
     */
    isAsyncOperationValid(operationId) {
        const operation = this.asyncOperations.get(operationId);
        if (!operation) {
            console.log(`⚠️ 异步操作${operationId}不存在或已清除`);
            return false;
        }
        
        const isValid = this.currentStep === operation.stepNumber;
        if (!isValid) {
            console.log(`⚠️ 异步操作${operationId}无效: 操作步骤${operation.stepNumber}, 当前步骤${this.currentStep}`);
            this.unregisterAsyncOperation(operationId);
        }
        return isValid;
    }

    /**
     * 清除所有异步操作
     */
    clearAsyncOperations() {
        if (this.asyncOperations.size > 0) {
            console.log(`🧹 清除 ${this.asyncOperations.size} 个异步操作`);
            this.asyncOperations.clear();
        }
    }

    /**
     * 检查session缓存并自动跳转
     */
    async checkAndAutoJumpFromSession() {
        const completedSteps = [...configManager.completedSteps];
        console.log('🔍 检查session缓存是否需要自动跳转');
        console.log('📋 checkAndAutoJumpFromSession - 当前completedSteps:', completedSteps);
        
        // 从步骤1开始检查
        await this.stepAutoJumpManager.autoJumpFromStep(1);
    }



    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 配置管理事件
        this.setupConfigEvents();
        
        // 步骤控制事件
        this.setupStepEvents();
        
        // 录音控制事件
        this.setupRecordingEvents();
        

    }

    /**
     * 设置配置相关事件
     */
    setupConfigEvents() {
        // 配置输入事件
        const appKeyInput = document.getElementById('appKey');
        const accessKeyIdInput = document.getElementById('accessKeyId');
        const accessKeySecretInput = document.getElementById('accessKeySecret');

        if (appKeyInput) {
            appKeyInput.addEventListener('input', (e) => {
                configManager.setConfig('appKey', e.target.value);
            });
        }

        if (accessKeyIdInput) {
            accessKeyIdInput.addEventListener('input', (e) => {
                configManager.setConfig('accessKeyId', e.target.value);
            });
        }

        if (accessKeySecretInput) {
            accessKeySecretInput.addEventListener('input', (e) => {
                configManager.setConfig('accessKeySecret', e.target.value);
                configManager.updateSecretDisplay();
            });
        }

        // 智谱API Key输入事件
        const zhipuApiKeyInput = document.getElementById('zhipuApiKey');
        if (zhipuApiKeyInput) {
            zhipuApiKeyInput.addEventListener('input', (e) => {
                configManager.setConfig('zhipuApiKey', e.target.value);
                configManager.updateZhipuKeyDisplay();
                
                // 自动验证智谱API（如果输入了有效的API Key）
                const apiKey = e.target.value.trim();
                if (apiKey && apiKey.length > 10) { // 简单验证API Key格式
                    console.log('🔑 检测到智谱API Key输入，准备自动验证...');
                    // 延迟一下让用户看到输入完成
                    setTimeout(() => {
                        if (typeof validateStep6 === 'function') {
                            console.log('🚀 自动触发智谱API验证');
                            validateStep6();
                        }
                    }, 1000);
                }
            });
        }

        // 聊天输入框回车发送
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !chatInput.disabled) {
                    e.preventDefault();
                    sendChatMessage();
                }
            });
        }

        // 配置导入导出事件
        this.setupConfigModal();
    }

    /**
     * 设置配置模态框事件
     */
    setupConfigModal() {
        const importBtn = document.getElementById('importBtn');
        const exportBtn = document.getElementById('exportBtn');
        const configModal = document.getElementById('configModal');
        const closeModal = document.getElementById('closeModal');
        const importConfigBtn = document.getElementById('importConfig');
        const exportConfigBtn = document.getElementById('exportConfig');

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                if (configModal) configModal.style.display = 'none';
            });
        }

        if (importConfigBtn) {
            importConfigBtn.addEventListener('click', () => {
                this.importConfiguration();
            });
        }

        // 导出配置相关事件
        const copyToClipboardBtn = document.getElementById('copyToClipboard');
        const downloadJsonBtn = document.getElementById('downloadJson');
        const clearConfigBtn = document.getElementById('clearConfig');
        const uploadJsonBtn = document.getElementById('uploadJson');
        const jsonFileInput = document.getElementById('jsonFileInput');

        if (copyToClipboardBtn) {
            copyToClipboardBtn.addEventListener('click', () => {
                this.copyConfigToClipboard();
            });
        }

        if (downloadJsonBtn) {
            downloadJsonBtn.addEventListener('click', () => {
                this.downloadConfigJson();
            });
        }

        if (clearConfigBtn) {
            clearConfigBtn.addEventListener('click', () => {
                this.clearConfigText();
            });
        }

        if (uploadJsonBtn) {
            uploadJsonBtn.addEventListener('click', () => {
                if (jsonFileInput) jsonFileInput.click();
            });
        }

        if (jsonFileInput) {
            jsonFileInput.addEventListener('change', (e) => {
                this.handleJsonFileUpload(e);
            });
        }

        // 点击模态框外部关闭
        if (configModal) {
            configModal.addEventListener('click', (e) => {
                if (e.target === configModal) {
                    configModal.style.display = 'none';
                }
            });
        }

        // 添加info icon点击事件监听
        this.setupInfoIconEvents();
        
        // 设置录音自动停止回调
        this.setupAutoStopCallback();
    }

    /**
     * 设置录音自动停止回调
     */
    setupAutoStopCallback() {
        if (window.audioRecorder) {
            window.audioRecorder.onAutoStop = (mp3Blob) => {
                console.log('🔄 录音自动停止，开始语音识别处理...');
                // 处理自动停止的录音
                this.handleAutoStopRecording(mp3Blob);
            };
        }
    }

    /**
     * 处理自动停止的录音
     */
    async handleAutoStopRecording(mp3Blob) {
        const recordingBtn = document.getElementById('recordingBtn');
        const transcriptionResult = document.getElementById('transcriptionResult');
        const downloadBtn = document.getElementById('downloadBtn');
        
        console.log('🔄 处理自动停止的录音数据...');
        
        try {
            // 更新按钮状态
            this.updateRecordingButton('处理中...', 'linear-gradient(135deg, #6c757d, #495057)', true);
            
            // 添加处理中状态的蓝色风格
            const step5Element = document.getElementById('step5');
            if (step5Element) {
                step5Element.classList.add('processing');
            }
            
            if (mp3Blob) {
                // 设置文本框背景为白色（录音结束，准备识别）
                if (transcriptionResult) {
                    transcriptionResult.style.backgroundColor = '#ffffff'; // 白色背景
                    transcriptionResult.textContent = '正在识别语音...';
                    transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                }
                
                // 进行语音识别
                await this.performSpeechRecognition(mp3Blob, transcriptionResult, downloadBtn);
                
            } else {
                console.error('❌ 自动停止数据为空');
                uiManager.showStepStatus('step5', '❌ 录音失败，请重新尝试', 'error');
            }
            
        } catch (error) {
            console.error('❌ 自动停止处理失败:', error);
            uiManager.showStepStatus('step5', '❌ 录音处理失败，请重新尝试', 'error');
        } finally {
            // 立即恢复按钮状态
            this.updateRecordingButton('开始');
            
            // 移除处理中状态
            const step5Element = document.getElementById('step5');
            if (step5Element) {
                step5Element.classList.remove('processing');
            }
        }
    }

    /**
     * 处理录音停止（手动或自动）
     */
    async handleRecordingStop() {
        const recordingBtn = document.getElementById('recordingBtn');
        const transcriptionResult = document.getElementById('transcriptionResult');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (!recordingBtn || recordingBtn.textContent !== '停止') {
            return; // 不是录音状态，不处理
        }
        
        try {
            // 模拟按钮点击的UI更新
            this.updateRecordingButton('处理中...', 'linear-gradient(135deg, #6c757d, #495057)', true);
            
            // 添加处理中状态的蓝色风格
            const step5Element = document.getElementById('step5');
            if (step5Element) {
                step5Element.classList.add('processing');
            }
            
            const mp3Blob = await audioRecorder.stopRecording();
            
            if (mp3Blob) {
                // 设置文本框背景为白色（录音结束，准备识别）
                if (transcriptionResult) {
                    transcriptionResult.style.backgroundColor = '#ffffff'; // 白色背景
                    transcriptionResult.textContent = '正在识别语音...';
                    transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                }
                
                // 进行语音识别
                await this.performSpeechRecognition(mp3Blob, transcriptionResult, downloadBtn);
                
                // 立即恢复按钮正常状态
                this.updateRecordingButton('开始');
                
                // 移除处理中状态
                const step5Element = document.getElementById('step5');
                if (step5Element) {
                    step5Element.classList.remove('processing');
                }
            } else {
                // 录音失败的情况
                console.error('❌ 录音数据为空');
                uiManager.showStepStatus('step5', '❌ 录音失败，请重新尝试', 'error');
                
                this.updateRecordingButton('开始');
            }
        } catch (error) {
            console.error('❌ 录音处理失败:', error);
            uiManager.showStepStatus('step5', '❌ 录音处理失败，请重新尝试', 'error');
            
            this.updateRecordingButton('开始');
        }
    }

    /**
     * 更新录音按钮状态的辅助函数
     * @param {string} text - 按钮文本
     * @param {string} background - 背景色
     * @param {boolean} disabled - 是否禁用
     */
    updateRecordingButton(text, background = '', disabled = false) {
        const recordingBtn = document.getElementById('recordingBtn');
        if (recordingBtn) {
            recordingBtn.textContent = text;
            recordingBtn.style.background = background;
            recordingBtn.style.color = background ? 'white' : '';
            recordingBtn.disabled = disabled;
        }
    }

    /**
     * 设置info icon点击事件来显示tooltip
     */
    setupInfoIconEvents() {
        const infoIcons = document.querySelectorAll('.info-icon');
        infoIcons.forEach((icon, index) => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 切换tooltip显示状态
                const isShowing = icon.classList.contains('show-tooltip');
                
                // 先隐藏所有tooltip
                infoIcons.forEach(i => i.classList.remove('show-tooltip'));
                
                // 如果之前没有显示，则显示当前tooltip
                if (!isShowing) {
                    icon.classList.add('show-tooltip');
                    console.log(`💡 显示tooltip ${index}`);
                    
                    // 3秒后自动隐藏
                    setTimeout(() => {
                        icon.classList.remove('show-tooltip');
                        console.log(`💡 自动隐藏tooltip ${index}`);
                    }, 3000);
                } else {
                    console.log(`💡 手动隐藏tooltip ${index}`);
                }
            });
        });
        
        // 点击其他地方隐藏tooltip
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.info-icon')) {
                infoIcons.forEach(icon => icon.classList.remove('show-tooltip'));
            }
        });
        
        console.log(`💡 已添加点击事件到 ${infoIcons.length} 个info icons`);
    }

    /**
     * 设置步骤控制事件
     */
    setupStepEvents() {
        // 这些函数会在HTML中直接调用，这里只是确保它们存在于全局作用域
        window.completeServiceSetup = () => this.completeServiceSetup();
        window.validateStep2 = () => this.validateStep2();
        window.completeStep3 = () => this.completeStep3();
        window.validateStep4 = () => this.validateStep4();
        window.goBackToStep = (step) => this.goBackToStep(step);
        window.toggleRecording = () => this.toggleRecording();
        window.downloadRecording = () => this.downloadRecording();
        
        // 添加步骤跳转接口
        window.validateStep6 = validateStep6;
    }

    /**
     * 设置录音相关事件
     */
    setupRecordingEvents() {
        window.toggleRecording = () => this.toggleRecording();
        window.downloadRecording = () => this.downloadRecording();
    }

    /**
     * 完成服务设置（步骤1）
     */
    completeServiceSetup() {
        uiManager.setStepState(1, 'completed');
        configManager.markStepCompleted(1);
    }

    /**
     * 验证步骤2（AppKey配置）
     */
    validateStep2() {
        const config = configManager.getAllConfig();
        
        if (!config.appKey.trim()) {
            uiManager.showStepStatus('step2', '❌ 请输入AppKey', 'error');
            return;
        }
        
        // AppKey配置完成
        uiManager.setStepState(2, 'completed');
        configManager.markStepCompleted(2);
        uiManager.showStepStatus('step2', '✅ AppKey配置已完成，请继续配置AccessKey', 'success');
    }

    /**
     * 完成步骤3（用户创建）
     */
    completeStep3() {
        // 第三步不需要验证，直接完成
        uiManager.setStepState(3, 'completed');
        configManager.markStepCompleted(3);
        uiManager.showStepStatus('step3', '✅ 用户创建步骤已完成', 'success');
    }

    /**
     * 验证步骤4（AccessKey配置）
     */
    async validateStep4() {
        const config = configManager.getAllConfig();
        
        // 验证输入
        const validation = configManager.validateConfig();
        if (!validation.valid) {
            uiManager.showStepStatus('step4', `❌ ${validation.errors.join(', ')}`, 'error');
            return;
        }

        try {
            uiManager.showStepStatus('step4', '🔄 正在验证AccessKey...', 'info');
            
            // 调用阿里云API验证
            const result = await aliyunAPI.validateCredentials(
                config.appKey,
                config.accessKeyId,
                config.accessKeySecret
            );

            if (result.success) {
                uiManager.setStepState(4, 'completed');
                configManager.markStepCompleted(4);
                uiManager.showStepStatus('step4', '✅ AccessKey验证成功！Token已获取', 'success');
                
                // 自动跳转到录音步骤
                setTimeout(() => {
                    this.initializeRecordingStep();
                }, 1000);
            } else {
                // 处理友好的错误信息
                let friendlyError = result.error || '未知错误';
                
                // 将技术性错误转换为用户友好的错误信息
                if (friendlyError.includes('Specified signature is not matched')) {
                    friendlyError = 'AccessKey Secret错误，请检查是否正确复制';
                } else if (friendlyError.includes('InvalidAccessKeyId')) {
                    friendlyError = 'AccessKey ID不存在，请检查是否正确';
                } else if (friendlyError.includes('SignatureDoesNotMatch')) {
                    friendlyError = 'AccessKey Secret错误，请重新复制正确的密钥';
                } else if (friendlyError.includes('InvalidTimeStamp')) {
                    friendlyError = '系统时间错误，请检查设备时间设置';
                } else if (friendlyError.includes('Forbidden')) {
                    friendlyError = 'AccessKey权限不足，请检查RAM用户权限配置';
                } else if (friendlyError.length > 100) {
                    // 如果错误信息太长，显示简化版本
                    friendlyError = '验证失败，请检查AccessKey ID和Secret是否正确';
                }
                
                console.error('第四步验证失败，原始错误:', result.error);
                uiManager.showStepStatus('step4', `❌ ${friendlyError}`, 'error');
            }
        } catch (error) {
            console.error('验证过程出错:', error);
            uiManager.showStepStatus('step4', '❌ 网络连接失败，请检查网络后重试', 'error');
        }
    }

    /**
     * 初始化录音步骤
     */
    initializeRecordingStep() {
        uiManager.setStepState(5, 'active');
        uiManager.showStepStatus('step5', '', 'info');
    }

    /**
     * 回到指定步骤
     * @param {number} targetStep - 目标步骤
     */
    goBackToStep(targetStep, resetPending = true) {
        if (audioRecorder.getIsRecording()) {
            audioRecorder.stopRecording().catch(console.error);
        }
        uiManager.goBackToStep(targetStep, resetPending);
    }

    /**
     * 切换录音状态
     */
    async toggleRecording() {
        const recordingBtn = document.getElementById('recordingBtn');
        
        // 防止重复操作
        if (this.isProcessingRecording) {
            console.log('录音操作正在进行中，忽略重复点击');
            return;
        }
        
        this.isProcessingRecording = true;
        if (recordingBtn) recordingBtn.disabled = true;
        
        console.log('toggleRecording called, isRecording:', audioRecorder.getIsRecording());
        
        try {
            // 如果步骤5还不是active状态，先激活它
            if (uiManager.getStepState(5) !== 'active') {
                uiManager.setStepState(5, 'active');
                // 清除之前的完成提示
                uiManager.showStepStatus('step5', '', 'info');
                console.log('激活步骤5（录音步骤），清除完成提示');
            }
            
            if (!audioRecorder.getIsRecording()) {
                console.log('开始...');
                await this.startNewRecording();
            } else {
                console.log('停止...');
                await this.handleRecordingStop();
            }
        } finally {
            // 确保在操作完成后重新启用按钮和重置状态
            setTimeout(() => {
                this.isProcessingRecording = false;
                if (recordingBtn && !audioRecorder.getIsRecording()) {
                    recordingBtn.disabled = false;
                }
            }, 500);
        }
    }

    /**
     * 开始
     */
    async startNewRecording() {
        const recordingBtn = document.getElementById('recordingBtn');
        const transcriptionResult = document.getElementById('transcriptionResult');
        
        try {
            recordingBtn.textContent = '启动中...';
            
            // 重置进度条和波形
            const progressFill = document.getElementById('progressFillThin');
            const waveformProgressMask = document.getElementById('waveformProgressMask');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
            if (waveformProgressMask) {
                waveformProgressMask.setAttribute('width', '0');
            }
            
            // 使用AudioRecorder开始
            const success = await audioRecorder.startRecording();
            
            if (success) {
                // 更新UI
                recordingBtn.textContent = '停止';
                recordingBtn.style.background = '#dc3545';
                recordingBtn.style.color = 'white';
                recordingBtn.disabled = false;
                
                console.log('录音按钮已启用，可以点击停止');
                
                // 开始进度条更新
                this.startProgressUpdate();
                
                // 设置文本框背景为灰色（录音中）
                if (transcriptionResult) {
                    transcriptionResult.textContent = '录音中...';
                    transcriptionResult.style.backgroundColor = '#f8f9fa'; // 灰色背景
                    transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                }
                
                console.log('🔴 录音开始');
            }
        } catch (error) {
            console.error('❌ 录音启动失败:', error);
            
            if (recordingBtn) {
                recordingBtn.disabled = false;
                recordingBtn.textContent = '开始';
            }
            
            uiManager.showStepStatus('step5', `❌ ${error.message}`, 'error');
        }
    }

    /**
     * 停止
     */
    async stopRecording() {
        const recordingBtn = document.getElementById('recordingBtn');
        const transcriptionResult = document.getElementById('transcriptionResult');
        const downloadBtn = document.getElementById('downloadBtn');
        
        try {
            // 立即更新UI
            if (recordingBtn) {
                recordingBtn.textContent = '处理中...';
                recordingBtn.disabled = true;
                recordingBtn.style.background = '#6c757d';
                recordingBtn.style.color = 'white';
            }

            // 停止进度条
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }

            // 使用AudioRecorder停止
            const mp3Blob = await audioRecorder.stopRecording();
            
            if (mp3Blob) {
                // 设置文本框背景为白色（录音结束，准备识别）
                if (transcriptionResult) {
                    transcriptionResult.style.backgroundColor = '#ffffff'; // 白色背景
                    transcriptionResult.textContent = '正在识别语音...';
                    transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                }
                
                // 进行语音识别
                const recognitionSuccess = await this.performSpeechRecognition(mp3Blob, transcriptionResult, downloadBtn);
                
                // 根据识别结果设置按钮状态
                if (recordingBtn) {
                    if (recognitionSuccess) {
                        recordingBtn.textContent = '已完成';
                        recordingBtn.style.background = '#28a745'; // 绿色背景
                        recordingBtn.style.color = 'white';
                        recordingBtn.disabled = true; // 完成后禁用
                    } else {
                        recordingBtn.textContent = '开始';
                        recordingBtn.style.background = '';
                        recordingBtn.style.color = '';
                        recordingBtn.disabled = false;
                    }
                    console.log('录音按钮状态已更新');
                }
                
                // 重置进度条，确保下次录音开始时为0
                const progressFill = document.getElementById('progressFillThin');
                const waveformProgressMask = document.getElementById('waveformProgressMask');
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
                if (waveformProgressMask) {
                    waveformProgressMask.setAttribute('width', '0');
                }
            }
        } catch (error) {
            console.error('❌ 停止失败:', error);
            uiManager.showStepStatus('step5', `停止失败: ${error.message}`, 'error');
            
            // 恢复按钮状态
            if (recordingBtn) {
                recordingBtn.disabled = false;
                recordingBtn.textContent = '开始';
                recordingBtn.style.background = '';
                recordingBtn.style.color = '';
            }
            
            // 重置进度条
            const progressFill = document.getElementById('progressFillThin');
            const waveformProgressMask = document.getElementById('waveformProgressMask');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
            if (waveformProgressMask) {
                waveformProgressMask.setAttribute('width', '0');
            }
        }
    }

    /**
     * 开始进度条更新
     */
    startProgressUpdate() {
        const progressFill = document.getElementById('progressFillThin');
        const startTime = Date.now();
        
        this.progressTimer = setInterval(() => {
            if (!audioRecorder.getIsRecording()) {
                // 录音已停止，清除定时器并重置进度条
                clearInterval(this.progressTimer);
                this.progressTimer = null;
                return;
            }
            
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min((elapsed / 30) * 100, 100); // 30秒最大
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            if (elapsed >= 30) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
        }, 100);
    }

    /**
     * 执行语音识别
     * @returns {Promise<boolean>} 识别是否成功
     */
    async performSpeechRecognition(mp3Blob, transcriptionResult, downloadBtn) {
        try {
            // 注册异步操作
            const operationId = `speech-recognition-${Date.now()}`;
            this.registerAsyncOperation(operationId, 5);
            
            console.log('🎤 开始语音识别...');
            console.log('📊 MP3文件大小:', mp3Blob.size, 'bytes');
            console.log('📝 transcriptionResult元素:', transcriptionResult);
            
            // 将MP3转换为PCM数据进行识别
            const audioBuffer = await this.convertMp3ToPcm(mp3Blob);
            console.log('🔄 音频转换完成，准备调用API...');
            
            const result = await aliyunAPI.recognizeSpeech(audioBuffer);
            console.log('📥 阿里云API返回结果:', result);
            
            // 验证操作是否仍然有效
            if (!this.isAsyncOperationValid(operationId)) {
                console.log('⚠️ 语音识别操作已无效，忽略结果');
                return false;
            }
            
            if (result.success && result.result && result.result.trim()) {
                const recognizedText = result.result.trim();
                console.log('✅ 语音识别成功:', recognizedText);
                console.log('📝 准备更新transcriptionResult...');
                
                // 显示识别结果
                if (transcriptionResult) {
                    console.log('🔄 更新前的文本内容:', transcriptionResult.textContent);
                    console.log('🆕 新的识别结果:', recognizedText);
                    console.log('📍 元素ID:', transcriptionResult.id);
                    console.log('📍 元素类名:', transcriptionResult.className);
                    
                    // 强制更新DOM
                    transcriptionResult.textContent = recognizedText;
                    transcriptionResult.style.color = '#333'; // 正常黑色文字
                    
                    // 验证更新是否成功
                    setTimeout(() => {
                        console.log('✅ 延迟验证 - 当前文本内容:', transcriptionResult.textContent);
                        console.log('🔍 是否匹配新结果:', transcriptionResult.textContent === recognizedText);
                    }, 100);
                    
                    console.log('✅ 立即验证 - 更新后的文本内容:', transcriptionResult.textContent);
                } else {
                    console.error('❌ transcriptionResult元素不存在！');
                }
                
                // 检查成功条件（超过10个字符）
                if (recognizedText.length > 10) {
                    // 标记第五步为完成
                    uiManager.setStepState(5, 'completed');
                    configManager.markStepCompleted(5);
                    uiManager.showStepStatus('step5', '✅ 语音识别成功！识别结果已显示。', 'success');
                    
                    // 显示下载按钮和下一步按钮
                    if (downloadBtn) {
                        downloadBtn.style.display = 'inline-block';
                    }
                    const nextToStep6Btn = document.getElementById('nextToStep6Btn');
                    if (nextToStep6Btn) {
                        nextToStep6Btn.style.display = 'inline-block';
                    }
                    
                    // 自动跳转到第6步
                    console.log('🔄 第5步完成，准备自动跳转到第6步');
                    setTimeout(() => {
                        this.setCurrentStep(6);
                        
                        // 检查第6步是否可以自动验证
                        setTimeout(async () => {
                            console.log('🔍 检查第6步是否可以自动验证');
                            const canAutoJump = this.stepAutoJumpManager.canStepAutoJump(6);
                            if (canAutoJump) {
                                console.log('🚀 第6步可以自动验证，开始执行');
                                await this.stepAutoJumpManager.executeStepJump(6);
                            } else {
                                console.log('⏹️ 第6步不能自动验证');
                            }
                        }, 500);
                    }, 1000);
                    
                    // 已移除自动进入第六步的检查，改为在页面加载时通过自动跳转系统处理
                    
                    // 取消注册异步操作
                    this.unregisterAsyncOperation(operationId);
                    return true; // 识别成功
                } else {
                    // 识别结果太短，视为失败
                    uiManager.showStepStatus('step5', '❌ 识别结果过短，请重新录制更长的语音。', 'error');
                    if (transcriptionResult) {
                        transcriptionResult.textContent = '识别结果过短，请重新录制';
                        transcriptionResult.style.backgroundColor = '#f8f9fa'; // 恢复灰色背景
                        transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                    }
                    // 取消注册异步操作
                    this.unregisterAsyncOperation(operationId);
                    return false; // 识别失败
                }
            } else {
                // 识别失败
                console.error('❌ 语音识别失败:', result.error || '未知错误');
                uiManager.showStepStatus('step5', `❌ 语音识别失败: ${result.error || '请检查网络或重新录制，至少说10个字'}`, 'error');
                
                if (transcriptionResult) {
                    transcriptionResult.textContent = '识别失败，请重新录制';
                    transcriptionResult.style.backgroundColor = '#f8f9fa'; // 恢复灰色背景
                    transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
                }
                // 取消注册异步操作
                this.unregisterAsyncOperation(operationId);
                return false; // 识别失败
            }
            
        } catch (error) {
            console.error('❌ 语音识别过程出错:', error);
            
            // 验证操作是否仍然有效
            if (!this.isAsyncOperationValid(operationId)) {
                console.log('⚠️ 语音识别操作已无效，忽略错误处理');
                return false;
            }
            
            uiManager.showStepStatus('step5', `❌ 语音识别失败: ${error.message}`, 'error');
            
            if (transcriptionResult) {
                transcriptionResult.textContent = '识别失败，请重新录制';
                transcriptionResult.style.backgroundColor = '#f8f9fa'; // 恢复灰色背景
                transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
            }
            // 取消注册异步操作
            this.unregisterAsyncOperation(operationId);
            return false; // 识别失败
        }
    }

    /**
     * 直接从录音器获取PCM数据（不需要MP3转换）
     */
    async convertMp3ToPcm(mp3Blob) {
        // 直接从audioRecorder获取原始PCM数据，避免MP3转换的复杂性
        const rawAudioData = audioRecorder.getRawAudioData();
        
        if (!rawAudioData || rawAudioData.length === 0) {
            throw new Error('没有可用的原始音频数据');
        }
        
        // 重采样到16kHz（阿里云API要求）
        const resampledData = this.resampleAudio(rawAudioData, 44100, 16000);
        
        // 转换为Int16Array
        const int16Data = new Int16Array(resampledData.length);
        for (let i = 0; i < resampledData.length; i++) {
            const sample = Math.max(-1, Math.min(1, resampledData[i]));
            int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        console.log('🎤 音频数据转换完成，长度:', int16Data.length, '采样率: 16kHz');
        
        return int16Data.buffer;
    }

    /**
     * 重采样音频数据
     */
    resampleAudio(audioData, originalSampleRate, targetSampleRate) {
        if (originalSampleRate === targetSampleRate) {
            return audioData;
        }
        
        const ratio = originalSampleRate / targetSampleRate;
        const newLength = Math.floor(audioData.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const sourceIndex = Math.floor(i * ratio);
            result[i] = audioData[sourceIndex];
        }
        
        return result;
    }

    /**
     * 下载文件
     */
    async downloadRecording() {
        const recordingBlob = audioRecorder.getLastRecording();
        
        if (!recordingBlob) {
            alert('没有可下载的录音文件');
            return;
        }
        
        console.log('🎵 准备下载MP3文件...');
        
        const filename = `recording_${Date.now()}.mp3`;
        uiManager.downloadFile(recordingBlob, filename);
    }

    /**
     * 导入配置
     */
    importConfiguration() {
        const configText = document.getElementById('configText');
        if (configText && configText.value.trim()) {
            const success = configManager.importConfig(configText.value.trim());
            if (success) {
                alert('配置导入成功！');
                this.clearAsyncOperations();
                document.getElementById('configModal').style.display = 'none';
                console.log('🔄 导入配置成功，准备自动跳转到第1步');
                for (let i = 1; i <= this.totalSteps; i++) {
                    uiManager.updateStepUI(i, 'pending');
                }
                this.goBackToStep(1, false);
                this.stepAutoJumpManager.autoJumpFromStep(1);
            } else {
                alert('❌ 配置导入失败，请检查JSON格式是否正确');
            }
        } else {
            alert('❌ 请输入配置内容或上传JSON文件');
        }
    }

    /**
     * 智能跳转到合适的步骤
     */
    async jumpToAppropriateStep() {
        console.log('🎯 配置导入后开始智能跳转');
        
        if (!this.stepAutoJumpManager) {
            console.warn('⚠️ 步骤跳转管理器未初始化');
            return;
        }
        
        // 从步骤1开始自动跳转
        await this.stepAutoJumpManager.autoJumpFromStep(1);
    }

    /**
     * 检查步骤配置是否完成
     */
    isStepConfigComplete(config, requiredFields) {
        if (!requiredFields || requiredFields.length === 0) {
            return true; // 没有必需字段的步骤总是完成的
        }
        
        return requiredFields.every(field => {
            const value = config[field];
            return value && value.trim() !== '';
        });
    }

    /**
     * 显示导入模态框
     */
    showImportModal() {
        const configModal = document.getElementById('configModal');
        const modalTitle = document.getElementById('modalTitle');
        const exportView = document.getElementById('exportView');
        const importView = document.getElementById('importView');
        
        if (modalTitle) modalTitle.textContent = '导入配置';
        if (exportView) exportView.style.display = 'none';
        if (importView) importView.style.display = 'block';
        if (configModal) configModal.style.display = 'block';
    }

    /**
     * 显示导出模态框
     */
    showExportModal() {
        const configModal = document.getElementById('configModal');
        const modalTitle = document.getElementById('modalTitle');
        const exportView = document.getElementById('exportView');
        const importView = document.getElementById('importView');
        
        if (modalTitle) modalTitle.textContent = '导出配置';
        if (exportView) exportView.style.display = 'block';
        if (importView) importView.style.display = 'none';
        
        // 生成配置信息列表
        this.generateConfigInfoList();
        
        if (configModal) configModal.style.display = 'block';
    }

    /**
     * 生成配置信息列表
     */
    generateConfigInfoList() {
        const configInfoList = document.getElementById('configInfoList');
        if (!configInfoList) return;
        
        const config = configManager.getAllConfig();
        const configItems = [
            { label: 'AppKey', value: config.appKey || '未设置' },
            { label: 'AccessKey ID', value: config.accessKeyId || '未设置' },
            { label: 'AccessKey Secret', value: config.accessKeySecret ? config.accessKeySecret.slice(0, 3) + '...' + config.accessKeySecret.slice(-3) : '未设置' },
            { label: '智谱AI API Key', value: config.zhipuApiKey ? config.zhipuApiKey.slice(0, 3) + '...' + config.zhipuApiKey.slice(-3) : '未设置' },
            { label: '导出时间', value: new Date().toLocaleString() }
        ];
        
        configInfoList.innerHTML = configItems.map(item => `
            <div class="config-info-item">
                <div class="config-info-label">${item.label}:</div>
                <div class="config-info-value">${item.value}</div>
            </div>
        `).join('');
    }

    /**
     * 复制配置到剪切板
     */
    async copyConfigToClipboard() {
        try {
            const configJson = this.exportCompletedConfig();
            await navigator.clipboard.writeText(configJson);
            alert('配置已复制到剪切板！');
        } catch (error) {
            console.error('复制失败:', error);
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = this.exportCompletedConfig();
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('配置已复制到剪切板！');
        }
    }

    /**
     * 下载配置JSON文件
     */
    downloadConfigJson() {
        const configJson = this.exportCompletedConfig();
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aliyun-voice-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('配置文件已下载！');
    }

    /**
     * 导出配置
     */
    exportCompletedConfig() {
        const fullConfig = configManager.getAllConfig();
        const completedConfig = {};
        
        // 检查每个步骤的完成状态
        for (let step = 1; step <= this.totalSteps; step++) {
            const requiredFields = this.configStepMapping[step];
            if (this.isStepConfigComplete(fullConfig, requiredFields)) {
                // 将该步骤的配置字段添加到导出配置中
                requiredFields.forEach(field => {
                    if (fullConfig[field]) {
                        completedConfig[field] = fullConfig[field];
                    }
                });
            }
        }
        
        console.log('导出已完成配置:', completedConfig);
        
        return JSON.stringify(completedConfig, null, 2);
    }

    /**
     * 清空配置文本
     */
    clearConfigText() {
        const configText = document.getElementById('configText');
        if (configText) {
            configText.value = '';
        }
    }

    /**
     * 处理JSON文件上传
     */
    handleJsonFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            alert('❌ 请选择JSON格式的文件！');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                // 验证JSON格式
                JSON.parse(content);
                
                const configText = document.getElementById('configText');
                if (configText) {
                    configText.value = content;
                }
                
                alert('✅ JSON文件已加载到文本框！');
            } catch (error) {
                console.error('JSON解析失败:', error);
                alert('❌ JSON文件格式无效，请检查文件内容！');
            }
        };
        
        reader.onerror = () => {
            alert('❌ 文件读取失败，请重试！');
        };
        
        reader.readAsText(file);
        
        // 清空input，允许重复选择同一文件
        event.target.value = '';
    }

    /**
     * 导出配置（旧方法，保留兼容性）
     */
    exportConfiguration() {
        const configText = document.getElementById('configText');
        if (configText) {
            configText.value = configManager.exportConfig();
            configText.select();
            document.execCommand('copy');
            alert('配置已复制到剪贴板！');
        }
    }

    /**
     * 检查是否可以自动进入第六步
     */
    checkAutoProgressToStep6() {
        const config = configManager.getAllConfig();
        const hasZhipuKey = config.zhipuApiKey && config.zhipuApiKey.trim();
        const wasStep6Completed = configManager.isStepCompleted(6);
        
        console.log('🔍 检查第六步自动进入条件:', {
            hasZhipuKey,
            wasStep6Completed
        });
        
        if (hasZhipuKey && wasStep6Completed) {
            console.log('🚀 自动进入第六步并验证');
            uiManager.setStepState(6, 'active');
            
            // 自动验证智谱AI
            setTimeout(() => {
                if (typeof validateStep6 === 'function') {
                    validateStep6();
                }
            }, 500);
        } else {
            console.log('⏸️ 不满足自动进入第六步的条件，需要用户手动操作');
        }
    }
    
    /**
     * 步骤自动跳转管理器
     */
    createStepAutoJumpManager() {
        return {
            // 步骤配置：定义每个步骤的验证条件和跳转函数
            stepConfigs: {
                1: {
                    name: '服务开通',
                    hasJumpButton: true,
                    jumpFunction: () => this.completeServiceSetup(),
                    canAutoJump: () => {
                        // 只有之前完成过第1步才自动跳转
                        const wasCompleted = configManager.isStepCompleted(1);
                        return wasCompleted;
                    }
                },
                2: {
                    name: 'AppKey配置',
                    hasJumpButton: true,
                    jumpFunction: () => this.validateStep2(),
                    canAutoJump: () => {
                        const config = configManager.getAllConfig();
                        const hasConfig = config.appKey && config.appKey.trim();
                        const wasCompleted = configManager.isStepCompleted(2);
                        return hasConfig && wasCompleted; // 需要有配置且之前完成过
                    }
                },
                3: {
                    name: '用户创建',
                    hasJumpButton: true,
                    jumpFunction: () => this.completeStep3(),
                    canAutoJump: () => {
                        // 只有之前完成过第3步才自动跳转
                        const wasCompleted = configManager.isStepCompleted(3);
                        return wasCompleted;
                    }
                },
                4: {
                    name: 'AccessKey配置',
                    hasJumpButton: true,
                    jumpFunction: () => this.validateStep4(),
                    canAutoJump: () => {
                        const config = configManager.getAllConfig();
                        const hasConfig = config.accessKeyId && config.accessKeyId.trim() &&
                                         config.accessKeySecret && config.accessKeySecret.trim();
                        const wasCompleted = configManager.isStepCompleted(4);
                        return hasConfig && wasCompleted; // 需要有配置且之前完成过
                    }
                },
                5: {
                    name: '录音测试',
                    hasJumpButton: false, // 录音步骤没有跳转按钮
                    jumpFunction: null,
                    canAutoJump: () => false
                },
                6: {
                    name: '智谱AI配置',
                    hasJumpButton: true,
                    jumpFunction: () => validateStep6(),
                    canAutoJump: () => {
                        const config = configManager.getAllConfig();
                        const hasConfig = config.zhipuApiKey && config.zhipuApiKey.trim();
                        const wasCompleted = configManager.isStepCompleted(6);
                        return hasConfig && wasCompleted;
                    }
                }
            },
            
            /**
             * 检查步骤是否可以自动跳转
             * @param {number} stepNumber - 步骤编号
             * @returns {boolean} 是否可以自动跳转
             */
            canStepAutoJump(stepNumber) {
                const stepConfig = this.stepConfigs[stepNumber];
                
                // 详细记录completedSteps状态
                const completedSteps = [...configManager.completedSteps];
                console.log(`📋 canStepAutoJump(${stepNumber}) - 当前completedSteps:`, completedSteps);
                console.log(`🔍 检查步骤${stepNumber}是否可以自动跳转:`, {
                    hasConfig: !!stepConfig,
                    hasJumpButton: stepConfig?.hasJumpButton,
                    stepName: stepConfig?.name
                });
                
                if (!stepConfig || !stepConfig.hasJumpButton) {
                    console.log(`❌ 步骤${stepNumber}不能自动跳转: 无配置或无跳转按钮`);
                    return false;
                }
                
                const canJump = stepConfig.canAutoJump();
                console.log(`🎯 步骤${stepNumber}(${stepConfig.name})自动跳转结果:`, canJump);
                return canJump;
            },
            
            /**
             * 执行步骤跳转
             * @param {number} stepNumber - 步骤编号
             * @returns {Promise<boolean>} 跳转是否成功
             */
            async executeStepJump(stepNumber) {
                const stepConfig = this.stepConfigs[stepNumber];
                if (!stepConfig || !stepConfig.jumpFunction) {
                    console.log(`❌ 步骤${stepNumber}没有跳转函数`);
                    return false;
                }
                
                try {
                    console.log(`🚀 执行步骤${stepNumber}(${stepConfig.name})的跳转`);
                    await stepConfig.jumpFunction();
                    return true;
                } catch (error) {
                    console.error(`❌ 步骤${stepNumber}跳转失败:`, error);
                    return false;
                }
            },
            
            /**
             * 从指定步骤开始自动跳转
             * @param {number} startStep - 起始步骤
             */
            async autoJumpFromStep(startStep) {
                console.log(`🎯 开始从步骤${startStep}自动跳转`);
                
                for (let step = startStep; step <= 6; step++) {
                    if (!this.canStepAutoJump(step)) {
                        console.log(`⏹️ 步骤${step}不能自动跳转，停止连跳`);
                        break;
                    }
                    console.log(`⏭️ 尝试自动跳转步骤${step}`);
                    const success = await this.executeStepJump(step);
                    
                    if (!success) {
                        console.log(`❌ 步骤${step}跳转失败，停止连跳`);
                        break;
                    }
                    
                    // 给UI一些时间更新
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        };
    }
}

// 全局变量存储当前API Key
let currentZhipuApiKey = '';

// 智谱API验证函数
async function validateStep6() {
    const apiKeyInput = document.getElementById('zhipuApiKey');
    const chatbotContainer = document.getElementById('chatbotContainer');
    
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
        uiManager.showStepStatus('step6', '❌ 请输入智谱AI API Key', 'error');
        return false;
    }
    
    currentZhipuApiKey = apiKeyInput.value.trim();
    
    // 显示chatbot界面
    chatbotContainer.style.display = 'block';
    
    // 获取第五步的录音结果
    const transcriptionResult = document.getElementById('transcriptionResult');
    const recordingText = transcriptionResult ? transcriptionResult.textContent.trim() : '';
    
    if (!recordingText || recordingText === '录音中...' || recordingText === '正在识别语音...' || recordingText.includes('识别失败')) {
        showChatMessage('system', '⚠️ 请先完成第五步的录音和语音识别，再进行智谱API验证');
        return false;
    }
    
    // 自动发送总结请求并验证
    await autoValidateZhipu(recordingText);
}

// 自动验证智谱AI
async function autoValidateZhipu(recordingText) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const chatInput = document.getElementById('chatInput');
    
    messagesContainer.innerHTML = '';
    
    try {
        // 注册异步操作
        const operationId = `zhipu-validate-${Date.now()}`;
        if (window.voiceApp) {
            window.voiceApp.registerAsyncOperation(operationId, 6);
        }
        
        // 自动发送总结请求
        const summaryRequest = `请总结如下录音结果：「${recordingText}」当中的信息，50字以内`;
        showChatMessage('user', summaryRequest);
        
        // 显示AI加载状态
        showChatMessage('ai', '...');
        
        // 调用智谱API
        console.log('🔄 调用智谱API...');
        const aiResponse = await callZhipuAPI([
            {
                role: 'user',
                content: summaryRequest
            }
        ]);
        
        // 验证操作是否仍然有效
        if (window.voiceApp && !window.voiceApp.isAsyncOperationValid(operationId)) {
            console.log('⚠️ 智谱AI验证操作已无效，忽略结果');
            return;
        }
        
        console.log('✅ 智谱AI回复:', aiResponse);
        
        // 更新AI回复（替换加载状态）
        const messagesContainer = document.getElementById('chatbotMessages');
        const aiMessages = messagesContainer.querySelectorAll('.chat-message.ai');
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        if (lastAiMessage && aiResponse) {
            lastAiMessage.textContent = aiResponse;
        }
        
        // 成功回复后标记验证成功，但保持对话开放
        setTimeout(() => {
            // 保持对话开放，启用输入框和发送按钮
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendChatBtn');
            
            console.log('🔓 启用聊天界面，元素状态:', {
                chatInput: !!chatInput,
                sendBtn: !!sendBtn,
                chatInputDisabled: chatInput ? chatInput.disabled : 'null',
                sendBtnDisabled: sendBtn ? sendBtn.disabled : 'null'
            });
            
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.removeAttribute('disabled');
                chatInput.classList.add('allow-interact-when-complete');
                console.log('✅ 聊天输入框已启用');
            } else {
                console.error('❌ 找不到chatInput元素');
            }
            
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.removeAttribute('disabled');
                sendBtn.classList.add('allow-interact-when-complete');
                console.log('✅ 发送按钮已启用');
            } else {
                console.error('❌ 找不到sendBtn元素');
            }
            
            // 检查是否为最后一个步骤，如果是则保持API key输入框可交互
            const apiKeyInput = document.getElementById('zhipuApiKey');
            const isLastStep = true; // 第六步是最后一步
            
            if (isLastStep && apiKeyInput) {
                // 保持API Key输入框可编辑
                apiKeyInput.disabled = false;
                console.log('🔓 第六步是最后步骤，保持API Key输入框可交互');
            }
            
            // 标记步骤完成
            uiManager.setStepState(6, 'completed');
            configManager.markStepCompleted(6);
            uiManager.showStepStatus('step6', '✅ 智谱AI验证成功！您可以继续对话测试。', 'success');
            
            console.log('✅ 第六步完成 - 智谱AI配置，对话保持开放');
            
            // 取消注册异步操作
            if (window.voiceApp) {
                window.voiceApp.unregisterAsyncOperation(operationId);
            }
        }, 500);
        
        // 注释掉结束对话的代码，以备后用
        /*
        setTimeout(() => {
            // 结束对话的逻辑
            if (chatInput) {
                chatInput.placeholder = '对话已结束';
                chatInput.disabled = true;
            }
        }, 500);
        */
        
    } catch (error) {
        console.error('智谱AI验证失败:', error);
        
        // 验证操作是否仍然有效
        if (window.voiceApp && !window.voiceApp.isAsyncOperationValid(operationId)) {
            console.log('⚠️ 智谱AI验证操作已无效，忽略错误处理');
            return;
        }
        
        // 直接在AI回复中显示错误信息，不在底部显示
        showChatMessage('ai', '智谱AI连接失败，请检查API Key是否正确或网络连接');
        // 不显示底部错误状态
        
        // 取消注册异步操作
        if (window.voiceApp) {
            window.voiceApp.unregisterAsyncOperation(operationId);
        }
    }
}

// 发送聊天消息
async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    
    if (!chatInput || !chatInput.value.trim()) return;
    
    const userMessage = chatInput.value.trim();
    chatInput.value = '';
    
    // 禁用输入和发送按钮
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // 显示用户消息
    showChatMessage('user', userMessage);
    
    // 显示AI加载状态
    showChatMessage('ai', '...');
    
    try {
        // 注册异步操作
        const operationId = `zhipu-chat-${Date.now()}`;
        if (window.voiceApp) {
            window.voiceApp.registerAsyncOperation(operationId, 6);
        }
        
        // 调用智谱API
        const messages = [
            { role: 'user', content: userMessage }
        ];
        
        const response = await callZhipuAPI(messages);
        
        // 验证操作是否仍然有效
        if (window.voiceApp && !window.voiceApp.isAsyncOperationValid(operationId)) {
            console.log('⚠️ 智谱AI聊天操作已无效，忽略结果');
            return;
        }
        
        // 更新最后一条AI消息
        const aiMessages = document.querySelectorAll('.chat-message.ai');
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage && response) {
            lastAiMessage.textContent = response;
        }
        
        // 取消注册异步操作
        if (window.voiceApp) {
            window.voiceApp.unregisterAsyncOperation(operationId);
        }
        
    } catch (error) {
        console.error('发送消息失败:', error);
        
        // 验证操作是否仍然有效
        if (window.voiceApp && !window.voiceApp.isAsyncOperationValid(operationId)) {
            console.log('⚠️ 智谱AI聊天操作已无效，忽略错误处理');
            return;
        }
        
        // 更新最后一条AI消息为错误信息
        const aiMessages = document.querySelectorAll('.chat-message.ai');
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage) {
            lastAiMessage.textContent = '抱歉，AI服务暂时不可用，请检查API Key或稍后重试';
        }
        
        // 取消注册异步操作
        if (window.voiceApp) {
            window.voiceApp.unregisterAsyncOperation(operationId);
        }
    } finally {
        // 只有在操作仍然有效时才重新启用按钮
        if (window.voiceApp && window.voiceApp.isStillInStep(6)) {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    }
}

// 初始化聊天 - 已移除，现在使用自动验证流程

// 调用智谱API
async function callZhipuAPI(messages, modelId = 'glm-4.5-flash') {
    const requestBody = {
        model: modelId,
        messages: messages,
        temperature: 0.6,
        stream: false
    };
    
    console.log('📤 智谱API请求:', {
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentZhipuApiKey.substring(0, 8)}...`,
            'Content-Type': 'application/json'
        },
        body: requestBody
    });
    
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentZhipuApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    console.log('📥 智谱API响应状态:', response.status, response.statusText);
    console.log('📥 智谱API响应头:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 智谱API错误响应:', errorText);
        
        if (response.status === 401) {
            throw new Error('API Key无效，请检查是否正确');
        } else {
            throw new Error(`API调用失败: ${response.status} - ${errorText}`);
        }
    }
    
    const data = await response.json();
    console.log('📥 智谱API完整响应:', data);
    
    // 尝试从不同字段获取内容
    const message = data.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';
    console.log('📝 提取的内容:', content);
    console.log('🔍 消息对象:', message);
    
    return content;
}

// 显示聊天消息
function showChatMessage(type, content) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    messageDiv.textContent = content;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送用户消息 - 已移除，现在使用自动验证流程

// 完成第六步配置 - 已移除，现在自动在验证成功后完成

// 全局跳转到指定步骤的函数
function goToStep(stepNumber) {
    uiManager.setStepState(stepNumber, 'active');
    uiManager.scrollToStep(stepNumber);
}

// 创建全局应用实例
window.voiceApp = new VoiceRecognitionApp();
