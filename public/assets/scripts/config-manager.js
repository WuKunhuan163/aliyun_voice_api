/**
 * 配置管理模块
 * 处理应用配置的保存、加载和管理
 */

class ConfigManager {
    constructor() {
        this.config = {
            appKey: '',
            accessKeyId: '',
            accessKeySecret: '',
            zhipuApiKey: '',
            apiBaseUrl: 'https://aliyun-voice-to-text-api.vercel.app/api'
        };
        this.completedSteps = new Set(); // 记录已成功完成的步骤

        this.loadFromSession();
        this.loadConfigFile(); // 加载配置文件
    }

    /**
     * 从sessionStorage加载配置
     */
    loadFromSession() {
        try {
            const savedConfig = sessionStorage.getItem('aliyun_voice_config');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
            
            // 加载已完成的步骤
            const savedSteps = sessionStorage.getItem('aliyun_voice_completed_steps');
            if (savedSteps) {
                this.completedSteps = new Set(JSON.parse(savedSteps));
                console.log('📋 从session加载已完成步骤:', [...this.completedSteps]);
            }
        } catch (error) {
            console.warn('⚠️ 从sessionStorage加载配置失败:', error);
        }
        this.updateUI();
    }
    
    /**
     * 从配置文件加载API基础URL
     */
    async loadConfigFile() {
        try {
            const response = await fetch('assets/config/config.json');
            if (response.ok) {
                const fileConfig = await response.json();
                if (fileConfig.apiBaseUrl) {
                    this.config.apiBaseUrl = fileConfig.apiBaseUrl;
                }
                console.log('✅ 配置文件加载成功，API基础URL:', this.config.apiBaseUrl);
            }
        } catch (error) {
            console.warn('⚠️ 配置文件加载失败，使用默认API地址:', error);
        }
    }

    /**
     * 保存配置到sessionStorage
     */
    saveToSession() {
        try {
            sessionStorage.setItem('aliyun_voice_config', JSON.stringify(this.config));
            console.log('✅ 配置已保存到sessionStorage');
        } catch (error) {
            console.error('❌ 保存配置到sessionStorage失败:', error);
        }
    }

    /**
     * 更新UI中的配置值
     */
    updateUI() {
        const appKeyEl = document.getElementById('appKey');
        const accessKeyIdEl = document.getElementById('accessKeyId');
        const accessKeySecretEl = document.getElementById('accessKeySecret');

        if (appKeyEl && this.config.appKey) {
            appKeyEl.value = this.config.appKey;
        }
        if (accessKeyIdEl && this.config.accessKeyId) {
            accessKeyIdEl.value = this.config.accessKeyId;
        }
        if (accessKeySecretEl && this.config.accessKeySecret) {
            accessKeySecretEl.value = this.config.accessKeySecret;
            this.updateSecretDisplay();
        }

        // 智谱API配置
        const zhipuApiKeyEl = document.getElementById('zhipuApiKey');

        if (zhipuApiKeyEl && this.config.zhipuApiKey) {
            zhipuApiKeyEl.value = this.config.zhipuApiKey;
            // 更新显示预览
            this.updateZhipuKeyDisplay();
        }
    }

    /**
     * 更新AccessKey Secret的预览显示
     */
    updateSecretDisplay() {
        const secretInput = document.getElementById('accessKeySecret');
        const secretDisplay = document.getElementById('secretDisplay');
        
        if (secretInput && secretDisplay) {
            const value = secretInput.value.trim();
            if (value && value.length > 6) {
                const preview = value.substring(0, 3) + '...' + value.substring(value.length - 3);
                secretDisplay.textContent = preview;
                secretDisplay.classList.add('show');
            } else {
                secretDisplay.classList.remove('show');
            }
        }
    }

