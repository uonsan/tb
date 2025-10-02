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
      const index = parseInt(sourceValue, 10);
      const costume = util.target.sprite.costumes_[index];
      if (!costume) throw new Error('造型不存在: ' + sourceValue);
      return await costumeToImage(costume);
    } else {
      throw new Error('未知來源類型: ' + sourceType);
    }
  }

  class CBlur {
    constructor() {
      this.cache = {}; // key -> {canvas, w, h, r}
    }

    getInfo() {
      return {
        id: 'cblur',
        name: '裁切模糊 (GPU快取版)',
        color1: '#ffa74a',
        blocks: [
          {
            opcode: 'cropUrlCmd',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] x [X] y [Y] 長 [W] 寬 [H] 圓角 [R] 單位 [UNIT] 模糊 [BLUR] 倍率 [SCALE] 快取 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'yes' }
            }
          },
          {
            opcode: 'cropUrlXYXY',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] XY [X1] [Y1] 到 XY [X2] [Y2] 圓角 [R] 模糊 [BLUR] 倍率 [SCALE] 快取 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'yes' }
            }
          },
          {
            opcode: 'restore',
            blockType: Scratch.BlockType.COMMAND,
            text: '恢復為原本的造型'
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
              { text: '角色造型序號', value: 'sprite' }
            ]
          }
        }
      };
    }

    _makeKey(sourceType, sourceValue, args) {
      return JSON.stringify([sourceType, sourceValue, args.X, args.Y, args.W, args.H, args.X1, args.Y1, args.X2, args.Y2, args.R, args.UNIT, args.BLUR, args.SCALE]);
    }

    // 修正版 _generateSkin
    async _generateSkin(img, sx, sy, sw, sh, r, blur, scale) {
      const pad = blur * 2;
      const canvas = document.createElement('canvas');
      canvas.width = (sw + pad * 2) * scale;
      canvas.height = (sh + pad * 2) * scale;
      const ctx = canvas.getContext('2d');

      // 圓角裁切
      const w = sw * scale;
      const h = sh * scale;
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

      // 模糊 & 繪製
      if (blur > 0) ctx.filter = `blur(${blur * scale}px)`;
      ctx.drawImage(
        img,
        sx - pad, sy - pad, sw + pad * 2, sh + pad * 2,
        0, 0, (sw + pad * 2) * scale, (sh + pad * 2) * scale
      );

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
          let r = toNum(args.R), blur = toNum(args.BLUR), scale = Math.max(1, toNum(args.SCALE));

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

          cacheData = await this._generateSkin(img, x, y, w, h, r, blur, scale);
          if (useCache) this.cache[key] = cacheData;
        }

        const skinId = renderer.createBitmapSkin([cacheData.w, cacheData.h]);
        renderer.updateBitmapSkin(skinId, cacheData.canvas, false);
        renderer.updateDrawableSkinId(util.target.drawableID, skinId);
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
          const blur = Math.max(0, toNum(args.BLUR));
          const scale = Math.max(1, toNum(args.SCALE));

          cacheData = await this._generateSkin(img, sx, sy, sw, sh, r, blur, scale);
          if (useCache) this.cache[key] = cacheData;
        }

        const skinId = renderer.createBitmapSkin([cacheData.w, cacheData.h]);
        renderer.updateBitmapSkin(skinId, cacheData.canvas, false);
        renderer.updateDrawableSkinId(util.target.drawableID, skinId);
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
