// audio-processor.js - AudioWorklet处理器
class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = [];
        this.bufferLength = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        
        if (input.length > 0) {
            const inputChannel = input[0]; // 获取第一个声道
            
            // 检查音频信号强度
            let maxAmplitude = 0;
            let rmsLevel = 0;
            
            for (let i = 0; i < inputChannel.length; i++) {
                const sample = inputChannel[i];
                const abs = Math.abs(sample);
                if (abs > maxAmplitude) {
                    maxAmplitude = abs;
                }
                rmsLevel += sample * sample;
            }
            rmsLevel = Math.sqrt(rmsLevel / inputChannel.length);

            // 将数据复制并存入缓冲区
            const audioData = new Float32Array(inputChannel.length);
            audioData.set(inputChannel);
            
            // 发送音频数据到主线程
            this.port.postMessage({
                type: 'audioData',
                data: audioData,
                maxAmplitude: maxAmplitude,
                rmsLevel: rmsLevel
            });

            // 显示音频信号监控（每50个块显示一次）
            this.bufferLength++;
            if (this.bufferLength % 50 === 0) {
                const dbLevel = rmsLevel > 0 ? 20 * Math.log10(rmsLevel) : -Infinity;
                this.port.postMessage({
                    type: 'audioLevel',
                    bufferCount: this.bufferLength,
                    maxAmplitude: maxAmplitude,
                    rmsLevel: rmsLevel,
                    dbLevel: dbLevel,
                    duration: (this.bufferLength * inputChannel.length / sampleRate).toFixed(1)
                });
            }
        }

        return true; // 保持处理器活跃
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);

