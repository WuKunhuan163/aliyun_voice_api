// 检查是否安装了@alicloud/pop-core
let RPCClient;
try {
    RPCClient = require('@alicloud/pop-core').RPCClient;
} catch (error) {
    console.error('❌ @alicloud/pop-core 未安装');
}

// 获取Token的函数
async function getAliyunToken(appKey, accessKeyId, accessKeySecret) {
    if (!RPCClient) {
        throw new Error('@alicloud/pop-core not available');
    }

    const client = new RPCClient({
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
        endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
        apiVersion: '2019-02-28'
    });

    try {
        const result = await client.request('CreateToken', {}, {
            method: 'POST'
        });

        if (result && result.Token && result.Token.Id) {
            return {
                success: true,
                token: result.Token.Id,
                expireTime: result.Token.ExpireTime
            };
        } else {
            return {
                success: false,
                error: 'Token获取失败'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
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

    try {
        const { appKey, accessKeyId, accessKeySecret } = req.body;
        const result = await getAliyunToken(appKey, accessKeyId, accessKeySecret);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
