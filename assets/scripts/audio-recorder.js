/**
 * 音频录制功能模块
 * 使用Web Audio API进行高质量音频录制和MP3编码
 */

class AudioRecorder {
    constructor() {
        // 录音相关变量
        this.mediaStream = null;
        this.audioContext = null;
        this.audioWorkletNode = null;
        this.audioSource = null;
        this.audioBuffer = [];
        this.isRecording = false;
        this.recordingTimer = null;
        this.progressTimer = null;
        this.recordingStartTime = null;
        this.lastRecordingBlob = null;
        this.isProcessingRecording = false;
        this.rawAudioData = null; // 保存原始PCM数据
        
        // 音轨峰图相关
        this.waveformData = [];
        this.maxWaveformBars = 300; // 30秒录音，每0.1秒一个峰值条
        this.waveformUpdateInterval = 100; // 每100ms更新一次峰值图
        this.currentAmplitude = 0; // 当前振幅
        this.waveformTimer = null;
        
        // 移除实时语音识别相关变量（改为批量识别）
        
        // 常量配置
        this.BUFFER_SIZE = 4096;
        this.MAX_RECORDING_TIME = 30; // 30秒
        this.SAMPLE_RATE = 44100; // 使用标准采样率，更好的兼容性
    }

    /**
     * 开始
     * @returns {Promise<boolean>} 是否成功开始
     */
    async startRecording() {
        if (this.isRecording) {
            console.log('录音已在进行中');
            return false;
        }

        try {
            
            // 1. 请求麦克风权限 - 使用更宽泛的配置以获得更好的设备兼容性
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: { ideal: this.SAMPLE_RATE },
                    channelCount: { ideal: 1 },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // 保存流，以便后续关闭
            this.mediaStream = stream;
            

            // 2. 设置 Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                sampleRate: this.SAMPLE_RATE 
            });
            console.log('🎵 AudioContext创建完成，采样率:', this.audioContext.sampleRate);

            // 检测协议并选择合适的音频处理方式
            if (location.protocol === 'file:') {
                console.log('🔧 检测到file://协议，使用ScriptProcessor作为fallback');
                // 使用ScriptProcessor作为fallback（适用于file://协议）
                this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
                this.useScriptProcessor = true;
            } else {
                console.log('🔧 使用AudioWorklet处理器');
                // 加载AudioWorklet处理器
                await this.audioContext.audioWorklet.addModule('assets/scripts/audio-processor.js');
                
                // 创建AudioWorkletNode
                this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
                this.useScriptProcessor = false;
            }
            
            // 创建一个音频源
            this.audioSource = this.audioContext.createMediaStreamSource(stream);

            // 清空之前的录音数据
            this.audioBuffer = [];
            console.log('📝 音频缓冲区已清空');
            
            // 初始化音轨峰图
            this.initWaveform();
            
            // 启动峰值图定时更新
            this.startWaveformTimer();

            // 根据处理器类型设置音频处理
            if (this.useScriptProcessor) {
                // ScriptProcessor模式（file://协议fallback）
                this.scriptProcessor.onaudioprocess = (event) => {
                    const inputBuffer = event.inputBuffer.getChannelData(0);
                    const outputBuffer = event.outputBuffer.getChannelData(0);
                    
                    // 复制音频数据
                    this.audioBuffer.push(new Float32Array(inputBuffer));
                    
                    // 计算音量
                    let sum = 0;
                    for (let i = 0; i < inputBuffer.length; i++) {
                        sum += inputBuffer[i] * inputBuffer[i];
                        outputBuffer[i] = inputBuffer[i]; // 透传音频
                    }
                    const rmsLevel = Math.sqrt(sum / inputBuffer.length);
                    this.currentAmplitude = Math.max(this.currentAmplitude, rmsLevel);
                };
            } else {
                // AudioWorklet模式（正常HTTP协议）
                this.audioWorkletNode.port.onmessage = (event) => {
                    const { type, data, maxAmplitude, rmsLevel, bufferCount, dbLevel, duration } = event.data;
                    
                    if (type === 'audioData') {
                        this.audioBuffer.push(new Float32Array(data));
                    } else if (type === 'audioLevel') {
                        this.currentAmplitude = Math.max(this.currentAmplitude, maxAmplitude);
                    }
                };
            }

