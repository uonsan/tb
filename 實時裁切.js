(function (Scratch) {
  'use strict';

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const renderer = runtime.renderer;

  function toNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('圖片載入失敗：' + url));
      img.src = String(url);
    });
  }

  function costumeToImage(costume) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('角色造型載入失敗'));
      img.src = costume.asset.encodeDataURI();
    });
  }

  // Scratch (-240,180) → 圖片像素 (0,0)
  function scratchXYtoImageXY(xScratch, yScratch, imgW, imgH) {
    const ix = (xScratch + 240) * (imgW / 480);
    const iy = (180 - yScratch) * (imgH / 360);
    return { ix, iy };
  }

  async function loadSource(sourceType, sourceValue, util) {
    if (String(sourceType) === 'url') {
      return await loadImage(sourceValue);
    } else if (String(sourceType) === 'sprite') {
      // 修正造型序號（人類輸入 1 對應陣列索引 0）
      const index = parseInt(sourceValue, 10) - 1;
      const costume = util.target.sprite.costumes_[index];
      if (!costume || index < 0) throw new Error('造型不存在: ' + sourceValue);
      return await costumeToImage(costume);
    } else {
      throw new Error('未知來源類型: ' + sourceType);
    }
  }

  class CBlur {
    constructor() {
      this.cache = {};
      this._skinId = null; // 重用 skin 避免 GPU 負擔
    }

    getInfo() {
      return {
        id: 'Cut',
        name: '裁切',
        color1: '#ffa74a',
        blocks: [
          {
            opcode: 'cropUrlCmd',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] x [X] y [Y] 長 [W] 寬 [H] 圓角 [R] 單位 [UNIT] 倍率 [SCALE] 快取 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'no' }
            }
          },
          {
            opcode: 'cropUrlXYXY',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] XY [X1] [Y1] 到 XY [X2] [Y2] 圓角 [R] 倍率 [SCALE] 快取 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'no' }
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
          cache_menu: {
            items: [
              { text: '使用快取', value: 'yes' },
              { text: '不使用快取', value: 'no' }
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

    _makeKey(sourceType, sourceValue, args) {
      return JSON.stringify([sourceType, sourceValue, args.X, args.Y, args.W, args.H, args.X1, args.Y1, args.X2, args.Y2, args.R, args.UNIT, args.SCALE]);
    }

    async _generateSkin(img, sx, sy, sw, sh, r, scale) {
      const MAX_SIZE = 4096;
      const safe = (n) => Math.max(1, Math.min(Math.round(n), MAX_SIZE));

      let w = safe(sw * scale);
      let h = safe(sh * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = true;

      // 防止過大畫布導致崩潰
      if (sw * scale > MAX_SIZE || sh * scale > MAX_SIZE) {
        const ratio = MAX_SIZE / Math.max(sw * scale, sh * scale);
        sw *= ratio;
        sh *= ratio;
        w = sw * scale;
        h = sh * scale;
      }

      // 圓角裁切
      const rr = Math.min(r * scale, w / 2, h / 2);
      ctx.beginPath();
      if (rr > 0) {
        ctx.moveTo(rr, 0);
        ctx.lineTo(w - rr, 0);
        ctx.quadraticCurveTo(w, 0, w, rr);
        ctx.lineTo(w, h - rr);
        ctx.quadraticCurveTo(w, h, w - rr, h);
        ctx.lineTo(rr, h);
        ctx.quadraticCurveTo(0, h, 0, h - rr);
        ctx.lineTo(0, rr);
        ctx.quadraticCurveTo(0, 0, rr, 0);
      } else {
        ctx.rect(0, 0, w, h);
      }
      ctx.closePath();
      ctx.clip();

      if (img && img.width && img.height) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      } else {
        console.warn('圖片無效');
      }

      return { canvas, w, h, r };
    }

    async cropUrlCmd(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      const useCache = (String(args.CACHE) === 'yes');

      try {
        let cacheData;
        if (useCache && this.cache[key]) {
          cacheData = this.cache[key];
        } else {
          const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE, util);
          let x = toNum(args.X), y = toNum(args.Y);
          let w = toNum(args.W), h = toNum(args.H);
          let r = toNum(args.R), scale = Math.max(1, toNum(args.SCALE));

          if (args.UNIT === '%') {
            x = img.width * (x / 100);
            y = img.height * (y / 100);
            w = img.width * (w / 100);
            h = img.height * (h / 100);
            r = Math.min(w, h) * (r / 100);
          } else if (args.UNIT === 'scratch') {
            x = img.width * (x / 480);
            y = img.height * (y / 360);
            w = img.width * (w / 480);
            h = img.height * (h / 360);
          }

          cacheData = await this._generateSkin(img, x, y, w, h, r, scale);
          if (useCache) this.cache[key] = cacheData;
        }

        if (!this._skinId) {
          this._skinId = renderer.createBitmapSkin([cacheData.w, cacheData.h]);
        }
        renderer.updateBitmapSkin(this._skinId, cacheData.canvas, false);
        renderer.updateDrawableSkinId(util.target.drawableID, this._skinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('裁切失敗：', e);
      }
    }

    async cropUrlXYXY(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      const useCache = (String(args.CACHE) === 'yes');

      try {
        let cacheData;
        if (useCache && this.cache[key]) {
          cacheData = this.cache[key];
        } else {
          const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE, util);
          const p1 = scratchXYtoImageXY(toNum(args.X1), toNum(args.Y1), img.width, img.height);
          const p2 = scratchXYtoImageXY(toNum(args.X2), toNum(args.Y2), img.width, img.height);

          const sx = Math.min(p1.ix, p2.ix);
          const sy = Math.min(p1.iy, p2.iy);
          const sw = Math.abs(p2.ix - p1.ix);
          const sh = Math.abs(p2.iy - p1.iy);

          const r = Math.max(0, toNum(args.R));
          const scale = Math.max(1, toNum(args.SCALE));

          cacheData = await this._generateSkin(img, sx, sy, sw, sh, r, scale);
          if (useCache) this.cache[key] = cacheData;
        }

        if (!this._skinId) {
          this._skinId = renderer.createBitmapSkin([cacheData.w, cacheData.h]);
        }
        renderer.updateBitmapSkin(this._skinId, cacheData.canvas, false);
        renderer.updateDrawableSkinId(util.target.drawableID, this._skinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('裁切XY→XY失敗：', e);
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

  Scratch.extensions.register(new CBlur());
})(Scratch);
