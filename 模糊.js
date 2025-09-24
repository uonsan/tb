/**
 2  *                             _ooOoo_
 3  *                            o8888888o
 4  *                            88" . "88
 5  *                            (| -_- |)
 6  *                            O\  =  /O
 7  *                         ____/`---'\____
 8  *                       .'  \\|     |//  `.
 9  *                      /  \\|||  :  |||//  \
10  *                     /  _||||| -:- |||||-  \
11  *                     |   | \\\  -  /// |   |
12  *                     | \_|  ''\---/''  |   |
13  *                     \  .-\__  `-`  ___/-. /
14  *                   ___`. .'  /--.--\  `. . __
15  *                ."" '<  `.___\_<|>_/___.'  >'"".
16  *               | | :  `- \`.;`\ _ /`;.`/ - ` : | |
17  *               \  \ `-.   \_ __\ /__ _/   .-` /  /
18  *          ======`-.____`-.___\_____/___.-`____.-'======
19  *                             `=---='
20  *          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
21  *                     佛祖保佑        永无BUG
22  *            佛曰:
23  *                   写字楼里写字间，写字间里程序员；
24  *                   程序人员写程序，又拿程序换酒钱。
25  *                   酒醒只在网上坐，酒醉还来网下眠；
26  *                   酒醉酒醒日复日，网上网下年复年。
27  *                   但愿老死电脑间，不愿鞠躬老板前；
28  *                   奔驰宝马贵者趣，公交自行程序员。
29  *                   别人笑我忒疯癫，我笑自己命太贱；
30  *                   不见满街漂亮妹，哪个归得程序员？
31  *            
32  *            孔明曰：
33  *                   AI蒙我心，不看文档自由行。
34  *                   扩展教程如掘金，运行犹心惊。
35  *                   鼠标三千斤，三千报错颤吾心。
36  *                   佛祖保佑，永无BUG!
37 */

//AGPL协议

/**
 * Scratch 扩展：kmsBlur
 * 版权所有 © 2025 诸葛孔明
 *
 * 本程序是自由软件：你可以根据自由软件基金会发布的 GNU Affero 通用公共许可证第三版，
 * 或（由你选择）任何更新版本的规定，重新发布和/或修改本程序。
 *
 * 本程序发布的目的是希望它有用，但不作任何担保；甚至没有适销性或特定用途适用性的暗示担保。
 * 更多详情请参见 GNU Affero 通用公共许可证。
 *
 * 你应当已经随本程序收到了一份 GNU Affero 通用公共许可证副本。
 * 如果没有，请访问 <https://www.gnu.org/licenses/>.
 */

