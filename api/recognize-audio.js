// 调用阿里云NLS语音识别API
async function callAliyunNLS(requestData) {
    const { token, audioData, format = 'pcm', sampleRate = 16000, appKey } = requestData;
    
    try {
        // 构建请求URL
        const nlsUrl = 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/asr';
        
        // 构建请求参数
        const params = new URLSearchParams({
            appkey: appKey,
            token: token,
            format: format,
            sample_rate: sampleRate.toString(),
            enable_punctuation_prediction: 'true',
            enable_inverse_text_normalization: 'true'
        });
        
        const requestUrl = `${nlsUrl}?${params}`;
        
        console.log('🔗 调用阿里云NLS API:', requestUrl.substring(0, 100) + '...');
        
        // 将音频数据转换为Buffer
        const audioBuffer = Buffer.from(audioData);
        
        console.log('📊 发送音频数据大小:', audioBuffer.length, 'bytes');
        
        // 发送POST请求到阿里云NLS API
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': audioBuffer.length.toString()
            },
            body: audioBuffer
        });
        
        console.log('📡 阿里云API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 阿里云API错误响应:', errorText);
            throw new Error(`阿里云API错误: ${response.status} - ${errorText}`);
        }
        
        const responseText = await response.text();
        console.log('📄 阿里云API原始响应:', responseText);
        
        // 解析响应
        const result = JSON.parse(responseText);
        console.log('🔍 解析后的结果对象:', JSON.stringify(result, null, 2));
        
        if (result.status === 20000000) {
            // 识别成功
            console.log('✅ 识别成功，result字段值:', result.result);
            console.log('🔍 所有可能的文本字段:', {
                result: result.result,
                text: result.text,
                transcript: result.transcript,
                content: result.content
            });
            return {
                success: true,
                result: result.result || result.text || result.transcript || result.content || '',
                timestamp: Date.now()
            };
        } else {
            // 识别失败
            throw new Error(`阿里云识别失败: ${result.message || '未知错误'}`);
        }
        
    } catch (error) {
        console.error('❌ 调用阿里云NLS失败:', error);
        
        // 如果是网络错误，返回更详细的信息
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('网络连接失败，请检查网络');
        }
        
        throw error;
    }
}

// 处理语音识别的函数
async function handleRealRecognizeAPI(req, res) {
    try {
        console.log('收到语音识别请求:', {
            method: req.method,
            body: req.body ? Object.keys(req.body) : 'no body',
            contentType: req.headers['content-type']
        });
        
        const { audioData, appKey, token, format, sampleRate } = req.body || {};

        console.log('参数检查:', {
            hasAudioData: !!audioData,
            hasAppKey: !!appKey,
            hasToken: !!token,
            format: format || 'pcm',
            sampleRate: sampleRate || 16000
        });

        if (!audioData) {
            return res.status(400).json({
                success: false,
                error: '缺少音频数据'
            });
        }

        if (!appKey) {
            return res.status(400).json({
                success: false,
                error: '缺少AppKey'
            });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                error: '缺少Token'
            });
        }

        console.log('🎤 音频数据长度:', audioData.length);
        console.log('🔑 使用Token:', token.substring(0, 16) + '...');
        console.log('🔐 使用AppKey:', appKey);
        
        // 调用真实的阿里云语音识别API
        const recognitionResult = await callAliyunNLS({
            token,
            audioData,
            format: format || 'pcm',
            sampleRate: sampleRate || 16000,
            appKey
        });
        
        console.log('✅ 识别结果:', recognitionResult.result);
        
        res.json(recognitionResult);

    } catch (error) {
        console.error('❌ 真实语音识别API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message || '语音识别失败'
        });
    }
}

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    await handleRealRecognizeAPI(req, res);
};
