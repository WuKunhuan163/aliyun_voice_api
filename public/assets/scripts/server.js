const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const Nls = require('alibabacloud-nls');
const { exec } = require('child_process');

// 检查是否安装了@alicloud/pop-core
let RPCClient;
try {
    RPCClient = require('@alicloud/pop-core').RPCClient;
    console.log('✅ @alicloud/pop-core 已安装');
} catch (error) {
    console.error('❌ @alicloud/pop-core 未安装，请运行: npm install @alicloud/pop-core');
    process.exit(1);
}

const PORT = process.env.PORT || 0; // 0表示自动分配端口
const AUTO_OPEN = process.argv.includes('-o') || process.argv.includes('--open');

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = req.url;
    const method = req.method;
    
    console.log(`${method} ${url}`);
    
    // 处理Token获取API
    if (url === '/api/get-token' && method === 'POST') {
        await handleTokenAPI(req, res);
        return;
    }
    
    // 处理真实的语音识别API
    if (url.startsWith('/api/recognize-audio') && method === 'POST') {
        await handleRealRecognizeAPI(req, res);
                    return;
    }
    
    // 处理静态文件
    if (method === 'GET') {
        let filePath = './public';
        
        if (url === '/') {
            filePath = './public/index.html';
        } else {
            filePath = './public' + url;
                }
                
                try {
            const data = fs.readFileSync(filePath);
            const ext = path.extname(filePath);
            
            let contentType = 'text/html';
            if (ext === '.js') contentType = 'application/javascript';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.json') contentType = 'application/json';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.svg') contentType = 'image/svg+xml';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
        return;
    }
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

// 处理Token获取API
async function handleTokenAPI(req, res) {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
    req.on('end', async () => {
                try {
            console.log('🔍 收到Token获取请求');
            const { appKey, accessKeyId, accessKeySecret } = JSON.parse(body);
                    
            if (!accessKeyId || !accessKeySecret) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: '缺少AccessKey ID或Secret',
                    errorType: 'credential'
                }));
                        return;
                    }
                    
            console.log('🔑 创建阿里云客户端...');
            console.log('   AccessKey ID:', accessKeyId.substring(0, 8) + '...');
            
            // 使用@alicloud/pop-core创建客户端
            const client = new RPCClient({
                accessKeyId: accessKeyId,
                accessKeySecret: accessKeySecret,
                endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
                apiVersion: '2019-02-28'
            });
            
            console.log('🔄 调用CreateToken API...');
            
            // 调用CreateToken API
            const result = await client.request('CreateToken');
            
            console.log('✅ Token获取成功:');
            console.log('   Token ID:', result.Token.Id.substring(0, 16) + '...');
            console.log('   过期时间:', new Date(result.Token.ExpireTime * 1000).toLocaleString());
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                token: result.Token.Id,
                expireTime: result.Token.ExpireTime
            }));
            
        } catch (error) {
            console.error('❌ Token获取失败:', error);
            console.error('   错误类型:', error.constructor.name);
            console.error('   错误代码:', error.code || 'N/A');
            console.error('   错误消息:', error.message);
            
            let errorMessage = error.message;
            let errorType = 'credential'; // 默认为凭据错误
            
            if (error.code) {
                switch (error.code) {
                    case 'InvalidAccessKeyId.NotFound':
                        errorMessage = 'AccessKey ID 不存在，请检查是否正确';
                        break;
                    case 'SignatureDoesNotMatch':
                        errorMessage = 'AccessKey Secret 不正确，请检查是否正确';
                        break;
                    case 'Forbidden':
                    case 'NoPermission':
                        errorMessage = '权限不足，请检查AccessKey权限设置';
                        break;
                    default:
                        errorMessage = `API错误: ${error.message}`;
                        break;
                }
            } else if (error.message && (
                error.message.includes('network') || 
                error.message.includes('timeout') ||
                error.message.includes('connect')
            )) {
                errorType = 'network';
                errorMessage = `网络问题：${error.message}`;
            }
            
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: errorMessage,
                errorType: errorType,
                code: error.code || null
            }));
        }
    });
}

// 处理真实的语音识别API
async function handleRealRecognizeAPI(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            console.log('🔍 收到真实语音识别请求');
            const requestData = JSON.parse(body);
            
            // 检查必需参数
            if (!requestData.audioData || !requestData.token || !requestData.appKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: '缺少音频数据、Token或AppKey'
                }));
                            return;
                        }
            
            console.log('🎤 音频数据长度:', requestData.audioData.length);
            console.log('🔑 使用Token:', requestData.token.substring(0, 16) + '...');
            console.log('🔐 使用AppKey:', requestData.appKey);
            
            // 实际的阿里云语音识别API调用
            // 这里需要使用阿里云的NLS SDK或REST API
            const recognitionResult = await callAliyunNLS(requestData);
            
            console.log('✅ 识别结果:', recognitionResult.result);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(recognitionResult));
            
        } catch (error) {
            console.error('❌ 真实语音识别API错误:', error);
            
                    res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message || '语音识别失败'
            }));
        }
    });
}

