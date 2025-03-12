// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const depthElement = document.getElementById('depth');
const livesElement = document.getElementById('lives');
const finalDepthElement = document.getElementById('finalDepth');
const gameOverElement = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const tryAgainButton = document.getElementById('tryAgainButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const downButton = document.getElementById('downButton');

// 设置canvas尺寸
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// 游戏常量
const GRAVITY = 0.25;
const JUMP_POWER = 8;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 15;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const PLATFORM_SPEED = 2;
const PLATFORM_GAP = 150; // 增加平台间距
const MAX_PLATFORMS = 5; // 减少最大平台数量
const SCREEN_SCROLL_SPEED = 0.5; // 屏幕匀速下滚的速度
const PLATFORM_TYPES = {
    NORMAL: 0,
    MOVING: 1,
    BREAKING: 2,
    SPIKE: 3,
    SPRING: 4  // 新增弹簧平台类型
};

// 游戏状态
let gameRunning = false;
let player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: 100,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    isOnPlatform: false,
    currentPlatform: null,
    color: '#00BFFF',
    onSpring: false  // 新增是否在弹簧平台上的状态
};

let platforms = [];
let depth = 0;
let lives = 100;  // 修改生命值为100
let keys = {};
let cameraPosY = 0;
let spawnDepth = 0;
let difficulty = 1;
let ceilingSpikes = []; // 存储屏幕顶部的刺

// 初始化游戏
function initGame() {
    // 重置游戏状态
    player = {
        x: canvas.width / 2 - PLAYER_WIDTH / 2,
        y: 100,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
        isOnPlatform: false,
        currentPlatform: null,
        color: '#00BFFF',
        onSpring: false
    };

    platforms = [];
    depth = 0;
    lives = 100;  // 修改生命值为100
    cameraPosY = 0;
    spawnDepth = 0;
    difficulty = 1;
    ceilingSpikes = []; // 初始化天花板刺

    // 创建天花板刺
    createCeilingSpikes();

    // 更新UI
    updateUI();

    // 创建初始平台
    createInitialPlatforms();
}

// 创建天花板刺
function createCeilingSpikes() {
    const spikeWidth = 20;
    const spikeHeight = 15;
    const numberOfSpikes = Math.floor(canvas.width / spikeWidth);

    for (let i = 0; i < numberOfSpikes; i++) {
        ceilingSpikes.push({
            x: i * spikeWidth,
            width: spikeWidth,
            height: spikeHeight
        });
    }
}

// 创建初始平台
function createInitialPlatforms() {
    // 第一个平台直接放在玩家下方
    platforms.push({
        x: canvas.width / 2 - PLATFORM_WIDTH / 2,
        y: player.y + player.height + 10,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PLATFORM_TYPES.NORMAL,
        color: '#8BC34A',
        breaking: false,
        direction: 1,
        speed: 1
    });

    // 创建其他平台
    for (let i = 1; i < MAX_PLATFORMS; i++) {
        createPlatform(player.y + player.height + 10 + i * PLATFORM_GAP);
    }
}

// 创建平台
function createPlatform(y) {
    if (!gameRunning) return;

    const x = Math.random() * (canvas.width - PLATFORM_WIDTH);
    let type = PLATFORM_TYPES.NORMAL;
    let color = '#8BC34A';

    // 根据深度增加难度和特殊平台概率
    if (depth > 500) {
        const rand = Math.random();
        if (rand < 0.15 * difficulty) { // 增加尖刺平台概率
            type = PLATFORM_TYPES.SPIKE;
            color = '#F44336';
        } else if (rand < 0.35 * difficulty) { // 增加破碎平台概率
            type = PLATFORM_TYPES.BREAKING;
            color = '#FFC107';
        } else if (rand < 0.55 * difficulty) { // 增加移动平台概率
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        } else if (rand < 0.7 * difficulty) { // 增加弹簧平台概率
            type = PLATFORM_TYPES.SPRING;
            color = '#2196F3';
        }
    } else if (depth > 200) {
        const rand = Math.random();
        if (rand < 0.1 * difficulty) {
            type = PLATFORM_TYPES.SPIKE;
            color = '#F44336';
        } else if (rand < 0.25 * difficulty) {
            type = PLATFORM_TYPES.BREAKING;
            color = '#FFC107';
        } else if (rand < 0.4 * difficulty) {
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        } else if (rand < 0.5 * difficulty) {
            type = PLATFORM_TYPES.SPRING;
            color = '#2196F3';
        }
    } else if (depth > 100) {
        const rand = Math.random();
        if (rand < 0.05 * difficulty) {
            type = PLATFORM_TYPES.SPIKE;
            color = '#F44336';
        } else if (rand < 0.2 * difficulty) {
            type = PLATFORM_TYPES.BREAKING;
            color = '#FFC107';
        } else if (rand < 0.35 * difficulty) {
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        } else if (rand < 0.45 * difficulty) {
            type = PLATFORM_TYPES.SPRING;
            color = '#2196F3';
        }
    }

    // 确保每个屏幕高度有足够的平台
    platforms.push({
        x,
        y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type,
        color,
        breaking: false,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: Math.random() * 2 + 1,
        breakTime: type === PLATFORM_TYPES.BREAKING ? 60 : 0  // 设置破碎时间为2秒（60帧）
    });
}