    /**
     * 更新智谱API Key的预览显示
     */
    updateZhipuKeyDisplay() {
        const zhipuKeyInput = document.getElementById('zhipuApiKey');
        const zhipuKeyDisplay = document.getElementById('zhipuKeyDisplay');
        
        if (zhipuKeyInput && zhipuKeyDisplay) {
            const value = zhipuKeyInput.value.trim();
            // 保存到配置
            this.setConfig('zhipuApiKey', value);
            
            if (value && value.length > 6) {
                const preview = value.substring(0, 3) + '...' + value.substring(value.length - 3);
                zhipuKeyDisplay.textContent = preview;
                zhipuKeyDisplay.classList.add('show');
            } else {
                zhipuKeyDisplay.classList.remove('show');
            }
        }
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键
     * @param {string} value - 配置值
     */
    setConfig(key, value) {
        if (key in this.config) {
            this.config[key] = value;
            this.saveToSession();
        }
    }

    /**
     * 标记步骤为已完成
     * @param {number} stepNumber - 步骤编号
     */
    markStepCompleted(stepNumber) {
        console.log(`📝 markStepCompleted(${stepNumber}) - 添加前:`, [...this.completedSteps]);
        this.completedSteps.add(stepNumber);
        console.log(`📝 markStepCompleted(${stepNumber}) - 添加后:`, [...this.completedSteps]);
        this.saveCompletedSteps();
        console.log(`✅ 步骤${stepNumber}已标记为完成`);
    }

    /**
     * 取消步骤完成标记
     * @param {number} stepNumber - 步骤编号
     */
    unmarkStepCompleted(stepNumber) {
        this.completedSteps.delete(stepNumber);
        this.saveCompletedSteps();
        console.log(`❌ 步骤${stepNumber}完成标记已取消`);
    }

    /**
     * 检查步骤是否已完成
     * @param {number} stepNumber - 步骤编号
     * @returns {boolean} 是否已完成
     */
    isStepCompleted(stepNumber) {
        const isCompleted = this.completedSteps.has(stepNumber);
        console.log(`🔍 检查步骤${stepNumber}是否完成: ${isCompleted}, 当前完成列表:`, [...this.completedSteps]);
        return isCompleted;
    }

    /**
     * 保存已完成步骤到session
     */
    saveCompletedSteps() {
        try {
            const stepsArray = [...this.completedSteps];
            console.log(`💾 saveCompletedSteps - 正在保存:`, stepsArray);
            sessionStorage.setItem('aliyun_voice_completed_steps', JSON.stringify(stepsArray));
            
            // 立即验证保存是否成功
            const saved = sessionStorage.getItem('aliyun_voice_completed_steps');
            console.log(`💾 saveCompletedSteps - 保存验证:`, JSON.parse(saved || '[]'));
        } catch (error) {
            console.warn('⚠️ 保存已完成步骤失败:', error);
        }
    }

    /**
     * 重置单个步骤的完成状态
     * @param {number} stepNumber - 要重置的步骤编号
     */
    resetSingleStep(stepNumber) {
        console.log(`🔍 resetSingleStep(${stepNumber}) 调用前 - completedSteps:`, [...this.completedSteps]);
        
        if (this.completedSteps.has(stepNumber)) {
            this.completedSteps.delete(stepNumber);
            console.log(`🔄 重置步骤${stepNumber}的完成状态`);
            console.log(`🔍 resetSingleStep(${stepNumber}) 调用后 - completedSteps:`, [...this.completedSteps]);
            this.saveCompletedSteps();
        } else {
            console.log(`🔍 步骤${stepNumber}未完成，无需重置`);
        }
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键
     * @returns {string} 配置值
     */
    getConfig(key) {
        return this.config[key] || '';
    }

    /**
     * 获取所有配置
     * @returns {Object} 配置对象
     */
    getAllConfig() {
        return { ...this.config };
    }

    /**
     * 验证配置完整性
     * @returns {Object} 验证结果
     */
    validateConfig() {
        const errors = [];
        
        if (!this.config.appKey.trim()) {
            errors.push('AppKey不能为空');
        }
        if (!this.config.accessKeyId.trim()) {
            errors.push('AccessKey ID不能为空');
        }
        if (!this.config.accessKeySecret.trim()) {
            errors.push('AccessKey Secret不能为空');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 导出配置
     * @returns {string} JSON格式的配置
     */
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * 导入配置
     * @param {string} configJson - JSON格式的配置
     * @returns {boolean} 导入是否成功
     */
    importConfig(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            
            // 验证导入的配置结构
            if (typeof importedConfig === 'object' && importedConfig !== null) {
                if ('appKey' in importedConfig) this.config.appKey = importedConfig.appKey || '';
                if ('accessKeyId' in importedConfig) this.config.accessKeyId = importedConfig.accessKeyId || '';
                if ('accessKeySecret' in importedConfig) this.config.accessKeySecret = importedConfig.accessKeySecret || '';
                if ('zhipuApiKey' in importedConfig) this.config.zhipuApiKey = importedConfig.zhipuApiKey || '';
                
                this.saveToSession();
                this.updateUI();
                console.log('✅ 配置导入成功');
                return true;
            } else {
                throw new Error('配置格式无效');
            }
        } catch (error) {
            console.error('❌ 配置导入失败:', error);
            return false;
        }
    }

    /**
     * 清空配置
     */
    clearConfig() {
        this.config = {
            appKey: '',
            accessKeyId: '',
            accessKeySecret: '',
            zhipuApiKey: ''
        };
        this.completedSteps.clear(); // 清除已完成步骤
        sessionStorage.removeItem('aliyun_voice_config');
        sessionStorage.removeItem('aliyun_voice_completed_steps');
        this.updateUI();
        console.log('✅ 配置已清空');
    }

    /**
     * 保存配置到服务器
     * @returns {Promise<boolean>} 保存是否成功
     */
    async saveToServer() {
        try {
                const response = await fetch(`${this.config.apiBaseUrl}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.config)
            });
            
            if (response.ok) {
                console.log('✅ 配置已保存到服务器');
                return true;
            } else {
                console.error('❌ 保存配置到服务器失败:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ 保存配置到服务器失败:', error);
            return false;
        }
    }

    /**
     * 从服务器加载配置
     * @returns {Promise<boolean>} 加载是否成功
     */
    async loadFromServer() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/config`);
            
            if (response.ok) {
                const serverConfig = await response.json();
                this.config = { ...this.config, ...serverConfig };
                this.updateUI();
                console.log('✅ 从服务器加载配置成功');
                return true;
            } else {
                console.warn('⚠️ 从服务器加载配置失败:', response.status);
                return false;
            }
        } catch (error) {
            console.warn('⚠️ 从服务器加载配置失败:', error);
            return false;
        }
    }

    /**
     * 保存智谱API配置
     */
    saveZhipuConfig(apiKey, model = 'glm-4', prompt = '') {
        this.config.zhipuApiKey = apiKey;
        this.config.zhipuModel = model;
        this.config.analysisPrompt = prompt;
        this.saveToSession();
        console.log('✅ 智谱API配置已保存');
    }
}

// 创建全局实例
window.configManager = new ConfigManager();