// 调用阿里云NLS语音识别API
async function callAliyunNLS(requestData) {
    const { token, audioData, format = 'pcm', sampleRate = 16000 } = requestData;
    
    try {
        // 构建请求URL
        const nlsUrl = 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/asr';
        
        // 构建请求参数
        const params = new URLSearchParams({
            appkey: requestData.appKey, // 使用客户端发送的AppKey
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
        
        if (result.status === 20000000) {
            // 识别成功
            return {
                success: true,
                result: result.result,
                confidence: 0.9, // 阿里云API可能不返回置信度
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

const serverInstance = server.listen(PORT, () => {
    const actualPort = serverInstance.address().port;
    const url = `http://localhost:${actualPort}`;
    
    console.log(`🚀 阿里云语音识别服务器启动成功: ${url}`);
    console.log(`🔗 在浏览器中打开: ${url}`);
    
    // 自动打开浏览器
    if (AUTO_OPEN) {
        console.log('🌐 正在自动打开浏览器...');
        const platform = process.platform;
        let command;
        
        switch (platform) {
            case 'darwin': // macOS
                command = `open ${url}`;
                break;
            case 'win32': // Windows
                command = `start ${url}`;
                break;
            default: // Linux and others
                command = `xdg-open ${url}`;
                break;
        }
        
        exec(command, (error) => {
            if (error) {
                console.warn('⚠️ 自动打开浏览器失败:', error.message);
                console.log('请手动打开浏览器访问上述地址');
            } else {
                console.log('✅ 浏览器已自动打开');
            }
        });
    }
});

// 创建WebSocket服务器用于流式识别
const wss = new WebSocket.Server({ server: serverInstance });

wss.on('connection', (ws) => {
    console.log('🌊 新的WebSocket连接建立');
    
    let nlsClient = null;
    let isStreaming = false;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'start') {
                console.log('🎤 开始流式识别');
                await startStreamingRecognition(ws, data.token, data.appKey);
            } else if (data.type === 'audio' && isStreaming) {
                // 发送音频数据
                if (nlsClient) {
                    const audioBuffer = Buffer.from(data.data);
                    if (!nlsClient.sendAudio(audioBuffer)) {
                        console.error('❌ 发送音频数据失败');
                    }
                }
            } else if (data.type === 'stop') {
                console.log('⏹️ 停止流式识别');
                if (nlsClient) {
                    try {
                        await nlsClient.close();
                    } catch (error) {
                        console.error('关闭NLS客户端失败:', error);
                    }
                    nlsClient = null;
                }
                isStreaming = false;
            }
        } catch (error) {
            console.error('❌ WebSocket消息处理失败:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
    
    ws.on('close', async () => {
        console.log('🔌 WebSocket连接关闭');
        if (nlsClient) {
            try {
                await nlsClient.close();
            } catch (error) {
                console.error('关闭NLS客户端失败:', error);
            }
        }
    });
    
    async function startStreamingRecognition(ws, token, appKey) {
        try {
            const URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1";
            
            nlsClient = new Nls.SpeechTranscription({
                url: URL,
                appkey: appKey,
                token: token
            });
            
            nlsClient.on("started", (msg) => {
                console.log("🟢 NLS started:");
                console.log("   完整消息:", JSON.stringify(msg, null, 2));
                ws.send(JSON.stringify({
                    type: 'started',
                    message: msg
                }));
                isStreaming = true;
            });
            
            nlsClient.on("changed", (msg) => {
                console.log("🔄 NLS changed:");
                console.log("   完整消息:", JSON.stringify(msg, null, 2));
                console.log("   识别结果:", msg.result);
                ws.send(JSON.stringify({
                    type: 'partial',
                    text: msg.result
                }));
            });
            
            nlsClient.on("completed", (msg) => {
                console.log("✅ NLS completed:");
                console.log("   完整消息:", JSON.stringify(msg, null, 2));
                console.log("   最终结果:", msg.result);
                ws.send(JSON.stringify({
                    type: 'final',
                    text: msg.result
                }));
            });
            
            nlsClient.on("failed", (msg) => {
                console.error("❌ NLS failed:");
                console.error("   完整错误消息:", JSON.stringify(msg, null, 2));
                console.error("   错误代码:", msg.status_code);
                console.error("   错误信息:", msg.status_text);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: msg.status_text || msg.message || msg
                }));
            });
            
            nlsClient.on("closed", () => {
                console.log("🔴 NLS closed");
                ws.send(JSON.stringify({
                    type: 'closed'
                }));
                isStreaming = false;
            });
            
            // 启动NLS客户端
            console.log("🚀 正在启动NLS客户端...");
            console.log("   URL:", URL);
            console.log("   AppKey:", appKey);
            console.log("   Token前16位:", token.substring(0, 16) + '...');
            console.log("   默认参数:", JSON.stringify(nlsClient.defaultStartParams(), null, 2));
            
            await nlsClient.start(nlsClient.defaultStartParams(), true, 6000);
            console.log("✅ NLS客户端启动成功");
            
        } catch (error) {
            console.error('❌ 启动流式识别失败:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});