// 更新UI
function updateUI() {
    depthElement.textContent = Math.floor(depth);
    livesElement.textContent = lives;
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新游戏状态
    updateGame();

    // 绘制游戏元素
    drawGame();

    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function updateGame() {
    // 移动玩家
    movePlayer();

    // 应用重力
    applyGravity();

    // 更新平台
    updatePlatforms();

    // 检测碰撞
    checkCollisions();

    // 检测与天花板刺的碰撞
    checkCeilingSpikeCollision();

    // 移除屏幕外的平台并创建新平台
    managePlatforms();

    // 更新深度
    depth += SCREEN_SCROLL_SPEED;

    // 确保玩家不掉出屏幕底部
    if (player.y > depth + canvas.height) {
        endGame();
    }

    // 更新难度 - 增加难度系数
    difficulty = 1 + depth / 500; // 从1000改为500，使难度增长更快

    // 更新UI
    updateUI();

    // 检查游戏是否结束
    checkGameOver();
}

// 应用重力
function applyGravity() {
    if (!player.isOnPlatform) {
        player.velocityY += GRAVITY;
    }
    player.y += player.velocityY;
}

// 移动玩家
function movePlayer() {
    // 键盘控制
    if (keys.ArrowLeft || keys.a || keys.A) {
        player.velocityX = -5;
    } else if (keys.ArrowRight || keys.d || keys.D) {
        player.velocityX = 5;
    } else {
        player.velocityX = 0;
    }

    // 更新玩家位置
    player.x += player.velocityX;

    // 限制玩家在屏幕内
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    }

    // 如果玩家在平台上，检查是否走到了边缘
    if (player.isOnPlatform && player.currentPlatform) {
        // 如果玩家走出了平台左边缘或右边缘，就掉落
        if (player.x + player.width <= player.currentPlatform.x ||
            player.x >= player.currentPlatform.x + player.currentPlatform.width) {
            player.isOnPlatform = false;
            player.currentPlatform = null;
        }
    }

    // 如果玩家在平台上，跟随平台移动
    if (player.isOnPlatform && player.currentPlatform.type === PLATFORM_TYPES.MOVING) {
        player.x += player.currentPlatform.direction * player.currentPlatform.speed;

        // 确保玩家不会移出屏幕
        if (player.x < 0) {
            player.x = 0;
        } else if (player.x > canvas.width - player.width) {
            player.x = canvas.width - player.width;
        }
    }
}

// 检测与天花板刺的碰撞
function checkCeilingSpikeCollision() {
    const ceilingY = 0;  // 天花板位置固定在屏幕顶部

    // 如果玩家碰到天花板刺
    if (player.y <= 15) {
        loseLife(1);  // 减少1点生命值

        // 将玩家向下推
        player.velocityY = Math.max(player.velocityY, 2);
    }
}

// 更新平台
function updatePlatforms() {
    for (let platform of platforms) {
        // 移动平台
        if (platform.type === PLATFORM_TYPES.MOVING) {
            platform.x += platform.direction * platform.speed;

            // 碰到边界就改变方向
            if (platform.x <= 0 || platform.x + platform.width >= canvas.width) {
                platform.direction *= -1;
            }
        }

        // 如果是破碎平台并且玩家站在上面，开始破碎倒计时
        if (platform.type === PLATFORM_TYPES.BREAKING && player.isOnPlatform && player.currentPlatform === platform && !platform.breaking) {
            platform.breaking = true;
        }

        // 更新破碎平台倒计时
        if (platform.breaking) {
            platform.breakTime--;
            if (platform.breakTime <= 0) {
                // 平台消失
                const index = platforms.indexOf(platform);
                if (index !== -1) {
                    platforms.splice(index, 1);
                }
                // 如果玩家还在这个平台上，让玩家掉落
                if (player.currentPlatform === platform) {
                    player.isOnPlatform = false;
                    player.currentPlatform = null;
                }
            }
        }
    }
}

