/**
 * imgloc插件配置项，安装后需要获取用户在imgloc.com的X-API-KEY
 * PicGo客户端的UI界面会根据config 显示需要填些的配置项
 */
const config = () => {
    return [
        {
            name: 'url',
            type: 'input',
            default: 'https://imgloc.com/api/1/upload',
            required: true,
            message: 'imgloc.com API',
            alias: 'imgloc upload URL'
        },
        {
            name: 'token',
            type: 'input',
            default: '',
            required: true,
            message: 'X-API-KEY',
            alias: 'X-API-KEY'
        }
    ];
};

/**
 * imgloc.com的API请求参数构建
 */
const postOptions = (API_url, X_API_KEY, fileName, image) => {
    return {
        method: 'POST',
        url: API_url,
        headers: {
            'X-API-KEY': X_API_KEY,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
        },
        //表单数据，图片文件
        formData: {
            filename: fileName,
            source: {
                value: image,
                options: {
                    filename: fileName,
                    source: fileName
                }
            }
        }
    };
};

//Uploader处理函数，插件的主要部分
const imglocUploadhandle = async (ctx) => {
    const userConfig = ctx.getConfig('picBed.imgloccom');

    //ctx.log.warn 方法会在日志文件中记录信息，可以作为调试手段之一，
    // 可以在C:\Users\用户名\AppData\Roaming\picgo\picgo.log中查看日志，AppData是隐藏文件。
    //PicGo调试比较麻烦，修改代码后，必须先退出PicGo再重新打开
    //或者在托盘窗口右键重启，使用ctx.log.warn 进行调试。
    ctx.log.warn(userConfig);

    //先判断是否已经配置好参数
    if (!userConfig) {
        /* 本来是想弹出提示 告知用户的，不过这个调用不起作用
        ctx.emit('notification', {
            title: '请先配置Imgloc!',
            body: body.status_txt
        });
         */
        throw new Error("请先配置Imgloc!");
    }

    const {url, token} = userConfig;
    if (!token) {
        throw new Error("请先配置Imgloc!");
    }

    const imgList = ctx.output;
    //获取待上传的图片
    if (!imgList || !Array.isArray(imgList) || imgList.length === 0) {
        ctx.log.warn('No images to upload');
        return ctx;
    }

    for (const img of imgList) {
        //对每一张图片进行上传，获取上传后的图片地址
        //ctx.log.warn(img)，打印这个对象，查看img的具体构造
        let imageBuffer = img.buffer
        if (!imageBuffer && img.base64Image) {
            imageBuffer = Buffer.from(img.base64Image, 'base64')
        }
        //ctx.log.warn(image)
        if (!imageBuffer) {
            throw new Error("加载不到图片.");
        }
        //构造请求参数
        const postConfig = postOptions(url, token, img.fileName, imageBuffer);
        //ctx.log.warn(postConfig);

        //调用接口上传图片
        const response = await ctx.request(postConfig);

        const body = JSON.parse(response);
        //ctx.log.error(body);

        //上传结果处理
        if (body.status_code === 200) {
            delete img.base64Image;
            delete img.buffer;
            img.imgUrl = body.image.url;
        } else {
            throw new Error(body.status_txt);
        }
    }

    return ctx;
};

//注册一个插件，并将其暴露给PicGo调用， 会主动将ctx传入
module.exports = (ctx) => {
    const register = () => {
        //向PicGo注册id为imglcocom的插件
        ctx.helper.uploader.register('imgloccom', {
            handle: imglocUploadhandle,        //插件处理者
            name: 'Imgloc.com PicGo Uploader', //插件名称
            config: config                     //插件配置信息
        });
    };

    //暴露 以供调用
    return {
        uploader: 'imgloccom',
        register
    };
};