            // 根据处理器类型连接音频节点（不连接到destination避免回声）
            if (this.useScriptProcessor) {
                // ScriptProcessor模式连接（不连接destination，避免播放录音内容）
                this.audioSource.connect(this.scriptProcessor);
                // 注意：不连接到destination，避免回声
            } else {
                // AudioWorklet模式连接（不连接destination，避免播放录音内容）
                this.audioSource.connect(this.audioWorkletNode);
                // 注意：不连接到destination，避免回声
            }
            
            console.log('🔗 音频节点连接完成:');
            console.log('   - audioSource:', !!this.audioSource);
            console.log('   - audioWorkletNode:', !!this.audioWorkletNode);
            console.log('   - audioContext.destination:', !!this.audioContext.destination);
            console.log('   - audioContext.state:', this.audioContext.state);
            
            // 确保AudioContext处于running状态
            if (this.audioContext.state === 'suspended') {
                console.log('🔄 AudioContext被暂停，尝试恢复...');
                await this.audioContext.resume();
                console.log('✅ AudioContext状态:', this.audioContext.state);
            }

            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // 设置自动停止
            this.recordingTimer = setTimeout(async () => {
                if (this.isRecording) {
                    const mp3Blob = await this.stopRecording();
                    // 触发自动停止回调，让app.js处理后续逻辑
                    if (this.onAutoStop) {
                        this.onAutoStop(mp3Blob);
                    }
                }
            }, this.MAX_RECORDING_TIME * 1000);
            