(function(sc){
    let vm = sc.vm
    let runtime = vm.runtime
    let renderer = runtime.renderer
    //renderer是Scratch的渲染器 管理着所有渲染的任务 本扩展就是用到renderer提供的api来实现模糊效果的
    let setup = {
        'zh-cn': {
            'YouCanUseTheExtensionsOnTheStage':'你可以在舞台上使用该扩展！',
            'Kong ming \'s Blur': '孔明の模糊',
            'setBlur': '为我设定[blur]级模糊的[costume]号造型 [cache]缓存',
            'addBlur':'为我增加[blur]级模糊 [cache]缓存',
            'getBlur':'获取我的模糊值',
            'blurTips':'提示：模糊值只能在同一个线程中获取和增加！',
            'setCacheForEach': '为[costume]号造型预生成[blurFrom]-[blurTo]级模糊缓存',
            'restoreBlur':'恢复造型',
            'cache_yes': '使用缓存',
            'cache_no': '不使用缓存',
            'clear_cache': '清空模糊缓存'
        },
        'en': {
            'YouCanUseTheExtensionsOnTheStage':'You can use the extensions on the stage!',
            'Kong ming \'s Blur': 'Kong ming \'s Blur',
            'setBlur': 'Set [costume] number of blur for me [blur] level [cache]',
            'addBlur':'Add [blur] level blur [cache]',
            'getBlur':'Get my blur value',
            'blurTips':'Tips: blur value can only be obtained and added in the same thread!',
            'setCacheForEach': 'Pre-generate blur cache [blurFrom]-[blurTo] for costume [costume]',
            'restoreBlur':'Restore costume',
            'cache_yes': 'use cache',
            'cache_no': 'no cache',
            'clear_cache': 'Clear blur cache'
        }
    } //基本翻译
    function createSVGSkin(SVGDATA,ROTATIONCENTER){
        const skinId = renderer.createSVGSkin(SVGDATA,ROTATIONCENTER)
        //renderer.createSVGSkin有两个参数 第一个是svg代码 第二个是rotationCenter的控制 实际上第二个参数选填
        if (!skinId) return null
        // const svgSkin = runtime.renderer._allSkins[skinId]
        return skinId
    } //新建一个SVG皮肤
    function translate() {
        return setup[sc.translate.language]
            ? (setup[sc.translate.language][arguments[0]] || setup.en[arguments[0]])
            : (sc.translate.language == 'zh-tw'? setup['zh-cn'][arguments[0]] : setup.en[arguments[0]])
    } //翻译算法 取代原先奇异搞笑的难绷翻译
    class temp {
        constructor() {
            sc.translate.setup(setup) //注册翻译
            this.cache = {} //缓存
            this.blurList = {}
        }
        getInfo() {
            return {
                id: 'kmsBlur',
                name:translate('Kong ming \'s Blur'),
                color1:'#668cff',
                color2:'#3d6dff',
                color3:'#7c9dff',
                blockIconURI:'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxMjMuMDE4NTciIGhlaWdodD0iNzcuODM1NDEiIHZpZXdCb3g9IjAsMCwxMjMuMDE4NTcsNzcuODM1NDEiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xODAuMjQ3NDcsLTEzNi41ODExNykiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMjE1LjkyMTY0LDE1NS44MjE0OWwtMjguNDI0MTYsMTguNzg4MTUiIHN0cm9rZT0iIzhjOWJmZiIgc3Ryb2tlLXdpZHRoPSIxNC41Ii8+PHBhdGggZD0iTTIxMS4zNzUzNywxOTguOTE1NDlsLTIzLjg3Nzg5LC0yNC4zMDU4NCIgc3Ryb2tlPSIjOGM5YmZmIiBzdHJva2Utd2lkdGg9IjE0LjUiLz48cGF0aCBkPSJNMjExLjM3NTM3LDE5OC45MTU0OWwtMjMuODc3ODksLTI0LjMwNTg0IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNC41Ii8+PHBhdGggZD0iTTIxNS45MjE2NCwxNTUuODIxNDlsLTI4LjQyNDE2LDE4Ljc4ODE1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNC41Ii8+PGc+PHBhdGggZD0iTTI1NC40NjkyMSwxNDMuODMxMTdsLTI1LjE0NjMxLDYzLjMzNTQxIiBzdHJva2U9IiM4YzliZmYiIHN0cm9rZS13aWR0aD0iMTQuNSIvPjxwYXRoIGQ9Ik0yNTQuNDY5MjEsMTQzLjgzMTE3bC0yNS4xNDYzMSw2My4zMzU0MSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjQuNSIvPjwvZz48cGF0aCBkPSJNMjY5LjUzMDM2LDE1Ny4yMDg5OWwyNi40ODU2OCwyMS40MzQ0NiIgc3Ryb2tlPSIjOGM5YmZmIiBzdHJva2Utd2lkdGg9IjE0LjUiLz48cGF0aCBkPSJNMjY5LjkxMTQ3LDIwMC41NDA0NWwyNi4xMDQ1OCwtMjEuODk3IiBzdHJva2U9IiM4YzliZmYiIHN0cm9rZS13aWR0aD0iMTQuNSIvPjxwYXRoIGQ9Ik0yNjkuOTExNDcsMjAwLjU0MDQ1bDI2LjEwNDU4LC0yMS44OTciIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0LjUiLz48cGF0aCBkPSJNMjY5LjUzMDM2LDE1Ny4yMDg5OWwyNi40ODU2OCwyMS40MzQ0NiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjQuNSIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjU5Ljc1MjUyNDk5OTk5OTk5OjQzLjQxODgzMDAwMDAwMDAxNC0tPg==',                
                blocks: [
                    {
                        blockType:'label',
                        text: translate('YouCanUseTheExtensionsOnTheStage'),
                        filter:['stage']
                    },
                    {
                        opcode: 'setBlur',
                        blockType: 'command',
                        text: translate('setBlur'),
                        arguments: {
                            costume:{
                                type:'number',
                                defaultValue:1
                            },
                            blur:{
                                type:'number',
                                defaultValue:5
                            },
                            cache:{
                                type:'string',
                                menu:'cache_menu',
                                defaultValue:'yes'
                            }
                        }
                    },
                    {
                        blockType:'label',
                        text: translate('blurTips')
                    },
                    {
                        opcode: 'addBlur',
                        blockType: 'command',
                        text: translate('addBlur'),
                        arguments: {
                            costume:{
                                type:'number',
                                defaultValue:1
                            },
                            blur:{
                                type:'number',
                                defaultValue:5
                            },
                            cache:{
                                type:'string',
                                menu:'cache_menu',
                                defaultValue:'yes'
                            }
                        }
                    },
                    {
                        opcode: 'getBlur',
                        blockType: 'reporter',
                        text: translate('getBlur')
                    },
                    {
                        opcode:'setCacheForEach',
                        blockType: 'command',
                        text: translate('setCacheForEach'),
                        arguments: {
                            costume:{
                                type:'number',
                                defaultValue:1
                            },
                            blurFrom:{
                                type:'number',
                                defaultValue:1
                            },
                            blurTo:{
                                type:'number',
                                defaultValue:10
                            }
                        }
                    },
                    {
                        opcode:'clearCache',
                        blockType: 'command',
                        text: translate('clear_cache')
                    },
                    {
                        opcode:'restoreBlur',
                        blockType: 'command',
                        text: translate('restoreBlur')
                    }
                ],
                menus: {
                    cache_menu: {
                        items:[
                            {
                                text:translate('cache_yes'),
                                value:'yes'
                            },
                            {
                                text:translate('cache_no'),
                                value:'no'
                            }
                        ]
                    }
                }
            }
        }
        setBlur(args,util){
            let skin = this.SetBlur_(args,util)
            let {thread} = util
            if(!thread.blur) thread.blur = Object.create(null)
            thread.blur = {
                blur:args.blur,
                costume:args.costume
            }
            renderer.updateDrawableSkinId(skin[0], skin[1])
            runtime.requestRedraw()
        }
        addBlur(args,util){
            let blurValue = this.getBlur(args,util) || 0
            blurValue += args.blur 
            console.log(blurValue)
            this.setBlur({costume:util.thread.blur.costume || 1,blur:blurValue,cache:args.cache},util)
            console.log(util)
        }
        getBlur(args,util){
            try{
                return util.thread.blur.blur
            }catch{
                util.thread.blur = {
                    blur:0,
                    costume:1
                }
                return 0
            }
        }
        setCacheForEach(args, util) {
            let { costume, blurFrom, blurTo } = args

            let [min, max] = [blurFrom, blurTo].sort((a, b) => a - b)

            const getDecimals = num => (num.toString().split('.')[1] || '').length //获取小数位数的方法 DeepSeek神力
            const decimals = Math.max(getDecimals(min), getDecimals(max)) //获取最大小数位数

            const factor = Math.pow(10, decimals) //10^decimals 用于四舍五入取整
            const start = Math.round(min * factor)
            const end = Math.round(max * factor) // 四舍五入取整 避免浮点数问题

            for (let i = start; i <= end; i++) {
                const blur = Number((i / factor).toFixed(decimals)) //保留小数decimals位数 二层加固
                this.SetBlur_({ costume, blur, cache: 'yes' }, util)
            }
        }
        clearCache(){
            for(let i in this.cache){
                renderer.destroySkin(this.cache[i]) //采用Scratch内部的删除皮肤方法 删除所有缓存 节省性能
            }
            this.cache = {} //删除完皮肤之后初始化缓存对象
        }
        SetBlur_(args,util){
            try{
                let {costume,blur,cache} = args 
                cache = cache === 'yes' //是否使用缓存

                let drawableId = util.target.drawableID //看看Scratch渲染到第几个元素了
            
                let cacheKey = JSON.stringify([util.target.sprite.name,costume,blur]) //看看缓存键是什么 之后用

                if(this.cache[cacheKey] && cache) return [drawableId,this.cache[cacheKey]]

                const costumeData = util.target.sprite.costumes_[costume - 1] //获取角色的造型
                const svgData = costumeData.asset.decodeText()
                const rotationCenter = [costumeData.rotationCenterX,costumeData.rotationCenterY]

                const parser = new DOMParser()
                const doc = parser.parseFromString(svgData, "image/svg+xml")
                const svg = doc.querySelector('svg')
                
                let defs = svg.querySelector('#blurDefs') ||
                    svg.insertBefore(
                        doc.createElementNS('http://www.w3.org/2000/svg', 'defs'),
                        svg.firstChild
                    )
                defs.id = 'blurDefs'
                let filter = defs.querySelector('#blurFilter') || 
                    defs.appendChild(
                        doc.createElementNS('http://www.w3.org/2000/svg', 'filter')
                    )
                filter.id = 'blurFilter'
                let blurFilter = filter.querySelector('feGaussianBlur') || 
                    filter.appendChild(
                        doc.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
                    )
                blurFilter.setAttribute('stdDeviation', blur)
                Array.from(svg.children)
                    .filter(child => child !== defs)
                    //链式调用 先将子元素转化为纯正的数组 再过滤defs元素
                    .forEach(child=>child.setAttribute('filter', 'url(#blurFilter)'))
                
                let skinId = createSVGSkin(new XMLSerializer().serializeToString(svg),rotationCenter)
                if (cache) this.cache[cacheKey] = skinId
                return [drawableId,skinId]
            }
            catch(e){
                console.error('SetBlur: Error: ',e)
            }
        }
        restoreBlur(args,util){
            let {target} = util
            const drawable = renderer._allDrawables[target.drawableID]
            if (drawable) {
                runtime.renderer.updateDrawableSkinId(target.drawableID, target.sprite.costumes_[target.currentCostume].skinId)
                runtime.requestRedraw()
            }
            if(!util.thread.blur) util.thread.blur = {}
            util.thread.blur.blur = 0
            if(!util.thread.blur.costume) util.thread.blur.costume = 1
        }
    }
    sc.extensions.register(new temp())
})(Scratch)