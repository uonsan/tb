(function (Scratch) {
    'use strict';

    class ChangeXYSizeDivide {
        getInfo() {
            return {
                id: 'changeXYSizeDivide',
                name: '改變 X Y 尺寸（帶除數）',
                blocks: [
                    {
                        opcode: 'changeXYSizeDivide',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '改變 X [newX] Y [newY] 尺寸 [newSize] 除以 [divisor]',
                        arguments: {
                            newX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            newY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            newSize: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            },
                            divisor: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    }
                ]
            };
        }

        changeXYSizeDivide(args, util) {
            const target = util.target;
            if (!target || target.isStage) return;

            const divisor = Number(args.divisor) || 1;

            // 計算公式：(新值 - 舊值) / 除數
            const deltaX = (Number(args.newX) - target.x) / divisor;
            const deltaY = (Number(args.newY) - target.y) / divisor;
            const deltaSize = (Number(args.newSize) - target.size) / divisor;

            // 改變 X、Y、尺寸
            target.setXY(target.x + deltaX, target.y + deltaY);
            target.setSize(target.size + deltaSize);
        }
    }

    Scratch.extensions.register(new ChangeXYSizeDivide());
})(Scratch);
