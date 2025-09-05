/**
 * 阿里云API相关功能模块
 * 处理阿里云智能语音交互服务的API调用和验证
 */

class AliyunAPI {
    constructor() {
        this.currentToken = null;
        this.tokenExpireTime = null;
    }

    /**
     * 验证阿里云凭据并获取Token（使用后端API）
     * @param {string} appKey - 应用密钥
     * @param {string} accessKeyId - 访问密钥ID
     * @param {string} accessKeySecret - 访问密钥Secret
     * @returns {Promise<Object>} 验证结果
     */
    async validateCredentials(appKey, accessKeyId, accessKeySecret) {
        console.log('🔄 开始验证阿里云凭据...');
        
        try {
            const response = await fetch('/api/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appKey: appKey,
                    accessKeyId: accessKeyId,
                    accessKeySecret: accessKeySecret
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentToken = result.token;
                this.tokenExpireTime = result.expireTime;
                
                console.log('✅ Token获取成功');
                
                return {
                    success: true,
                    token: result.token,
                    expireTime: result.expireTime
                };
            } else {
                console.error('❌ 验证失败:', result.error);
                
                return {
                    success: false,
                    error: result.error,
                    errorType: result.errorType
                };
            }
            
        } catch (error) {
            console.error('❌ API调用失败:', error.message);
            
            let errorMessage = '网络问题：连接失败，请检查网络或稍后重试';
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '网络问题：无法连接到后端服务，请检查网络';
            }
            
            return {
                success: false,
                error: errorMessage,
                errorType: 'network'
            };
        }
    }

    /**
     * 获取用户友好的错误消息
     * @param {string} errorCode - 错误代码
     * @returns {string} 用户友好的错误消息
     */
    getErrorMessage(errorCode) {
        const errorMessages = {
            'InvalidAccessKeyId.NotFound': '访问密钥ID不存在，请检查AccessKey ID是否正确',
            'SignatureDoesNotMatch': '签名不匹配，请检查AccessKey Secret是否正确',
            'APPKEY_NOT_EXIST': '应用密钥不存在，请检查AppKey是否正确',
            'Forbidden': '权限不足，请确保AccessKey具有智能语音交互服务的权限',
            '40020503': 'AppKey无权限，请在控制台为该AppKey开通相应的服务权限',
            'InvalidParameter': '参数无效，请检查输入的参数是否正确',
            'InternalError': '服务内部错误，请稍后重试',
            'ServiceUnavailable': '服务暂不可用，请稍后重试'
        };

        return errorMessages[errorCode] || `未知错误: ${errorCode}`;
    }

    /**
     * 检查Token是否有效
     * @returns {boolean} Token是否有效
     */
    isTokenValid() {
        if (!this.currentToken || !this.tokenExpireTime) {
            return false;
        }
        
        const now = Math.floor(Date.now() / 1000);
        return now < this.tokenExpireTime;
    }

    /**
     * 获取当前Token
     * @returns {string|null} 当前Token
     */
    getCurrentToken() {
        return this.isTokenValid() ? this.currentToken : null;
    }

    /**
     * 清除Token
     */
    clearToken() {
        this.currentToken = null;
        this.tokenExpireTime = null;
    }

    /**
     * 实时语音识别
     * @param {ArrayBuffer} audioData - 音频数据
     * @param {Object} options - 识别选项
     * @returns {Promise<Object>} 识别结果
     */
    async recognizeSpeech(audioData, options = {}) {
        const token = this.getCurrentToken();
        if (!token) {
            throw new Error('Token无效，请先验证阿里云凭据');
        }

        const defaultOptions = {
            format: 'pcm',
            sampleRate: 16000,
            enablePunctuationPrediction: true,
            enableInverseTextNormalization: true
        };

        const recognitionOptions = { ...defaultOptions, ...options };

        try {
            // 使用与测试文件相同的端点，添加时间戳防止缓存
            const response = await fetch(`/api/recognize-audio?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    token: token,
                    audioData: Array.from(new Uint8Array(audioData)),
                    format: recognitionOptions.format,
                    sampleRate: recognitionOptions.sampleRate,
                    appKey: configManager.getConfig('appKey'),
                    accessKeyId: configManager.getConfig('accessKeyId'),
                    accessKeySecret: configManager.getConfig('accessKeySecret')
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    result: result.result, // 使用result字段
                    confidence: result.confidence || 0.9
                };
            } else {
                return {
                    success: false,
                    error: result.error || '识别失败'
                };
            }

        } catch (error) {
            console.error('❌ 语音识别失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 创建WebSocket连接进行实时语音识别
     * @param {Object} options - 识别选项
     * @returns {Promise<WebSocket>} WebSocket连接
     */
    async createRealtimeRecognition(options = {}) {
        const token = this.getCurrentToken();
        if (!token) {
            throw new Error('Token无效，请先验证阿里云凭据');
        }

        const defaultOptions = {
            format: 'pcm',
            sampleRate: 16000,
            enablePunctuationPrediction: true,
            enableInverseTextNormalization: true
        };

        const recognitionOptions = { ...defaultOptions, ...options };

        try {
            // 通过后端代理建立WebSocket连接
            const response = await fetch('/api/realtime-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    options: recognitionOptions
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // 创建WebSocket连接
                const ws = new WebSocket(result.wsUrl);
                return ws;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ 创建实时识别连接失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
window.aliyunAPI = new AliyunAPI();

