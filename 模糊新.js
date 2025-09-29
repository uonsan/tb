
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
    let setup = {
        'zh-cn': {
            'kmsBlur': '孔明の模糊',
            'setBlur': '设置模糊度 [blur]',
            'addBlur': '增加模糊度 [blur]',
            'getBlur': '获取当前模糊度',
            'setCacheForEach': '预缓存模糊从 [blurFrom] 到 [blurTo]，步长 [step]',
            'clearCache': '清除所有缓存',
            'restoreBlur': '恢复原始图像'
        },
        'zh-tw': {
            'kmsBlur': '孔明の模糊',
            'setBlur': '設定模糊度 [blur]',
            'addBlur': '增加模糊度 [blur]',
            'getBlur': '獲取當前模糊度',
            'setCacheForEach': '預緩存模糊從 [blurFrom] 到 [blurTo]，步長 [step]',
            'clearCache': '清除所有緩存',
            'restoreBlur': '恢復原始圖像'
        },
        'en': {
            'kmsBlur': 'Kong ming\'s blur',
            'setBlur': 'set blur [blur]',
            'addBlur': 'add blur [blur]',
            'getBlur': 'get blur',
            'setCacheForEach': 'set cache from [blurFrom] to [blurTo], step [step]',
            'clearCache': 'clear all cache',
            'restoreBlur': 'restore original image'
        }
    }
    function translate(str) {
        return setup[sc.translate.language]
            ? setup[sc.translate.language][str] || setup.en[str]
            : setup.en[str]
    }
    class temp {
        constructor() {
            sc.translate.setup(setup)
            this.blur = {}
            this.cache = {}
        }
        getInfo() {
            return {
                id: 'kmsBlur',
                name: translate('kmsBlur'),
                color1:'#668cff',
                color2:'#3d6dff',
                color3:'#7c9dff',
                blockIconURI:'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxMjMuMDE4NTciIGhlaWdodD0iNzcuODM1NDEiIHZpZXdCb3g9IjAsMCwxMjMuMDE4NTcsNzcuODM1NDEiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xODAuMjQ3NDcsLTEzNi41ODExNykiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMjE1LjkyMTY0LDE1NS44MjE0OWwtMjguNDI0MTYsMTguNzg4MTUiIHN0cm9rZT0iIzhjOWJmZiIgc3Ryb2tlLXdpZHRoPSIxNC41Ii8+PHBhdGggZD0iTTIxMS4zNzUzNywxOTguOTE1NDlsLTIzLjg3Nzg5LC0yNC4zMDU4NCIgc3Ryb2tlPSIjOGM5YmZmIiBzdHJva2Utd2lkdGg9IjE0LjUiLz48cGF0aCBkPSJNMjExLjM3NTM3LDE5OC45MTU0OWwtMjMuODc3ODksLTI0LjMwNTg0IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNC41Ii8+PHBhdGggZD0iTTIxNS45MjE2NCwxNTUuODIxNDlsLTI4LjQyNDE2LDE4Ljc4ODE1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNC41Ii8+PGc+PHBhdGggZD0iTTI1NC40NjkyMSwxNDMuODMxMTdsLTI1LjE0NjMxLDYzLjMzNTQxIiBzdHJva2U9IiM4YzliZmYiIHN0cm9rZS13aWR0aD0iMTQuNSIvPjxwYXRoIGQ9Ik0yNTQuNDY5MjEsMTQzLjgzMTE3bC0yNS4xNDYzMSw2My4zMzU0MSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjQuNSIvPjwvZz48cGF0aCBkPSJNMjY5LjUzMDM2LDE1Ny4yMDg5OWwyNi40ODU2OCwyMS40MzQ0NiIgc3Ryb2tlPSIjOGM5YmZmIiBzdHJva2Utd2lkdGg9IjE0LjUiLz48cGF0aCBkPSJNMjY5LjkxMTQ3LDIwMC41NDA0NWwyNi4xMDQ1OCwtMjEuODk3IiBzdHJva2U9IiM4YzliZmYiIHN0cm9rZS13aWR0aD0iMTQuNSIvPjxwYXRoIGQ9Ik0yNjkuOTExNDcsMjAwLjU0MDQ1bDI2LjEwNDU4LC0yMS44OTciIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0LjUiLz48cGF0aCBkPSJNMjY5LjUzMDM2LDE1Ny4yMDg5OWwyNi40ODU2OCwyMS40MzQ0NiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjQuNSIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjU5Ljc1MjUyNDk5OTk5OTk5OjQzLjQxODgzMDAwMDAwMDAxNC0tPg==',
                blocks: [
                    {
                        opcode: 'setBlur',
                        blockType: 'command',
                        text: translate('setBlur'),
                        arguments: {
                            blur: {
                                type: 'number',
                                defaultValue: 5
                            }
                        }
                    },
                    {
                        opcode: 'addBlur',
                        blockType: 'command',
                        text: translate('addBlur'),
                        arguments: {
                            blur: {
                                type: 'number',
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'getBlur',
                        blockType: 'reporter',
                        text: translate('getBlur'),
                    },
                    {
                        opcode:'setCacheForEach',
                        blockType: 'command',
                        text: translate('setCacheForEach'),
                        arguments: {
                            blurFrom: {
                                type: 'number',
                                defaultValue: 1
                            },
                            blurTo: {
                                type: 'number',
                                defaultValue: 5
                            },
                            step: {
                                type: 'number',
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode:'clearCache',
                        blockType: 'command',
                        text: translate('clearCache'),
                    },
                    {
                        opcode:'restoreBlur',
                        blockType: 'command',
                        text: translate('restoreBlur'),
                    }
                ],
            }
        }
        async setBlur(args,util){
            let {blur} = args
            if (blur<=0) return this.restoreBlur(args,util)
            let {drawableId,skinId} = this.getId(args,util)
            if (!this.blur[drawableId]){
                this.blur[drawableId] = {
                    blur:blur,
                    skinId:skinId,
                }
            }
            this.blur[drawableId].blur = blur
            if(!this.cache[skinId]) this.cache[skinId] = {}
            let newSkinId
            const costumeId = util.target.currentCostume
            if(this.cache[skinId][blur]){
                newSkinId = this.cache[skinId][blur]
                renderer.updateDrawableSkinId(drawableId,newSkinId)
            }else{
                const isSvg = renderer._allSkins[skinId]._svgImage
                const srcData = util.target.sprite.costumes[costumeId].asset.encodeDataURI()
                const rotationCenter = renderer._allSkins[skinId].rotationCenter
                if(isSvg){
                    renderer.updateDrawableSkinId(drawableId,this.setSVGBlur(isSvg,rotationCenter,skinId,blur))
                }else{
                    renderer.updateDrawableSkinId(drawableId,await this.setPNGBlur(srcData,rotationCenter,skinId,blur))
                }
            }
        }
        async addBlur(args,util){
            let blur = this.getBlur({},util)+args.blur
            blur = blur>0?blur:0
            await this.setBlur({blur},util)
        }
        getBlur(args,util){
            const blurObj = this.blur[util.target.drawableID]
            return blurObj?blurObj.blur:0
        }
        async setCacheForEach(args, util) {
            const items = [args.blurFrom, args.blurTo].sort()
            const [start, end] = items
            const step = Math.abs(args.step)
            
            let {drawableId, skinId} = this.getId(args, util)
            
            if (!this.blur[drawableId]) {
                this.blur[drawableId] = {
                    blur: 0,
                    skinId: skinId,
                }
            }
            
            if (!this.cache[skinId]) this.cache[skinId] = {}
            
            const costumeId = util.target.currentCostume
            const isSvg = renderer._allSkins[skinId]._svgImage
            const srcData = util.target.sprite.costumes[costumeId].asset.encodeDataURI()
            const rotationCenter = renderer._allSkins[skinId].rotationCenter

            const totalSteps = Math.ceil((end - start) / step)
            
            for (let n = 0; n <= totalSteps; n++) {
                const i = start + n * step
                const currentBlur = Math.min(parseFloat(i.toFixed(10)), end)
                if (!this.cache[skinId][currentBlur]) {
                    if (isSvg) {
                        this.setSVGBlur(isSvg, rotationCenter, skinId, currentBlur)
                    } else {
                        await this.setPNGBlur(srcData, rotationCenter, skinId, currentBlur)
                    }
                }
            }
            console.log(this.cache)
        }
        clearCache(){
            for(let drawableId in this.blur){
                const originalSkinId = this.blur[drawableId].skinId
                renderer.updateDrawableSkinId(drawableId, originalSkinId)
            }
            this.blur = {}
            for (let skinId in this.cache){
                for (let blurValue in this.cache[skinId]) {
                    const cachedSkinId = this.cache[skinId][blurValue];
                    if (cachedSkinId !== parseInt(skinId)) {
                        renderer.destroySkin(cachedSkinId);
                    }
                }
                this.cache[skinId] = {};
            }
        }
        restoreBlur(args,util){
            renderer.updateDrawableSkinId(util.target.drawableID,util.target.sprite.costumes[util.target.currentCostume].skinId)
            if(this.blur[util.target.drawableID]) this.blur[util.target.drawableID].blur = 0
        }

        async setPNGBlur(srcData,rotationCenter,skinId,blur){
            const img = new Image()
            img.src = srcData
            await img.decode()
            
            const margin = Math.ceil(blur *3)
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = img.width + margin *2
            tempCanvas.height = img.height + margin *2
            const ctx = tempCanvas.getContext('2d')

            ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
            ctx.filter = `blur(${blur}px)`
            ctx.drawImage(img, margin, margin, img.width, img.height)

            const output = new Image()
            output.src = tempCanvas.toDataURL()
            output.crossOrigin = "anonymous"
            await output.decode()

            return this.cache[skinId][blur] = renderer.createBitmapSkin(output,void 0,rotationCenter.map(item => item+margin/2))
        }
        setSVGBlur(isSvg,rotationCenter,skinId,blur){
            const svgSrc = isSvg.src
            const svgCode = decodeURIComponent(svgSrc.slice('data:image/svg+xml;utf8,'.length))

            const parser = new DOMParser()
            const doc = parser.parseFromString(svgCode, "image/svg+xml")
            const svg = doc.querySelector('svg')

            const originalWidth = parseFloat(svg.getAttribute('width'))
            const originalHeight = parseFloat(svg.getAttribute('height'))
            
            const defs = svg.querySelector('#blurDefs') ||
            svg.insertBefore(
                doc.createElementNS('http://www.w3.org/2000/svg', 'defs'),
                svg.firstChild
            )
            defs.id = 'blurDefs'
            const filter = defs.querySelector('#blurFilter') || 
                defs.appendChild(
                    doc.createElementNS('http://www.w3.org/2000/svg', 'filter')
                )
            filter.id = 'blurFilter'

            const filterMargin = Math.ceil(blur *3)
            filter.setAttribute('x', `-${filterMargin}%`)
            filter.setAttribute('y', `-${filterMargin}%`)
            filter.setAttribute('width', `${100 + filterMargin *2}%`)
            filter.setAttribute('height', `${100 + filterMargin *2}%`)
            filter.setAttribute('filterUnits', 'objectBoundingBox')

            const blurFilter = filter.querySelector('feGaussianBlur') || 
                filter.appendChild(
                    doc.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
                )
            blurFilter.setAttribute('stdDeviation', blur)
            blurFilter.setAttribute('edgeMode', 'duplicate')
            
            const svgMargin = Math.ceil(blur * 2)
            svg.setAttribute('width', originalWidth + svgMargin *2)
            svg.setAttribute('height', originalHeight + svgMargin *2)

            const viewBox = svg.viewBox.baseVal
            svg.setAttribute('viewBox',`${viewBox.x - svgMargin} ${viewBox.y - svgMargin} ${viewBox.width + svgMargin * 2} ${viewBox.height + svgMargin * 2}`)
            Array.from(svg.children)
                .filter(child => child !== defs)
                .forEach(child=>child.setAttribute('filter', 'url(#blurFilter)'))
            
            return this.cache[skinId][blur] = renderer.createSVGSkin(new XMLSerializer().serializeToString(svg),rotationCenter)
        }
        getId(args,util){
            let blurObj = this.blur[util.target.drawableID]
            let tempSkin =  {
                drawableId:util.target.drawableID,
                skinId:blurObj?blurObj.skinId:renderer._allDrawables[util.target.drawableID].skin.id,
            }
            return tempSkin
        }
    }
    sc.extensions.register(new temp())
})(Scratch)