// 检测碰撞
function checkCollisions() {
    // 之前是否在平台上
    const wasOnPlatform = player.isOnPlatform;
    const wasOnSpring = player.onSpring;

    // 重置平台状态
    player.isOnPlatform = false;
    player.currentPlatform = null;
    player.onSpring = false;

    // 只有当玩家在下落时检测碰撞
    if (player.velocityY > 0) {
        for (let platform of platforms) {
            // 检查玩家是否站在平台上
            if (
                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height >= platform.y &&
                player.y + player.height <= platform.y + platform.height
            ) {
                if (platform.type === PLATFORM_TYPES.SPIKE) {
                    // 玩家碰到尖刺平台，减少生命
                    loseLife(1);

                    // 设置玩家位置，但是允许继续下落
                    player.velocityY = Math.max(player.velocityY, 2); // 给一个向下的冲力
                } else {
                    // 玩家站在平台上
                    player.isOnPlatform = true;
                    player.currentPlatform = platform;
                    player.y = platform.y - player.height;
                    player.velocityY = 0;

                    // 如果是弹簧平台
                    if (platform.type === PLATFORM_TYPES.SPRING) {
                        player.onSpring = true;
                        if (!wasOnSpring) {
                            // 第一次接触弹簧，给一个向上的弹跳（在新的坐标系统中是负数）
                            player.velocityY = -JUMP_POWER * 1.5;
                            player.isOnPlatform = false;
                            player.currentPlatform = null;
                        }
                    }
                }
            }
        }
    }
}

// 管理平台（移除屏幕外的并创建新的）
function managePlatforms() {
    // 移除屏幕顶部的平台
    platforms = platforms.filter(platform => platform.y > depth - 100);

    // 在屏幕底部创建新平台
    if (spawnDepth < depth + canvas.height) {
        // 增加平台间隔，减少屏幕内平台数量
        const newGap = Math.max(PLATFORM_GAP * (1 + Math.random() * 0.5), 120); // 随机增加间距
        createPlatform(spawnDepth + newGap);
        spawnDepth += newGap;
    }

    // 保持平台数量适中
    while (platforms.length < MAX_PLATFORMS) { // 减少平台数量
        const newGap = Math.max(PLATFORM_GAP * (1 + Math.random() * 0.5), 120); // 随机增加间距
        createPlatform(spawnDepth);
        spawnDepth += newGap;
    }

    // 检查是否有足够的平台，如果不够则生成更多
    ensureEnoughPlatforms();
}

// 确保屏幕中有足够的平台
function ensureEnoughPlatforms() {
    // 计算屏幕底部的Y坐标
    const bottomY = depth + canvas.height;

    // 检查屏幕底部附近是否有平台
    let hasBottomPlatform = false;
    for (let platform of platforms) {
        if (platform.y > bottomY - 150 && platform.y < bottomY) {
            hasBottomPlatform = true;
            break;
        }
    }

    // 如果屏幕底部没有平台，创建一个
    if (!hasBottomPlatform) {
        createPlatform(bottomY - 50);
    }

    // 检查屏幕内是否有任何平台
    let hasPlatformInView = false;
    for (let platform of platforms) {
        if (platform.y > depth && platform.y < bottomY) {
            hasPlatformInView = true;
            break;
        }
    }

    // 只有当屏幕中完全没有平台时才创建一个紧急平台
    if (!hasPlatformInView) {
        const middleY = depth + canvas.height / 2;
        createPlatform(middleY);
    }
}

// 减少生命
function loseLife(amount) {
    lives -= amount;
    if (lives > 0) {
        // 玩家受伤，短暂变红
        player.color = '#FF6B6B';

        // 短暂变红后恢复
        setTimeout(() => {
            player.color = '#00BFFF';
        }, 500);
    }
}

// 检查游戏是否结束
function checkGameOver() {
    // 如果玩家生命值耗尽或掉出屏幕底部
    if (lives <= 0 || player.y > depth + canvas.height) {
        endGame();
    }
}

// 结束游戏
function endGame() {
    gameRunning = false;
    finalDepthElement.textContent = Math.floor(depth);
    gameOverElement.style.display = 'block';
    restartButton.style.display = 'block';
    startButton.style.display = 'none';
}

// 绘制游戏
function drawGame() {
    // 不再需要根据玩家位置计算相机位置，相机直接跟随屏幕滚动

    // 绘制背景
    drawBackground();

    // 绘制天花板刺
    drawCeilingSpikes();

    // 绘制平台
    drawPlatforms();

    // 绘制玩家
    drawPlayer();
}

// 绘制背景
function drawBackground() {
    // 纯色背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 每100米绘制深度标记
    for (let d = Math.floor(depth / 100) * 100; d <= depth + canvas.height; d += 100) {
        const y = d - depth;  // 相对于当前深度的位置
        ctx.fillStyle = '#333';
        ctx.fillRect(0, y, canvas.width, 1);

        ctx.fillStyle = '#777';
        ctx.font = '12px Arial';
        ctx.fillText(`${d}m`, 5, y - 5);
    }
}

