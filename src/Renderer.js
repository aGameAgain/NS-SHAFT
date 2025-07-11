// Renderer Class
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ceilingSpikes = [];
        this.createCeilingSpikes();
    }

    createCeilingSpikes() {
        const spikeWidth = 20;
        const spikeHeight = 15;
        const numberOfSpikes = Math.floor(this.canvas.width / spikeWidth);

        this.ceilingSpikes = Array.from({ length: numberOfSpikes }, (_, i) => ({
            x: i * spikeWidth,
            width: spikeWidth,
            height: spikeHeight
        }));
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground(depth) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let d = Math.floor(depth / 100) * 100; d <= depth + this.canvas.height; d += 100) {
            const y = d - depth;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(0, y, this.canvas.width, 1);

            this.ctx.fillStyle = '#777';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${d}m`, 5, y - 5);
        }
    }

    drawCeilingSpikes() {
        this.ctx.fillStyle = '#F44336';
        
        this.ceilingSpikes.forEach(spike => {
            this.ctx.beginPath();
            this.ctx.moveTo(spike.x, 0);
            this.ctx.lineTo(spike.x + spike.width / 2, spike.height);
            this.ctx.lineTo(spike.x + spike.width, 0);
            this.ctx.fill();
        });
    }

    render(player, platformManager, depth) {
        this.clear();
        this.drawBackground(depth);
        this.drawCeilingSpikes();
        platformManager.draw(this.ctx, depth);
        player.draw(this.ctx, depth);
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.ceilingSpikes = [];
        this.createCeilingSpikes();
    }
}