            console.log('🔴 录音开始 (使用 Web Audio API)');
            return true;
            
        } catch (error) {
            console.error('❌ 录音启动失败:', error);
            
            // 清理资源
            this.cleanup();
            
            let errorMessage = '录音启动失败';
            if (error.name === 'NotAllowedError') {
                errorMessage = '麦克风权限被拒绝，请允许浏览器访问麦克风';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到麦克风设备，请检查麦克风连接';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = '浏览器不支持录音功能，请使用现代浏览器';
            }
            
            throw new Error(errorMessage);
        }
    }

    /**
     * 停止
     * @returns {Promise<Blob>} 录音的MP3 Blob
     */
    async stopRecording() {
        if (!this.isRecording) {
            return null;
        }
        
        try {
            this.isRecording = false;
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
            if (this.waveformTimer) {
                clearInterval(this.waveformTimer);
                this.waveformTimer = null;
            }

            // 关键：断开Web Audio API连接
            if (this.audioSource) {
                this.audioSource.disconnect();
                this.audioSource = null;
            }
            if (this.audioWorkletNode) {
                this.audioWorkletNode.disconnect();
                this.audioWorkletNode = null;
            }
            if (this.scriptProcessor) {
                this.scriptProcessor.disconnect();
                this.scriptProcessor = null;
            }
            
            // 关键：关闭麦克风轨道
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
                this.mediaStream = null;
            }
            if (this.audioBuffer.length === 0) {
                throw new Error('没有收集到音频数据');
            }

            // 组合所有音频数据块
            const totalLength = this.audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0);
            const mergedBuffer = this.mergeBuffers(this.audioBuffer, totalLength);
            
            // 保存原始PCM数据供语音识别使用
            this.rawAudioData = new Float32Array(mergedBuffer);
            
            // 分析整体音频质量
            const audioAnalysis = this.analyzeAudio(mergedBuffer);
            if (audioAnalysis.maxAmplitude < 0.001) {
                console.warn('⚠️ 警告：录音数据振幅极低，可能是静音或麦克风问题');
            }

            const mp3Blob = this.encodeToMp3(mergedBuffer);
            this.lastRecordingBlob = mp3Blob; // 保存为MP3 Blob
            console.log('✅ MP3编码完成，文件大小:', (mp3Blob.size / 1024).toFixed(2), 'KB');
            
            // 关闭AudioContext
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            return mp3Blob;
            
        } catch (error) {
            console.error('❌ 停止失败:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * 合并音频缓冲区
     * @param {Float32Array[]} bufferArray - 音频缓冲区数组
     * @param {number} totalLength - 总长度
     * @returns {Float32Array} 合并后的音频数据
     */
    mergeBuffers(bufferArray, totalLength) {
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (let i = 0; i < bufferArray.length; i++) {
            result.set(bufferArray[i], offset);
            offset += bufferArray[i].length;
        }
        return result;
    }

    /**
     * 分析音频数据质量
     * @param {Float32Array} audioData - 音频数据
     * @returns {Object} 分析结果
     */
    analyzeAudio(audioData) {
        let maxAmplitude = 0;
        let rmsLevel = 0;
        let nonZeroSamples = 0;
        
        for (let i = 0; i < audioData.length; i++) {
            const abs = Math.abs(audioData[i]);
            if (abs > maxAmplitude) {
                maxAmplitude = abs;
            }
            if (abs > 0.0001) { // 忽略极小的噪声
                nonZeroSamples++;
            }
            rmsLevel += audioData[i] * audioData[i];
        }
        rmsLevel = Math.sqrt(rmsLevel / audioData.length);
        
        return {
            maxAmplitude: maxAmplitude,
            rmsLevel: rmsLevel,
            nonZeroSamples: nonZeroSamples,
            totalSamples: audioData.length,
            nonZeroPercentage: (nonZeroSamples / audioData.length * 100),
            dbLevel: rmsLevel > 0 ? (20 * Math.log10(rmsLevel)) : -Infinity,
            duration: audioData.length / (this.audioContext ? this.audioContext.sampleRate : this.SAMPLE_RATE)
        };
    }

    /**
     * 将原始PCM数据编码为MP3
     * @param {Float32Array} pcmData - PCM数据
     * @returns {Blob} MP3 Blob
     */
    encodeToMp3(pcmData) {
        const sampleRate = this.audioContext ? this.audioContext.sampleRate : this.SAMPLE_RATE;
        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // 1个声道, 采样率, 128kbps
        const pcmInt16 = this.convertFloat32ToInt16(pcmData);
        const mp3Data = [];
        const blockSize = 1152; // MP3编码块大小
        
        for (let i = 0; i < pcmInt16.length; i += blockSize) {
            const chunk = pcmInt16.subarray(i, i + blockSize);
            const mp3buf = mp3encoder.encodeBuffer(chunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }
        
        // 完成编码
        const finalBuffer = mp3encoder.flush();
        if (finalBuffer.length > 0) {
            mp3Data.push(finalBuffer);
        }
        
        const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
        return mp3Blob;
    }

    /**
     * 将Float32Array转换为Int16Array
     * @param {Float32Array} buffer - Float32数据
     * @returns {Int16Array} Int16数据
     */
    convertFloat32ToInt16(buffer) {
        const int16Buffer = new Int16Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            const sample = Math.max(-1, Math.min(1, buffer[i])); // 限制在-1到1之间
            int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        return int16Buffer;
    }

    /**
     * 获取最后一次录音的Blob
     * @returns {Blob|null} 录音Blob
     */
    getLastRecording() {
        return this.lastRecordingBlob;
    }

    /**
     * 获取原始PCM音频数据
     * @returns {Float32Array|null} 原始音频数据
     */
    getRawAudioData() {
        return this.rawAudioData;
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
        }
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        if (this.waveformTimer) {
            clearInterval(this.waveformTimer);
            this.waveformTimer = null;
        }
        // 移除实时识别定时器清理（已改为批量识别）
        this.audioSource = null;
        this.audioWorkletNode = null;
        this.audioBuffer = [];
        this.rawAudioData = null;
        this.isRecording = false;
        this.isProcessingRecording = false;
        this.clearWaveform();
    }

    /**
     * 检查是否正在录音
     * @returns {boolean} 是否正在录音
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * 基于定时器更新音轨峰图
     */
    updateWaveformOnTimer() {
        if (!this.isRecording) return;
        
        // 将当前振幅转换为峰图高度 (0-25px，留5px边距)
        const height = Math.min(25, Math.max(1, this.currentAmplitude * 150)); // 减小放大倍数到150
        
        // 添加到峰图数据
        this.waveformData.push(height);
        
        // 重置当前振幅，准备下一次采样
        this.currentAmplitude = 0;
        
        // 更新SVG显示
        this.renderWaveform();
    }

    /**
     * 渲染音轨峰图SVG
     */
    renderWaveform() {
        const waveformBars = document.getElementById('waveformBars');
        if (!waveformBars) return;
        
        // 清空现有的峰值条
        waveformBars.innerHTML = '';
        
        // 计算当前录音进度
        const elapsed = this.isRecording ? (Date.now() - this.recordingStartTime) / 1000 : this.MAX_RECORDING_TIME;
        const totalBarsToShow = Math.min(this.maxWaveformBars, Math.ceil(elapsed * 10)); // 每秒10个峰值条
        
        // 计算每个峰值条的宽度
        const barWidth = 1000 / this.maxWaveformBars; // SVG viewBox宽度为1000
        
        // 绘制峰值条（从最新的数据开始，向前显示）
        const startIndex = Math.max(0, this.waveformData.length - totalBarsToShow);
        for (let i = 0; i < totalBarsToShow && i < this.waveformData.length; i++) {
            const dataIndex = startIndex + i;
            if (dataIndex < this.waveformData.length) {
                const height = this.waveformData[dataIndex];
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'waveform-bar');
                rect.setAttribute('x', i * barWidth);
                rect.setAttribute('y', 30 - height); // 从底部开始
                rect.setAttribute('width', barWidth * 0.8); // 留一点间隙
                rect.setAttribute('height', height);
                waveformBars.appendChild(rect);
            }
        }
        
        // 更新进度遮罩
        this.updateWaveformProgress();
    }

    /**
     * 更新音轨峰图的进度遮罩
     */
    updateWaveformProgress() {
        const progressMask = document.getElementById('waveformProgressMask');
        if (!progressMask || !this.isRecording) return;
        
        // 计算进度百分比
        const elapsed = Date.now() - this.recordingStartTime;
        const progress = Math.min(100, (elapsed / (this.MAX_RECORDING_TIME * 1000)) * 100);
        
        // 更新遮罩宽度
        progressMask.setAttribute('width', (progress / 100) * 1000);
    }

    /**
     * 初始化音轨峰图
     */
    initWaveform() {
        this.waveformData = [];
        const waveformBars = document.getElementById('waveformBars');
        if (waveformBars) {
            waveformBars.innerHTML = '';
        }
        const progressMask = document.getElementById('waveformProgressMask');
        if (progressMask) {
            progressMask.setAttribute('width', '0');
        }
    }

    /**
     * 启动音轨峰图定时器
     */
    startWaveformTimer() {
        this.waveformTimer = setInterval(() => {
            this.updateWaveformOnTimer();
        }, this.waveformUpdateInterval);
    }

    // 移除所有实时识别相关方法（已改为批量识别）

    /**
     * 清理音轨峰图
     */
    clearWaveform() {
        this.waveformData = [];
        this.currentAmplitude = 0;
        const waveformBars = document.getElementById('waveformBars');
        if (waveformBars) {
            waveformBars.innerHTML = '';
        }
        const progressMask = document.getElementById('waveformProgressMask');
        if (progressMask) {
            progressMask.setAttribute('width', '0');
        }
    }

    // 移除所有重复的实时识别相关方法（已改为批量识别）
}

// 创建全局实例
window.audioRecorder = new AudioRecorder();
