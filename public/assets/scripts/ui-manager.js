/**
 * UI管理模块
 * 处理步骤管理、状态更新、用户界面交互等
 */

class UIManager {
    constructor() {
        // 自动检测HTML中的步骤数量
        this.stepStates = this.detectStepsFromHTML();
        this.currentStep = 1;
        this.totalSteps = Object.keys(this.stepStates).length;
        
        // 初始化
        this.init();
    }

    /**
     * 自动检测HTML中的步骤数量
     */
    detectStepsFromHTML() {
        const stepElements = document.querySelectorAll('.setup-step[id^="step"]');
        const stepStates = {};
        
        stepElements.forEach(element => {
            const stepId = element.id; // 例如：step1, step2, step3...
            stepStates[stepId] = 'pending';
        });
        
        console.log(`✅ 自动检测到 ${Object.keys(stepStates).length} 个步骤:`, Object.keys(stepStates));
        return stepStates;
    }

    /**
     * 初始化UI管理器
     */
    init() {
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => {
            this.updateStepVisibility();
            this.updateStepDependencies();
            this.setStepState(1, 'active');
            this.updateStepInteractivity();
        }, 100);
    }

    /**
     * 设置步骤状态
     * @param {number} stepNumber - 步骤编号
     * @param {string} state - 状态 ('pending', 'active', 'completed', 'error')
     * @param {boolean} skipNextStepActivation - 是否跳过下一步激活
     */
    setStepState(stepNumber, state, skipNextStepActivation = false) {
        const stepId = `step${stepNumber}`;
        
        if (state === 'completed' && !skipNextStepActivation && stepNumber < this.totalSteps) {
            this.stepStates[stepId] = state;
            this.updateStepUI(stepNumber, state);
            
            // 自动激活下一步
            const nextStep = stepNumber + 1;
            this.setStepState(nextStep, 'active', true);
            return;
        }
        
        this.stepStates[stepId] = state;
        
        if (state === 'active') {
            this.currentStep = stepNumber;
            // 通知主应用当前步骤变更
            if (window.voiceApp) {
                window.voiceApp.setCurrentStep(stepNumber);
            }
            
            // 设置当前步骤及以下的步骤为pending状态
            this.resetStepsFromCurrent(stepNumber);
            
            // 重置步骤状态
            this.resetStep(stepNumber);
            this.scrollToStep(stepNumber);
            this.updateStepInteractivity();
        }
        
        this.updateStepUI(stepNumber, state);
        this.updateStepDependencies();
        this.updateStepVisibility();
    }

    /**
     * 从当前步骤开始重置所有后续步骤为pending状态
     * @param {number} currentStep - 当前激活的步骤
     */
    resetStepsFromCurrent(currentStep) {
        console.log(`🔄 resetStepsFromCurrent: 从步骤${currentStep}开始重置后续步骤`);
        
        // 重置当前步骤及以下的所有步骤为pending状态
        for (let i = currentStep; i <= this.totalSteps; i++) {
            if (i !== currentStep) {
                this.stepStates[`step${i}`] = 'pending';
                this.updateStepUI(i, 'pending');
                
                // 清除状态消息
                this.showStepStatus(`step${i}`, '', 'info');
            }
        }
    }

    /**
     * 更新步骤UI
     * @param {number} stepNumber - 步骤编号
     * @param {string} state - 状态
     */
    updateStepUI(stepNumber, state) {
        console.log(`🔧 updateStepUI: 步骤${stepNumber} -> ${state}`);
        
        const stepElement = document.getElementById(`step${stepNumber}`);
        const circle = document.getElementById(`step${stepNumber}-circle`);
        const content = document.getElementById(`step${stepNumber}-content`);
        const line = document.getElementById(`step${stepNumber}-line`);
        
        // 添加null检查
        if (!stepElement) {
            console.warn(`⚠️ 未找到步骤${stepNumber}的容器元素`);
            return;
        }
        if (!circle) {
            console.warn(`⚠️ 未找到步骤${stepNumber}的圆圈元素`);
            return;
        }
        if (!content) {
            console.warn(`⚠️ 未找到步骤${stepNumber}的内容元素`);
            return;
        }
        
        // 清除所有状态类
        stepElement.className = 'setup-step';
        circle.className = 'step-circle';
        content.className = 'step-content';
        if (line) {
            line.className = 'step-line';
        }
        
        // 添加新状态类
        switch (state) {
            case 'pending':
                stepElement.classList.add('pending');
                circle.classList.add('pending');
                content.classList.add('pending');
                break;
            case 'active':
                stepElement.classList.add('active');
                content.classList.add('active');
                break;
            case 'completed':
                stepElement.classList.add('completed');
                circle.classList.add('completed');
                content.classList.add('completed');
                if (line) {
                    line.classList.add('completed');
                }
                break;
            case 'error':
                stepElement.classList.add('error');
                circle.classList.add('error');
                content.classList.add('error');
                break;
        }
        
        // 记录最终状态
        console.log(`✅ 最终状态 步骤${stepNumber}:`, {
            stepElement: stepElement.className,
            circle: circle.className,
            content: content.className,
            line: line ? line.className : 'null'
        });
    }

    /**
     * 滚动到指定步骤
     * @param {number} stepNumber - 步骤编号
     */
    scrollToStep(stepNumber) {
        const stepElement = document.getElementById(`step${stepNumber}`);
        if (stepElement) {
            setTimeout(() => {
                // 使用scrollIntoView，确保元素滚动到视口顶部
                stepElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start', // 滚动到元素顶部
                    inline: 'nearest'
                });
            }, 150);
        }
    }

    /**
     * 更新步骤交互性
     */
    updateStepInteractivity() {
        // 交互性现在通过updateStepUI中的状态类来管理
        // 这个方法保留用于兼容性，但实际逻辑已经整合到updateStepUI中
        console.log(`🔄 updateStepInteractivity: 当前步骤 ${this.currentStep}`);
    }

    /**
     * 更新步骤可见性
     */
    updateStepVisibility() {
        for (let i = 1; i <= this.TOTAL_STEPS; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.style.display = 'block';
            }
        }
    }

    /**
     * 更新步骤依赖关系
     */
    updateStepDependencies() {
        // 所有步骤都应该可见，只是通过交互性控制来管理访问
        // 不再隐藏步骤，而是通过CSS类来控制交互性
    }

    /**
     * 切换步骤可用性
     * @param {number} stepNumber - 步骤编号
     * @param {boolean} available - 是否可用
     */
    toggleStepAvailability(stepNumber, available) {
        const stepElement = document.getElementById(`step${stepNumber}`);
        if (stepElement) {
            stepElement.style.display = available ? 'block' : 'none';
        }
    }

    /**
     * 显示步骤状态消息
     * @param {string} stepId - 步骤ID
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('info', 'success', 'error', 'warning')
     */
    showStepStatus(stepId, message, type = 'info') {
        const statusElement = document.getElementById(`${stepId}-status`);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            statusElement.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * 回到指定步骤
     * @param {number} targetStep - 目标步骤
     */
    goBackToStep(targetStep, resetPending = true) {
        console.log(`🔙 goBackToStep: 回到步骤${targetStep}`);
        console.log(`🔍 goBackToStep调用前 - completedSteps:`, [...configManager.completedSteps]);
        
        // 只重置目标步骤的完成状态
        if (window.configManager && resetPending) {
            console.log(`🔍 即将调用 resetSingleStep(${targetStep})`);
            configManager.resetSingleStep(targetStep);
            console.log(`🔍 resetSingleStep调用后 - completedSteps:`, [...configManager.completedSteps]);
        }
        
        // 激活目标步骤（这会自动重置当前步骤及以下的步骤为pending状态）
        this.setStepState(targetStep, 'active', true);
        
        // 延迟滚动，确保状态更新完成
        setTimeout(() => {
            this.scrollToStep(targetStep);
        }, 150);
    }

    /**
     * 获取当前步骤
     * @returns {number} 当前步骤编号
     */
    getCurrentStep() {
        return this.currentStep;
    }

    /**
     * 获取步骤状态
     * @param {number} stepNumber - 步骤编号
     * @returns {string} 步骤状态
     */
    getStepState(stepNumber) {
        return this.stepStates[`step${stepNumber}`];
    }

    /**
     * 下载文件
     * @param {Blob} blob - 文件Blob
     * @param {string} filename - 文件名
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`✅ 文件下载完成: ${filename}`);
    }

    /**
     * 创建音频播放测试按钮
     * @param {Blob} audioBlob - 音频Blob
     * @param {string} containerId - 容器ID
     * @param {string} audioId - 音频元素ID
     */
    createAudioTestButton(audioBlob, containerId, audioId = 'testAudio') {
        const container = document.getElementById(containerId);
        if (container) {
            // 不显示"录音完成"提示，为后续实时转译做准备
            container.innerHTML = '';
        }
    }

    /**
     * 重置步骤状态 - 进入或回到步骤时清除状态
     * @param {number} stepNumber - 步骤编号
     */
    resetStep(stepNumber) {
        console.log(`🔄 resetStep: 重置步骤${stepNumber}`);
        switch(stepNumber) {
            case 1:
                this.resetStep1();
                break;
            case 2:
                this.resetStep2();
                break;
            case 3:
                this.resetStep3();
                break;
            case 4:
                this.resetStep4();
                break;
            case 5:
                this.resetStep5();
                break;
            case 6:
                this.resetStep6();
                break;
        }
    }

    /**
     * 重置第1步 - 服务开通
     */
    resetStep1() {
        // 清除状态消息
        this.showStepStatus('step1', '', 'info');
    }

    /**
     * 重置第2步 - 应用创建
     */
    resetStep2() {
        // 清除状态消息和输入框
        this.showStepStatus('step2', '', 'info');
        const appKeyInput = document.getElementById('appKey');
        if (appKeyInput) {
            // 不清空输入，保持用户配置
        }
    }

    /**
     * 重置第3步 - 用户创建
     */
    resetStep3() {
        // 清除状态消息
        this.showStepStatus('step3', '', 'info');
    }

    /**
     * 重置第4步 - AccessKey配置
     */
    resetStep4() {
        // 清除状态消息
        this.showStepStatus('step4', '', 'info');
        // 不清空输入框，保持用户配置
    }

    /**
     * 重置第5步 - 录音测试
     */
    resetStep5() {
        // 检查第5步是否已完成
        const isStep5Completed = this.stepStates['step5'] === 'completed';
        
        // 清除状态消息
        this.showStepStatus('step5', '', 'info');
        
        // 重置录音UI
        const recordingBtn = document.getElementById('recordingBtn');
        const transcriptionResult = document.getElementById('transcriptionResult');
        const downloadBtn = document.getElementById('downloadBtn');
        const nextToStep6Btn = document.getElementById('nextToStep6Btn');
        
        if (recordingBtn) {
            if (isStep5Completed) {
                // 如果已完成，保持完成状态
                recordingBtn.textContent = '已完成';
                recordingBtn.style.background = '#28a745'; // 绿色背景
                recordingBtn.style.color = 'white';
                recordingBtn.disabled = true;
            } else {
                // 如果未完成，重置为开始状态
                recordingBtn.textContent = '开始';
                recordingBtn.style.background = '';
                recordingBtn.style.color = '';
                recordingBtn.disabled = false;
            }
        }
        
        if (transcriptionResult && !isStep5Completed) {
            transcriptionResult.textContent = '点击开始';
            transcriptionResult.style.backgroundColor = '#f8f9fa'; // 灰色背景
            transcriptionResult.style.color = '#6c757d'; // 浅灰色文字
        }
        
        if (downloadBtn && !isStep5Completed) {
            downloadBtn.style.display = 'none';
        }
        
        if (nextToStep6Btn && !isStep5Completed) {
            nextToStep6Btn.style.display = 'none';
        }
        
        // 重置进度条和波形
        const progressFill = document.getElementById('progressFillThin');
        const waveformProgressMask = document.getElementById('waveformProgressMask');
        const waveformBars = document.getElementById('waveformBars');
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (waveformProgressMask) {
            waveformProgressMask.setAttribute('width', '0');
        }
        
        if (waveformBars) {
            waveformBars.innerHTML = '';
        }
        
        // 停止器（如果正在录音）
        if (window.audioRecorder && window.audioRecorder.getIsRecording()) {
            window.audioRecorder.stopRecording();
        }
    }

    /**
     * 重置第6步 - 智谱API配置
     */
    resetStep6() {
        console.log('🔄 resetStep6: 开始重置第6步');
        
        // 清除状态消息
        this.showStepStatus('step6', '', 'info');
        
        // 重置聊天界面
        const chatbotContainer = document.getElementById('chatbotContainer');
        const chatbotMessages = document.getElementById('chatbotMessages');
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendChatBtn');
        
        if (chatbotContainer) {
            chatbotContainer.style.display = 'none';
        }
        
        if (chatbotMessages) {
            chatbotMessages.innerHTML = '';
        }
        
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.value = '';
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        
        // 不清空API Key输入框，保持用户配置
    }
}

// 创建全局实例
window.uiManager = new UIManager();
