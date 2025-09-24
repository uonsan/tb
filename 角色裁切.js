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

  function svgCreateImageWrapperDataURL(imgDataURL, width, height, clipRect, rx) {
    const rxAttr = (rx && rx > 0) ? `rx="${rx}" ry="${rx}"` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <clipPath id="cropClip"><rect x="${clipRect.x}" y="${clipRect.y}" width="${clipRect.w}" height="${clipRect.h}" ${rxAttr}/></clipPath>
      </defs>
      <image href="${imgDataURL}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" clip-path="url(#cropClip)" />
    </svg>`;
    return svg;
  }

  // Scratch (-240,180) → 圖片像素 (0,0)
  function scratchXYtoImageXY(xScratch, yScratch, imgW, imgH) {
    const ix = (xScratch + 240) * (imgW / 480);
    const iy = (180 - yScratch) * (imgH / 360);
    return { ix, iy };
  }

  async function loadSource(sourceType, sourceValue) {
    if (String(sourceType) === 'url') {
      return await loadImage(sourceValue);
    } else if (String(sourceType) === 'sprite') {
      const index = parseInt(sourceValue, 10);
      const target = vm.runtime.targets[index];
      if (!target) throw new Error('角色編號不存在: ' + sourceValue);
      const costume = target.sprite.costumes_[target.currentCostume];
      return await costumeToImage(costume);
    } else {
      throw new Error('未知來源類型: ' + sourceType);
    }
  }

  class CBlur {
    constructor() {
      this.cache = {}; // key -> skinId
    }

    getInfo() {
      return {
        id: 'cblur',
        name: '裁切模糊',
        color1: '#ffa74a',
        blocks: [
          {
            opcode: 'cropUrlCmd',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] x [X] y [Y] 長 [W] 寬 [H] 圓角 [R] 單位 [UNIT] 品質 [Q] 模糊 [BLUR] 預先生成 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'yes' }
            }
          },
          {
            opcode: 'cropUrlXYXY',
            blockType: Scratch.BlockType.COMMAND,
            text: '裁切 [SOURCE_TYPE] [SOURCE_VALUE] XY [X1] [Y1] 到 XY [X2] [Y2] 圓角 [R] 品質 [Q] 模糊 [BLUR] 預先生成 [CACHE]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              CACHE: { type: Scratch.ArgumentType.STRING, menu: 'cache_menu', defaultValue: 'yes' }
            }
          },
          {
            opcode: 'preloadUrl',
            blockType: Scratch.BlockType.COMMAND,
            text: '預生成 [SOURCE_TYPE] [SOURCE_VALUE] x [X] y [Y] 長 [W] 寬 [H] 圓角 [R] 單位 [UNIT] 品質 [Q] 模糊 [BLUR]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'preloadUrlXYXY',
            blockType: Scratch.BlockType.COMMAND,
            text: '預生成 [SOURCE_TYPE] [SOURCE_VALUE] XY [X1] [Y1] 到 XY [X2] [Y2] 圓角 [R] 品質 [Q] 模糊 [BLUR]',
            arguments: {
              SOURCE_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'source_menu', defaultValue: 'url' },
              SOURCE_VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: -100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
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
              { text: '角色編號', value: 'sprite' }
            ]
          }
        }
      };
    }

    _makeKey(sourceType, sourceValue, args) {
      return JSON.stringify([sourceType, sourceValue, args.X, args.Y, args.W, args.H, args.X1, args.Y1, args.X2, args.Y2, args.R, args.UNIT, args.Q, args.BLUR]);
    }

    async _generateSkin(img, sx, sy, sw, sh, r, blur) {
      const pad = blur * 2;
      const canvas = document.createElement('canvas');
      canvas.width = sw + pad * 2;
      canvas.height = sh + pad * 2;
      const ctx = canvas.getContext('2d');

      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(img, sx - pad, sy - pad, sw + pad * 2, sh + pad * 2, 0, 0, sw + pad * 2, sh + pad * 2);

      // 再裁切回原來大小
      const cropped = document.createElement('canvas');
      cropped.width = sw;
      cropped.height = sh;
      const cctx = cropped.getContext('2d');
      cctx.drawImage(canvas, pad, pad, sw, sh, 0, 0, sw, sh);

      const dataURL = cropped.toDataURL('image/png');
      const svg = svgCreateImageWrapperDataURL(dataURL, sw, sh, { x: 0, y: 0, w: sw, h: sh }, r);
      return renderer.createSVGSkin(svg, [sw / 2, sh / 2]);
    }

    async cropUrlCmd(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      const useCache = (String(args.CACHE) === 'yes');

      if (useCache && this.cache[key]) {
        renderer.updateDrawableSkinId(util.target.drawableID, this.cache[key]);
        runtime.requestRedraw();
        return;
      }

      try {
        const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE);
        let x = toNum(args.X), y = toNum(args.Y);
        let w = toNum(args.W), h = toNum(args.H);
        let r = toNum(args.R), blur = toNum(args.BLUR);

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

        const skinId = await this._generateSkin(img, x, y, w, h, r, blur);
        if (useCache) this.cache[key] = skinId;

        renderer.updateDrawableSkinId(util.target.drawableID, skinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('裁切失敗：', e);
      }
    }

    async cropUrlXYXY(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      const useCache = (String(args.CACHE) === 'yes');

      if (useCache && this.cache[key]) {
        renderer.updateDrawableSkinId(util.target.drawableID, this.cache[key]);
        runtime.requestRedraw();
        return;
      }

      try {
        const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE);
        const p1 = scratchXYtoImageXY(toNum(args.X1), toNum(args.Y1), img.width, img.height);
        const p2 = scratchXYtoImageXY(toNum(args.X2), toNum(args.Y2), img.width, img.height);

        const sx = Math.min(p1.ix, p2.ix);
        const sy = Math.min(p1.iy, p2.iy);
        const sw = Math.abs(p2.ix - p1.ix);
        const sh = Math.abs(p2.iy - p1.iy);

        const r = Math.max(0, toNum(args.R));
        const blur = Math.max(0, toNum(args.BLUR));

        const skinId = await this._generateSkin(img, sx, sy, sw, sh, r, blur);
        if (useCache) this.cache[key] = skinId;

        renderer.updateDrawableSkinId(util.target.drawableID, skinId);
        runtime.requestRedraw();
      } catch (e) {
        console.error('裁切XY→XY失敗：', e);
      }
    }

    async preloadUrl(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      if (this.cache[key]) return;

      try {
        const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE);
        let x = toNum(args.X), y = toNum(args.Y);
        let w = toNum(args.W), h = toNum(args.H);
        let r = toNum(args.R), blur = toNum(args.BLUR);

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

        const skinId = await this._generateSkin(img, x, y, w, h, r, blur);
        this.cache[key] = skinId;
      } catch (e) {
        console.error('預生成失敗：', e);
      }
    }

    async preloadUrlXYXY(args, util) {
      const key = this._makeKey(args.SOURCE_TYPE, args.SOURCE_VALUE, args);
      if (this.cache[key]) return;

      try {
        const img = await loadSource(args.SOURCE_TYPE, args.SOURCE_VALUE);
        const p1 = scratchXYtoImageXY(toNum(args.X1), toNum(args.Y1), img.width, img.height);
        const p2 = scratchXYtoImageXY(toNum(args.X2), toNum(args.Y2), img.width, img.height);

        const sx = Math.min(p1.ix, p2.ix);
        const sy = Math.min(p1.iy, p2.iy);
        const sw = Math.abs(p2.ix - p1.ix);
        const sh = Math.abs(p2.iy - p1.iy);

        const r = Math.max(0, toNum(args.R));
        const blur = Math.max(0, toNum(args.BLUR));

        const skinId = await this._generateSkin(img, sx, sy, sw, sh, r, blur);
        this.cache[key] = skinId;
      } catch (e) {
        console.error('預生成XY→XY失敗：', e);
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
