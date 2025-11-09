// 作者uonsanBiliBili
// 最新更新日期2025年11月8日


(function (Scratch) {
  'use strict';

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const renderer = runtime.renderer;

  // 函式
  function toNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  async function loadImage(url) {
    if (!CaiqieAutoWidth._imgCache[url]) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      CaiqieAutoWidth._imgCache[url] = new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('圖片載入失敗：' + url));
      });
      img.src = String(url);
    }
    return CaiqieAutoWidth._imgCache[url];
  }

  async function costumeToImage(costume) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('角色造型載入失敗'));
      img.src = costume.asset.encodeDataURI();
    });
  }

  // ===== 主類別 =====
  class CaiqieAutoWidth {
    constructor() {
      this.sharedCanvas = document.createElement('canvas');
      this.ctx = this.sharedCanvas.getContext('2d');
      this._lastRenderTime = 0;
    }

    static _imgCache = {};

    getInfo() {
      return {
        id: 'CutPro',
        name: '裁切',
        color1: '#ff9900',
        blocks: [
          {
            opcode: 'cropUrlCmd',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] 高 [H] 圓角 [R] 單位 [UNIT] 倍率 [SCALE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }
            }
          },
          {
            opcode: 'restore',
            blockType: Scratch.BlockType.COMMAND,
            text: '恢復造型'
          }
        ],
        menus: {
          units: {
            acceptReporters: true,
            items: [
              { text: '像素(px)', value: 'px' },
              { text: '百分比(%)', value: '%' },
              { text: 'Scratch 坐標', value: 'scratch' }
            ]
          },
          source_menu: {
            items: [
              { text: 'URL', value: 'url' },
              { text: '造型編號', value: 'sprite' }
            ]
          }
        }
      };
    }

    async loadSource(sourceType, sourceValue, util) {
      if (String(sourceType) === 'url') {
        return await loadImage(sourceValue);
      } else if (String(sourceType) === 'sprite') {
        const index = parseInt(sourceValue, 10) - 1;
        const costume = util.target.sprite.costumes_[index];
        if (!costume || index < 0) throw new Error('造型不存在: ' + sourceValue);
        return await costumeToImage(costume);
      } else {
        throw new Error('未知來源類型: ' + sourceType);
      }
    }

    async cropUrlCmd(args, util) {
      const now = performance.now();
      if (now - this._lastRenderTime < 30) return; // 節流限制，30FPS
      this._lastRenderTime = now;

      try {
        const img = await this.loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE, util);

        // 寬度自動取圖片原寬
        let w = img.width;
        let h = toNum(args.H);
        let r = toNum(args.R);
        let scale = Math.max(1, toNum(args.SCALE));

        if (args.UNIT === '%') {
          h = img.height * (h / 100);
          r = Math.min(w, h) * (r / 100);
        } else if (args.UNIT === 'scratch') {
          h = img.height * (h / 360);
        }

        // 裁切
        const x = 0;
        const y = 0;

        const MAX_SIZE = 4096;
        const safe = (n) => Math.max(1, Math.min(Math.round(n), MAX_SIZE));
        const finalW = safe(w * scale);
        const finalH = safe(h * scale);

        const ctx = this.ctx;
        const canvas = this.sharedCanvas;
        canvas.width = finalW;
        canvas.height = finalH;
        ctx.clearRect(0, 0, finalW, finalH);
        ctx.imageSmoothingEnabled = true;

        const rr = Math.min(r * scale, finalW / 2, finalH / 2);
        ctx.beginPath();
        if (rr > 0) {
          ctx.moveTo(rr, 0);
          ctx.lineTo(finalW - rr, 0);
          ctx.quadraticCurveTo(finalW, 0, finalW, rr);
          ctx.lineTo(finalW, finalH - rr);
          ctx.quadraticCurveTo(finalW, finalH, finalW - rr, finalH);
          ctx.lineTo(rr, finalH);
          ctx.quadraticCurveTo(0, finalH, 0, finalH - rr);
          ctx.lineTo(0, rr);
          ctx.quadraticCurveTo(0, 0, rr, 0);
        } else {
          ctx.rect(0, 0, finalW, finalH);
        }
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, x, y, w, h, 0, 0, finalW, finalH);

        if (!util.target._cutSkinId) {
          util.target._cutSkinId = renderer.createBitmapSkin([finalW, finalH]);
        }
        renderer.updateBitmapSkin(util.target._cutSkinId, canvas, false);
        renderer.updateDrawableSkinId(util.target.drawableID, util.target._cutSkinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('裁切失敗：', e);
      }
    }

    restore(args, util) {
      try {
        const costume = util.target.sprite.costumes_[util.target.currentCostume];
        renderer.updateDrawableSkinId(util.target.drawableID, costume.skinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('恢復失敗：', e);
      }
    }
  }

  Scratch.extensions.register(new CaiqieAutoWidth());
})(Scratch);