// 绘制天花板刺
function drawCeilingSpikes() {
    const y = 0; // 天花板位置固定在顶部

    ctx.fillStyle = '#F44336';
    for (let spike of ceilingSpikes) {
        ctx.beginPath();
        ctx.moveTo(spike.x, y);
        ctx.lineTo(spike.x + spike.width / 2, y + spike.height);
        ctx.lineTo(spike.x + spike.width, y);
        ctx.fill();
    }
}

// 绘制平台
function drawPlatforms() {
    for (let platform of platforms) {
        // 计算相对于当前深度的y坐标
        const y = platform.y - depth;

        // 如果平台在视野内才绘制
        if (y >= -platform.height && y <= canvas.height) {
            // 绘制平台
            ctx.fillStyle = platform.color;

            // 如果是破碎平台且正在破碎，闪烁效果
            if (platform.breaking && platform.breakTime % 5 === 0) {
                ctx.fillStyle = '#FF6B6B';
            }

            ctx.fillRect(platform.x, y, platform.width, platform.height);

            // 如果是尖刺平台，绘制尖刺
            if (platform.type === PLATFORM_TYPES.SPIKE) {
                ctx.fillStyle = '#F44336';
                for (let i = 0; i < platform.width - 10; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(platform.x + i + 5, y - 10); // 修改：尖刺顶点在平台上方10像素
                    ctx.lineTo(platform.x + i + 10, y); // 修改：尖刺右边点在平台表面
                    ctx.lineTo(platform.x + i, y); // 修改：尖刺左边点在平台表面
                    ctx.fill();
                }
            }

            // 如果是弹簧平台，绘制弹簧
            if (platform.type === PLATFORM_TYPES.SPRING) {
                ctx.fillStyle = '#2196F3';
                // 绘制弹簧的弹性部分
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(
                        platform.x + platform.width / 4,
                        y + platform.height + i * 3,
                        platform.width / 2,
                        2
                    );
                }
            }
        }
    }
}

// 绘制玩家
function drawPlayer() {
    // 计算相对于当前深度的y坐标
    const y = player.y - depth;

    // 绘制玩家
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, y, player.width, player.height);

    // 绘制眼睛和表情
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 5, y + 8, 5, 5);
    ctx.fillRect(player.x + player.width - 10, y + 8, 5, 5);

    if (player.velocityY > 0) {
        // 下落表情
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, y + 25, 5, 0, Math.PI, false);
        ctx.stroke();
    } else {
        // 上升表情
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, y + 20, 5, 0, Math.PI, true);
        ctx.stroke();
    }
}

// 开始游戏
function startGame() {
    if (gameRunning) return;

    gameRunning = true;
    gameOverElement.style.display = 'none';
    startButton.style.display = 'none';
    restartButton.style.display = 'block';

    initGame();
    gameLoop();
}

// 重启游戏
function restartGame() {
    if (gameRunning) return;

    gameRunning = true;
    gameOverElement.style.display = 'none';

    initGame();
    gameLoop();
}

// 事件监听
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
tryAgainButton.addEventListener('click', restartGame);

// 键盘控制
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // 保留向上跳的功能，但改变跳跃方向
    if (e.key === ' ' && player.isOnPlatform) {
        player.isOnPlatform = false;
        player.currentPlatform = null;
        player.velocityY = -JUMP_POWER; // 向上跳，改为负值
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 移动设备触摸控制
leftButton.addEventListener('touchstart', () => { keys.ArrowLeft = true; });
leftButton.addEventListener('touchend', () => { keys.ArrowLeft = false; });
rightButton.addEventListener('touchstart', () => { keys.ArrowRight = true; });
rightButton.addEventListener('touchend', () => { keys.ArrowRight = false; });

// 鼠标控制
leftButton.addEventListener('mousedown', () => { keys.ArrowLeft = true; });
leftButton.addEventListener('mouseup', () => { keys.ArrowLeft = false; });
leftButton.addEventListener('mouseleave', () => { keys.ArrowLeft = false; });
rightButton.addEventListener('mousedown', () => { keys.ArrowRight = true; });
rightButton.addEventListener('mouseup', () => { keys.ArrowRight = false; });
rightButton.addEventListener('mouseleave', () => { keys.ArrowRight = false; });

// 移除向下跳跃按钮的逻辑
if (downButton) {
    downButton.addEventListener('touchstart', () => {
        // 向下跳功能已移除
    });
    downButton.addEventListener('mousedown', () => {
        // 向下跳功能已移除
    });
}

// 窗口大小调整
window.addEventListener('resize', () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (!gameRunning) {
        initGame();
        drawGame();
    }
});

// 初始化游戏但不启动
initGame();
drawGame(); 